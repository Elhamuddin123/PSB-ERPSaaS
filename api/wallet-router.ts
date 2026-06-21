import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery, supervisoryQuery, agencyAdminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { wallets, walletTransactions, notifications, chartOfAccounts } from "@db/schema";
import { eq, desc, sql, and, ne } from "drizzle-orm";
import { auditLog } from "./lib/audit";
import {
  ensureWalletCoaAccount,
  getAccountByCode,
  postWalletCredit,
  postWalletDebit,
  postWalletTransfer,
  CASH_ACCOUNT_CODE,
} from "./lib/wallet-coa";

export const walletRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    console.log("[Wallet query] list tenantId:", ctx.user?.tenantId);
    return db.query.wallets.findMany({
      where: and(
        eq(wallets.tenantId, ctx.user!.tenantId as number),
        ne(wallets.status, "closed"),
      ),
      orderBy: [desc(wallets.createdAt)],
    });
  }),

  get: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      console.log("[Wallet query] get input:", input, "tenantId:", ctx.user?.tenantId);
      return db.query.wallets.findFirst({
        where: and(
          eq(wallets.id, input.id),
          eq(wallets.tenantId, ctx.user!.tenantId as number),
        ),
      });
    }),

  allTransactions: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    console.log("[Wallet query] allTransactions tenantId:", ctx.user?.tenantId);
    return db.query.walletTransactions.findMany({
  where: eq(
    walletTransactions.tenantId,
    ctx.user!.tenantId as number,
  ),

  orderBy: [
    desc(walletTransactions.createdAt),
  ],

  limit: 100,
});
  }),

  transfer: supervisoryQuery
    .input(
      z.object({
        fromWalletId: z.number(),
        toWalletId: z.number(),
        amount: z.string().min(1),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const amount = Number(input.amount);
      console.log("[Wallet transfer] input:", input, "tenantId:", ctx.user?.tenantId);

      if (input.fromWalletId === input.toWalletId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Source and destination wallets must be different.",
        });
      }

      if (isNaN(amount) || amount <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Transfer amount must be a positive number.",
        });
      }

      const description = input.description?.trim() || "Wallet transfer";

      await db.transaction(async (tx) => {
        const fromWallet = await tx.query.wallets.findFirst({
          where: and(eq(wallets.id, input.fromWalletId), eq(wallets.tenantId, ctx.user!.tenantId as number)),
        });
        const toWallet = await tx.query.wallets.findFirst({
          where: and(eq(wallets.id, input.toWalletId), eq(wallets.tenantId, ctx.user!.tenantId as number)),
        });

        if (!fromWallet) throw new TRPCError({ code: "NOT_FOUND", message: "Source wallet not found." });
        if (!toWallet) throw new TRPCError({ code: "NOT_FOUND", message: "Destination wallet not found." });
        if (fromWallet.status !== "active") throw new TRPCError({ code: "FORBIDDEN", message: "Source wallet is not active." });
        if (toWallet.status !== "active") throw new TRPCError({ code: "FORBIDDEN", message: "Destination wallet is not active." });

        const reservedBalance = Number(fromWallet.reservedBalance ?? 0);
        const availableBalance = Number(fromWallet.balance) - reservedBalance;
        if (availableBalance < amount) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: reservedBalance > 0
              ? `Insufficient available balance. Reserved: $${reservedBalance.toLocaleString()}`
              : "Insufficient wallet balance.",
          });
        }

        // Atomic debit with WHERE guard against negative balance
        const debitResult = await tx
          .update(wallets)
          .set({ balance: sql`${wallets.balance} - ${amount.toFixed(2)}` })
          .where(and(eq(wallets.id, input.fromWalletId), sql`${wallets.balance} >= ${amount.toFixed(2)}`));
        if (debitResult[0].affectedRows === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient wallet balance." });
        }

        // Atomic credit
        await tx
          .update(wallets)
          .set({ balance: sql`${wallets.balance} + ${amount.toFixed(2)}` })
          .where(eq(wallets.id, input.toWalletId));

        // Read back actual balances for transaction log
        const updatedFrom = await tx.query.wallets.findFirst({
          where: eq(wallets.id, input.fromWalletId),
        });
        const updatedTo = await tx.query.wallets.findFirst({
          where: eq(wallets.id, input.toWalletId),
        });

        await tx.insert(walletTransactions).values([
          {
            walletId: input.fromWalletId,
            tenantId: ctx.user!.tenantId as number,
            type: "debit",
            amount: amount.toFixed(2),
            balanceAfter: updatedFrom!.balance,
            description: `${description} (outgoing)`,
            createdBy: ctx.user!.id,
          },
          {
            walletId: input.toWalletId,
            tenantId: ctx.user!.tenantId as number,
            type: "credit",
            amount: amount.toFixed(2),
            balanceAfter: updatedTo!.balance,
            description: `${description} (incoming)`,
            createdBy: ctx.user!.id,
          },
        ]);

        await postWalletTransfer(tx, fromWallet, toWallet, amount, description);
      });

      await auditLog({
        ctx,
        action: "transfer",
        entityType: "wallet",
        entityId: input.fromWalletId,
        newValues: { fromWalletId: input.fromWalletId, toWalletId: input.toWalletId, amount: input.amount },
      });

      // Notify on transfer
      try {
        await getDb().insert(notifications).values({
          tenantId: ctx.user!.tenantId as number,
          userId: ctx.user!.id,
          title: "Wallet Transfer",
          message: `$${Number(input.amount).toLocaleString()} transferred between wallets.`,
          type: "info",
          category: "wallet",
          referenceType: "wallet",
          referenceId: input.fromWalletId,
        });
      } catch { /* non-critical */ }

      return {
        success: true,
      };
    }),

create: supervisoryQuery
  .input(
    z.object({
      name: z.string().min(1),

      currency: z.string().default("USD"),

      initialBalance: z.string().refine((value) => !value || (!isNaN(Number(value)) && Number(value) >= 0), { message: "Initial balance must be a valid non-negative number" }).optional(),

      userId: z.number().optional(),

      customerId: z.number().optional(),
    }),
  )

  .mutation(async ({ input, ctx }) => {
    const db = getDb();

    const initialBalance = Number(
      input.initialBalance || "0",
    );
    console.log("[Wallet create] input:", input, "tenantId:", ctx.user?.tenantId);

    const tenantId = ctx.user!.tenantId as number;
    if (tenantId == null) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Tenant context missing" });
    }

    const result = await db
      .insert(wallets)
      .values({
        tenantId,
        name: input.name,
        currency: input.currency,
        userId: input.userId ?? null,
        customerId: input.customerId,
        balance: initialBalance.toFixed(2),
        reservedBalance: "0.00",
        creditLimit: "0.00",
        dueBalance: "0.00",
        status: "active",
      });

    const walletId = Number(result[0].insertId);

    const wallet = await db.query.wallets.findFirst({ where: eq(wallets.id, walletId) });
    if (wallet) {
      await ensureWalletCoaAccount(db, tenantId, wallet);
    }

    if (initialBalance > 0 && wallet) {
      await db.insert(walletTransactions).values({
        walletId,
        tenantId,
        type: "credit",
        amount: initialBalance.toFixed(2),
        balanceAfter: initialBalance.toFixed(2),
        description: "Initial wallet funding",
        createdBy: ctx.user!.id,
      });

      const cashAccount = await getAccountByCode(db, tenantId, CASH_ACCOUNT_CODE);
      if (cashAccount) {
        await postWalletCredit(
          db,
          wallet,
          initialBalance,
          cashAccount.id,
          "Funding from cash on hand",
          "wallet_funding",
          walletId,
          `Initial funding: ${wallet.name}`,
        );
      }
    }

    return { id: walletId };
  }),

  update: agencyAdminQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        currency: z.string().length(3).optional(),
        userId: z.number().nullable().optional(),
        status: z.enum(["active", "frozen", "closed"]).optional(),
        balance: z.string().optional(),
        creditLimit: z.string().optional(),
        dueBalance: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;
      const { id, balance, creditLimit, dueBalance, ...fields } = input;

      const wallet = await db.query.wallets.findFirst({
        where: and(eq(wallets.id, id), eq(wallets.tenantId, tenantId)),
      });
      if (!wallet) throw new TRPCError({ code: "NOT_FOUND", message: "Wallet not found" });
      if (wallet.status === "closed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot edit a closed wallet" });
      }

      const updateData: Record<string, unknown> = {};

      if (fields.name !== undefined) updateData.name = fields.name.trim();
      if (fields.userId !== undefined) updateData.userId = fields.userId;

      if (fields.currency !== undefined && fields.currency !== wallet.currency) {
        const txCount = await db.select({ count: sql<number>`count(*)` })
          .from(walletTransactions)
          .where(and(eq(walletTransactions.walletId, id), eq(walletTransactions.tenantId, tenantId)));
        if ((txCount[0]?.count ?? 0) > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Currency cannot be changed after transactions have been recorded",
          });
        }
        updateData.currency = fields.currency;
      }

      if (fields.status !== undefined) {
        if (fields.status === "closed") {
          if (Number(wallet.balance) !== 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Wallet balance must be $0 before closing. Current balance: $${Number(wallet.balance).toLocaleString()}`,
            });
          }
          if (Number(wallet.reservedBalance) !== 0) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Unlock reserved funds before closing the wallet" });
          }
        }
        updateData.status = fields.status;
      }

      if (creditLimit !== undefined) {
        const limit = Number(creditLimit);
        if (isNaN(limit) || limit < 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Credit limit must be zero or positive" });
        }
        updateData.creditLimit = limit.toFixed(2);
      }

      if (dueBalance !== undefined) {
        const due = Number(dueBalance);
        if (isNaN(due) || due < 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Due balance must be zero or positive" });
        }
        updateData.dueBalance = due.toFixed(2);
      }

      const balanceAdjustment = balance !== undefined ? Number(balance) - Number(wallet.balance) : 0;
      if (balance !== undefined) {
        const newBalance = Number(balance);
        if (isNaN(newBalance) || newBalance < 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Balance must be zero or positive" });
        }
        if (newBalance < Number(wallet.reservedBalance ?? 0)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Balance cannot be less than reserved funds" });
        }
        updateData.balance = newBalance.toFixed(2);
      }

      if (Object.keys(updateData).length === 0 && Math.abs(balanceAdjustment) < 0.01) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No fields to update" });
      }

      await db.transaction(async (tx) => {
        if (Object.keys(updateData).length > 0) {
          await tx.update(wallets).set(updateData).where(eq(wallets.id, id));
        }

        if (Math.abs(balanceAdjustment) >= 0.01) {
          const equityAccount = await getAccountByCode(tx, tenantId, "3000");
          if (!equityAccount) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Owner equity account missing for balance adjustment" });
          }

          const updatedWallet = await tx.query.wallets.findFirst({ where: eq(wallets.id, id) });
          if (!updatedWallet) throw new TRPCError({ code: "NOT_FOUND", message: "Wallet not found" });

          const absAdj = Math.abs(balanceAdjustment);
          const label = `Wallet balance adjustment: ${wallet.name}`;
          if (balanceAdjustment > 0) {
            await postWalletCredit(
              tx,
              updatedWallet,
              absAdj,
              equityAccount.id,
              "Balance adjustment (equity)",
              "wallet_adjustment",
              id,
              label,
            );
            await tx.insert(walletTransactions).values({
              walletId: id,
              tenantId,
              type: "credit",
              amount: absAdj.toFixed(2),
              balanceAfter: updatedWallet.balance,
              description: label,
              referenceType: "wallet_adjustment",
              referenceId: id,
              createdBy: ctx.user!.id,
            });
          } else {
            await postWalletDebit(
              tx,
              updatedWallet,
              absAdj,
              equityAccount.id,
              "Balance adjustment (equity)",
              "wallet_adjustment",
              id,
              label,
            );
            await tx.insert(walletTransactions).values({
              walletId: id,
              tenantId,
              type: "debit",
              amount: absAdj.toFixed(2),
              balanceAfter: updatedWallet.balance,
              description: label,
              referenceType: "wallet_adjustment",
              referenceId: id,
              createdBy: ctx.user!.id,
            });
          }
        }
      });

      if (fields.name !== undefined) {
        const account = await ensureWalletCoaAccount(db, tenantId, { ...wallet, name: fields.name });
        if (account) {
          await db.update(chartOfAccounts)
            .set({ name: `Wallet: ${fields.name}` })
            .where(eq(chartOfAccounts.id, account.id));
        }
      }

      if (fields.currency !== undefined && fields.currency !== wallet.currency) {
        const account = await ensureWalletCoaAccount(db, tenantId, wallet);
        if (account) {
          await db.update(chartOfAccounts)
            .set({ currency: fields.currency })
            .where(eq(chartOfAccounts.id, account.id));
        }
      }

      await auditLog({
        ctx,
        action: "update",
        entityType: "wallet",
        entityId: id,
        oldValues: {
          name: wallet.name,
          currency: wallet.currency,
          status: wallet.status,
          userId: wallet.userId,
          balance: wallet.balance,
          creditLimit: wallet.creditLimit,
          dueBalance: wallet.dueBalance,
        },
        newValues: { ...updateData, balanceAdjustment: balanceAdjustment || undefined },
      });

      return { success: true };
    }),

  lockFunds: supervisoryQuery
    .input(z.object({
      walletId: z.number(),
      amount: z.string().min(1),
      description: z.string().optional(),
      referenceType: z.string().optional(),
      referenceId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;
      const amount = Number(input.amount);

      if (isNaN(amount) || amount <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Amount must be positive" });
      }

      await db.transaction(async (tx) => {
        const wallet = await tx.query.wallets.findFirst({
          where: and(eq(wallets.id, input.walletId), eq(wallets.tenantId, tenantId)),
        });
        if (!wallet) throw new TRPCError({ code: "NOT_FOUND", message: "Wallet not found" });
        if (wallet.status !== "active") throw new TRPCError({ code: "FORBIDDEN", message: "Wallet is not active" });

        const balance = Number(wallet.balance);
        const reserved = Number(wallet.reservedBalance ?? 0);
        const available = balance - reserved;

        if (available < amount) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Insufficient available balance. Available: $${available.toLocaleString()}, Requested: $${amount.toLocaleString()}`,
          });
        }

        // Atomic increment of reserved balance
        await tx.update(wallets)
          .set({ reservedBalance: sql`${wallets.reservedBalance} + ${amount.toFixed(2)}` })
          .where(eq(wallets.id, wallet.id));

        const updated = await tx.query.wallets.findFirst({
          where: eq(wallets.id, wallet.id),
        });

        await tx.insert(walletTransactions).values({
          walletId: wallet.id,
          tenantId,
          type: "lock",
          amount: amount.toFixed(2),
          balanceAfter: updated!.balance,
          description: input.description || "Funds locked",
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          createdBy: ctx.user!.id,
        });

        await auditLog({ ctx, action: "lock", entityType: "wallet", entityId: wallet.id, newValues: { amount: input.amount, description: input.description } });
        return { success: true, reservedBalance: updated!.reservedBalance };
      });
    }),

  unlockFunds: supervisoryQuery
    .input(z.object({
      walletId: z.number(),
      amount: z.string().min(1),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;
      const amount = Number(input.amount);

      if (isNaN(amount) || amount <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Amount must be positive" });
      }

      await db.transaction(async (tx) => {
        const wallet = await tx.query.wallets.findFirst({
          where: and(eq(wallets.id, input.walletId), eq(wallets.tenantId, tenantId)),
        });
        if (!wallet) throw new TRPCError({ code: "NOT_FOUND", message: "Wallet not found" });

        const reserved = Number(wallet.reservedBalance ?? 0);
        if (reserved < amount) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot unlock more than reserved amount. Reserved: $${reserved.toLocaleString()}` });
        }

        // Atomic decrement with guard
        const result = await tx.update(wallets)
          .set({ reservedBalance: sql`${wallets.reservedBalance} - ${amount.toFixed(2)}` })
          .where(and(eq(wallets.id, wallet.id), sql`${wallets.reservedBalance} >= ${amount.toFixed(2)}`));
        if (result[0].affectedRows === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot unlock more than reserved amount." });
        }

        const updated = await tx.query.wallets.findFirst({
          where: eq(wallets.id, wallet.id),
        });

        await tx.insert(walletTransactions).values({
          walletId: wallet.id,
          tenantId,
          type: "unlock",
          amount: amount.toFixed(2),
          balanceAfter: updated!.balance,
          description: input.description || "Funds unlocked",
          createdBy: ctx.user!.id,
        });

        await auditLog({ ctx, action: "unlock", entityType: "wallet", entityId: wallet.id, newValues: { amount: input.amount, description: input.description } });
        return { success: true, reservedBalance: updated!.reservedBalance };
      });
    }),

  statement: authedQuery
    .input(z.object({ walletId: z.number(), page: z.number().default(1), limit: z.number().default(20) }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;

      const wallet = await db.query.wallets.findFirst({
        where: and(eq(wallets.id, input.walletId), eq(wallets.tenantId, tenantId)),
      });
      if (!wallet) throw new TRPCError({ code: "NOT_FOUND", message: "Wallet not found" });

      const items = await db.select().from(walletTransactions)
        .where(and(eq(walletTransactions.walletId, input.walletId), eq(walletTransactions.tenantId, tenantId)))
        .orderBy(desc(walletTransactions.createdAt))
        .limit(input.limit)
        .offset((input.page - 1) * input.limit);

      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(walletTransactions)
        .where(and(eq(walletTransactions.walletId, input.walletId), eq(walletTransactions.tenantId, tenantId)));

      return { wallet, items, total: countResult[0]?.count ?? 0 };
    }),

  reconcile: authedQuery
    .input(z.object({ walletId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;

      const wallet = await db.query.wallets.findFirst({
        where: and(eq(wallets.id, input.walletId), eq(wallets.tenantId, tenantId)),
      });
      if (!wallet) throw new TRPCError({ code: "NOT_FOUND", message: "Wallet not found" });

      const txSum = await db.select({
        credits: sql<number>`COALESCE(SUM(CASE WHEN type IN ('credit','refund','unlock') THEN amount ELSE 0 END), 0)`,
        debits: sql<number>`COALESCE(SUM(CASE WHEN type IN ('debit','lock','fee','commission') THEN amount ELSE 0 END), 0)`,
      })
        .from(walletTransactions)
        .where(and(eq(walletTransactions.walletId, input.walletId), eq(walletTransactions.tenantId, tenantId)));

      const expectedBalance = Number(txSum[0]?.credits ?? 0) - Number(txSum[0]?.debits ?? 0);
      const actualBalance = Number(wallet.balance);
      const discrepancy = actualBalance - expectedBalance;

      let coaBalance: number | null = null;
      let coaDiscrepancy: number | null = null;
      const walletAccount = await ensureWalletCoaAccount(db, tenantId, wallet);
      if (walletAccount) {
        coaBalance = Number(walletAccount.currentBalance);
        coaDiscrepancy = actualBalance - coaBalance;
      }

      return {
        walletId: wallet.id,
        walletName: wallet.name,
        expectedBalance,
        actualBalance,
        discrepancy,
        isBalanced: Math.abs(discrepancy) < 0.01,
        coaBalance,
        coaDiscrepancy,
        isCoaBalanced: coaDiscrepancy === null || Math.abs(coaDiscrepancy) < 0.01,
      };
    }),

  delete: supervisoryQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;

      const wallet = await db.query.wallets.findFirst({
        where: and(eq(wallets.id, input.id), eq(wallets.tenantId, tenantId)),
      });
      if (!wallet) throw new TRPCError({ code: "NOT_FOUND", message: "Wallet not found" });
      if (wallet.status === "closed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Wallet is already closed" });
      }
      if (Number(wallet.balance) !== 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Wallet balance must be $0 before deletion. Current balance: $${Number(wallet.balance).toLocaleString()}`,
        });
      }
      if (Number(wallet.reservedBalance) !== 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Wallet has reserved funds. Unlock funds before deletion.",
        });
      }

      await db.update(wallets).set({ status: "closed" }).where(eq(wallets.id, input.id));

      await auditLog({
        ctx,
        action: "delete",
        entityType: "wallet",
        entityId: input.id,
        oldValues: { name: wallet.name, balance: wallet.balance },
      });

      return { success: true };
    }),
});