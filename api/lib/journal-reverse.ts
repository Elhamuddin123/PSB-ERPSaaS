import { and, eq } from "drizzle-orm";
import { journalEntries, journalEntryLines } from "@db/schema";
import type { DbOrTx } from "../queries/connection";
import { postLedgerLines } from "./ledger-posting";

/**
 * Creates reversing journal entries for all posted journals matching referenceType/referenceId.
 * Marks originals as "reversed". Returns count of reversed journals.
 */
export async function reversePostedJournals(
  db: DbOrTx,
  tenantId: number,
  referenceType: string,
  referenceId: number,
  labelPrefix = "Reversal",
): Promise<number> {
  const originals = await db.select().from(journalEntries).where(
    and(
      eq(journalEntries.tenantId, tenantId),
      eq(journalEntries.referenceType, referenceType),
      eq(journalEntries.referenceId, referenceId),
      eq(journalEntries.status, "posted"),
    ),
  );

  let reversed = 0;
  for (const original of originals) {
    const originalLines = await db.select().from(journalEntryLines).where(
      eq(journalEntryLines.journalEntryId, original.id),
    );

    const reversalLines = originalLines.map((line) => ({
      accountId: line.accountId,
      description: `${labelPrefix}: ${line.description || ""}`,
      debit: line.credit,
      credit: line.debit,
    }));

    if (reversalLines.length === 0) continue;

    const totalDebit = reversalLines.reduce((s, l) => s + Number(l.debit), 0);

    const reversalResult = await db.insert(journalEntries).values({
      tenantId,
      entryNumber: `JE-REV-${Date.now()}-${reversed}`,
      date: new Date(),
      description: `${labelPrefix}: ${original.description}`,
      referenceType,
      referenceId,
      status: "posted",
      totalDebit: totalDebit.toFixed(2),
      totalCredit: totalDebit.toFixed(2),
    });
    const reversalId = Number(reversalResult[0].insertId ?? 0);

    if (reversalId > 0) {
      await db.insert(journalEntryLines).values(
        reversalLines.map((line) => ({ journalEntryId: reversalId, ...line })),
      );
      await postLedgerLines(db, {
        tenantId,
        journalEntryId: reversalId,
        date: new Date(),
        referenceType,
        referenceId,
        lines: reversalLines,
      });
    }

    await db.update(journalEntries).set({ status: "reversed" }).where(eq(journalEntries.id, original.id));
    reversed++;
  }

  return reversed;
}
