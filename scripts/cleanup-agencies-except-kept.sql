-- =============================================================================
-- PSB ERP SaaS — Agency (tenant) cleanup
-- =============================================================================
-- PURPOSE: Remove all tenants EXCEPT:
--   • Pouyan Shahr Balkh
--   • Pioneer Travel Agency
--
-- WARNING: IRREVERSIBLE. Take a full database backup before Phase 1.
-- Do NOT run Phase 1 until Phase 0 preview output looks correct.
--
-- Deletion order for tenant-scoped data matches api/lib/reset-tenant-data.ts,
-- followed by subscriptions, roles, users, and tenants for removed agencies.
-- MySQL FK constraints use ON DELETE NO ACTION — order matters.
-- =============================================================================

-- Kept tenant names (TRIM applied for matching)
-- 'Pouyan Shahr Balkh', 'Pioneer Travel Agency'

-- =============================================================================
-- PHASE 0 — PREVIEW ONLY (read-only; safe to run)
-- =============================================================================

-- 0.1 All tenants
SELECT id, TRIM(name) AS name_trimmed, slug, status, plan, created_at
FROM tenants
ORDER BY id;

-- 0.2 Tenants to KEEP
SELECT id, TRIM(name) AS name_trimmed, slug, status
FROM tenants
WHERE TRIM(name) IN ('Pouyan Shahr Balkh', 'Pioneer Travel Agency')
ORDER BY id;

-- 0.3 Tenants that WILL BE DELETED
SELECT id, TRIM(name) AS name_trimmed, slug, status, created_at
FROM tenants
WHERE TRIM(name) NOT IN ('Pouyan Shahr Balkh', 'Pioneer Travel Agency')
ORDER BY id;

-- 0.4 Count of tenants to delete
SELECT COUNT(*) AS tenants_to_delete
FROM tenants
WHERE TRIM(name) NOT IN ('Pouyan Shahr Balkh', 'Pioneer Travel Agency');

-- 0.5 Users on tenants slated for deletion
SELECT u.id, u.tenant_id, TRIM(t.name) AS tenant_name, u.email, u.role, u.status
FROM users u
INNER JOIN tenants t ON t.id = u.tenant_id
WHERE TRIM(t.name) NOT IN ('Pouyan Shahr Balkh', 'Pioneer Travel Agency')
ORDER BY u.tenant_id, u.id;

-- 0.6 Subscriptions on tenants slated for deletion
SELECT s.id, s.tenant_id, TRIM(t.name) AS tenant_name, s.plan, s.status
FROM subscriptions s
INNER JOIN tenants t ON t.id = s.tenant_id
WHERE TRIM(t.name) NOT IN ('Pouyan Shahr Balkh', 'Pioneer Travel Agency')
ORDER BY s.tenant_id;

-- 0.7 Row counts by table for tenants to remove (operational snapshot)
SELECT 'bank_statement_lines' AS tbl, COUNT(*) AS cnt
FROM bank_statement_lines bsl
WHERE bsl.tenant_id IN (
  SELECT id FROM tenants WHERE TRIM(name) NOT IN ('Pouyan Shahr Balkh', 'Pioneer Travel Agency')
)
UNION ALL SELECT 'bank_statements', COUNT(*) FROM bank_statements WHERE tenant_id IN (
  SELECT id FROM tenants WHERE TRIM(name) NOT IN ('Pouyan Shahr Balkh', 'Pioneer Travel Agency')
)
UNION ALL SELECT 'supplier_payments', COUNT(*) FROM supplier_payments WHERE tenant_id IN (
  SELECT id FROM tenants WHERE TRIM(name) NOT IN ('Pouyan Shahr Balkh', 'Pioneer Travel Agency')
)
UNION ALL SELECT 'bill_items', COUNT(*) FROM bill_items WHERE tenant_id IN (
  SELECT id FROM tenants WHERE TRIM(name) NOT IN ('Pouyan Shahr Balkh', 'Pioneer Travel Agency')
)
UNION ALL SELECT 'bills', COUNT(*) FROM bills WHERE tenant_id IN (
  SELECT id FROM tenants WHERE TRIM(name) NOT IN ('Pouyan Shahr Balkh', 'Pioneer Travel Agency')
)
UNION ALL SELECT 'supplier_contacts', COUNT(*) FROM supplier_contacts WHERE tenant_id IN (
  SELECT id FROM tenants WHERE TRIM(name) NOT IN ('Pouyan Shahr Balkh', 'Pioneer Travel Agency')
)
UNION ALL SELECT 'suppliers', COUNT(*) FROM suppliers WHERE tenant_id IN (
  SELECT id FROM tenants WHERE TRIM(name) NOT IN ('Pouyan Shahr Balkh', 'Pioneer Travel Agency')
)
UNION ALL SELECT 'customer_loan_repayments', COUNT(*) FROM customer_loan_repayments WHERE tenant_id IN (
  SELECT id FROM tenants WHERE TRIM(name) NOT IN ('Pouyan Shahr Balkh', 'Pioneer Travel Agency')
)
UNION ALL SELECT 'customer_loans', COUNT(*) FROM customer_loans WHERE tenant_id IN (
  SELECT id FROM tenants WHERE TRIM(name) NOT IN ('Pouyan Shahr Balkh', 'Pioneer Travel Agency')
)
UNION ALL SELECT 'invoices', COUNT(*) FROM invoices WHERE tenant_id IN (
  SELECT id FROM tenants WHERE TRIM(name) NOT IN ('Pouyan Shahr Balkh', 'Pioneer Travel Agency')
)
UNION ALL SELECT 'customer_transactions', COUNT(*) FROM customer_transactions WHERE tenant_id IN (
  SELECT id FROM tenants WHERE TRIM(name) NOT IN ('Pouyan Shahr Balkh', 'Pioneer Travel Agency')
)
UNION ALL SELECT 'ledger_entries', COUNT(*) FROM ledger_entries WHERE tenant_id IN (
  SELECT id FROM tenants WHERE TRIM(name) NOT IN ('Pouyan Shahr Balkh', 'Pioneer Travel Agency')
)
UNION ALL SELECT 'journal_entries', COUNT(*) FROM journal_entries WHERE tenant_id IN (
  SELECT id FROM tenants WHERE TRIM(name) NOT IN ('Pouyan Shahr Balkh', 'Pioneer Travel Agency')
)
UNION ALL SELECT 'tickets', COUNT(*) FROM tickets WHERE tenant_id IN (
  SELECT id FROM tenants WHERE TRIM(name) NOT IN ('Pouyan Shahr Balkh', 'Pioneer Travel Agency')
)
UNION ALL SELECT 'deposits', COUNT(*) FROM deposits WHERE tenant_id IN (
  SELECT id FROM tenants WHERE TRIM(name) NOT IN ('Pouyan Shahr Balkh', 'Pioneer Travel Agency')
)
UNION ALL SELECT 'wallets', COUNT(*) FROM wallets WHERE tenant_id IN (
  SELECT id FROM tenants WHERE TRIM(name) NOT IN ('Pouyan Shahr Balkh', 'Pioneer Travel Agency')
)
UNION ALL SELECT 'customers', COUNT(*) FROM customers WHERE tenant_id IN (
  SELECT id FROM tenants WHERE TRIM(name) NOT IN ('Pouyan Shahr Balkh', 'Pioneer Travel Agency')
)
UNION ALL SELECT 'users', COUNT(*) FROM users WHERE tenant_id IN (
  SELECT id FROM tenants WHERE TRIM(name) NOT IN ('Pouyan Shahr Balkh', 'Pioneer Travel Agency')
);

-- =============================================================================
-- PHASE 1 — TRANSACTIONAL DELETE
-- Uncomment and run ONLY after backup + Phase 0 review.
-- =============================================================================

/*
START TRANSACTION;

-- ---------------------------------------------------------------------------
-- Scope: tenant IDs to remove
-- ---------------------------------------------------------------------------
DROP TEMPORARY TABLE IF EXISTS _tenant_ids_to_remove;
CREATE TEMPORARY TABLE _tenant_ids_to_remove (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY
) ENGINE=MEMORY;

INSERT INTO _tenant_ids_to_remove (id)
SELECT t.id
FROM tenants t
WHERE TRIM(t.name) NOT IN ('Pouyan Shahr Balkh', 'Pioneer Travel Agency');

-- Guard: refuse to delete if kept tenants are missing (optional sanity check)
-- SELECT CASE WHEN (
--   SELECT COUNT(*) FROM tenants
--   WHERE TRIM(name) IN ('Pouyan Shahr Balkh', 'Pioneer Travel Agency')
-- ) < 2 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Expected both kept tenants to exist';
-- END;

-- ---------------------------------------------------------------------------
-- ID sets (matches reset-tenant-data.ts ticket / invoice / journal / AI logic)
-- ---------------------------------------------------------------------------
DROP TEMPORARY TABLE IF EXISTS _ticket_ids_to_remove;
CREATE TEMPORARY TABLE _ticket_ids_to_remove (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY
) ENGINE=MEMORY;

INSERT INTO _ticket_ids_to_remove (id)
SELECT tk.id FROM tickets tk
WHERE tk.tenant_id IN (SELECT id FROM _tenant_ids_to_remove)
UNION
SELECT tk.id FROM tickets tk
INNER JOIN airlines al ON al.id = tk.airline_id
WHERE al.tenant_id IN (SELECT id FROM _tenant_ids_to_remove);

DROP TEMPORARY TABLE IF EXISTS _invoice_ids_to_remove;
CREATE TEMPORARY TABLE _invoice_ids_to_remove (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY
) ENGINE=MEMORY;

INSERT INTO _invoice_ids_to_remove (id)
SELECT inv.id FROM invoices inv
WHERE inv.tenant_id IN (SELECT id FROM _tenant_ids_to_remove);

DROP TEMPORARY TABLE IF EXISTS _journal_ids_to_remove;
CREATE TEMPORARY TABLE _journal_ids_to_remove (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY
) ENGINE=MEMORY;

INSERT INTO _journal_ids_to_remove (id)
SELECT je.id FROM journal_entries je
WHERE je.tenant_id IN (SELECT id FROM _tenant_ids_to_remove);

DROP TEMPORARY TABLE IF EXISTS _conversation_ids_to_remove;
CREATE TEMPORARY TABLE _conversation_ids_to_remove (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY
) ENGINE=MEMORY;

INSERT INTO _conversation_ids_to_remove (id)
SELECT ac.id FROM ai_conversations ac
WHERE ac.tenant_id IN (SELECT id FROM _tenant_ids_to_remove);

DROP TEMPORARY TABLE IF EXISTS _user_ids_to_remove;
CREATE TEMPORARY TABLE _user_ids_to_remove (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY
) ENGINE=MEMORY;

INSERT INTO _user_ids_to_remove (id)
SELECT u.id FROM users u
WHERE u.tenant_id IN (SELECT id FROM _tenant_ids_to_remove);

-- ---------------------------------------------------------------------------
-- Operational deletes (same order as reset-tenant-data.ts)
-- ---------------------------------------------------------------------------
DELETE bsl FROM bank_statement_lines bsl
INNER JOIN _tenant_ids_to_remove r ON r.id = bsl.tenant_id;

DELETE bs FROM bank_statements bs
INNER JOIN _tenant_ids_to_remove r ON r.id = bs.tenant_id;

DELETE sp FROM supplier_payments sp
INNER JOIN _tenant_ids_to_remove r ON r.id = sp.tenant_id;

DELETE bi FROM bill_items bi
INNER JOIN _tenant_ids_to_remove r ON r.id = bi.tenant_id;

DELETE b FROM bills b
INNER JOIN _tenant_ids_to_remove r ON r.id = b.tenant_id;

DELETE sc FROM supplier_contacts sc
INNER JOIN _tenant_ids_to_remove r ON r.id = sc.tenant_id;

DELETE s FROM suppliers s
INNER JOIN _tenant_ids_to_remove r ON r.id = s.tenant_id;

DELETE clr FROM customer_loan_repayments clr
INNER JOIN _tenant_ids_to_remove r ON r.id = clr.tenant_id;

DELETE cl FROM customer_loans cl
INNER JOIN _tenant_ids_to_remove r ON r.id = cl.tenant_id;

DELETE ii FROM invoice_items ii
INNER JOIN _invoice_ids_to_remove inv ON inv.id = ii.invoice_id;

DELETE inv FROM invoices inv
INNER JOIN _tenant_ids_to_remove r ON r.id = inv.tenant_id;

DELETE ct FROM customer_transactions ct
INNER JOIN _tenant_ids_to_remove r ON r.id = ct.tenant_id;

DELETE le FROM ledger_entries le
INNER JOIN _tenant_ids_to_remove r ON r.id = le.tenant_id;

DELETE jel FROM journal_entry_lines jel
INNER JOIN _journal_ids_to_remove j ON j.id = jel.journal_entry_id;

DELETE je FROM journal_entries je
INNER JOIN _tenant_ids_to_remove r ON r.id = je.tenant_id;

DELETE tp FROM ticket_passengers tp
INNER JOIN _ticket_ids_to_remove tk ON tk.id = tp.ticket_id;

DELETE tk FROM tickets tk
INNER JOIN _ticket_ids_to_remove tkr ON tkr.id = tk.id;

DELETE d FROM deposits d
INNER JOIN _tenant_ids_to_remove r ON r.id = d.tenant_id;

DELETE pl FROM payment_locations pl
INNER JOIN _tenant_ids_to_remove r ON r.id = pl.tenant_id;

DELETE wt FROM wallet_transactions wt
INNER JOIN _tenant_ids_to_remove r ON r.id = wt.tenant_id;

DELETE w FROM wallets w
INNER JOIN _tenant_ids_to_remove r ON r.id = w.tenant_id;

DELETE e FROM expenses e
INNER JOIN _tenant_ids_to_remove r ON r.id = e.tenant_id;

DELETE ec FROM expense_categories ec
INNER JOIN _tenant_ids_to_remove r ON r.id = ec.tenant_id;

DELETE i FROM interactions i
INNER JOIN _tenant_ids_to_remove r ON r.id = i.tenant_id;

DELETE l FROM leads l
INNER JOIN _tenant_ids_to_remove r ON r.id = l.tenant_id;

DELETE c FROM customers c
INNER JOIN _tenant_ids_to_remove r ON r.id = c.tenant_id;

DELETE am FROM ai_messages am
INNER JOIN _conversation_ids_to_remove c ON c.id = am.conversation_id;

DELETE ac FROM ai_conversations ac
INNER JOIN _tenant_ids_to_remove r ON r.id = ac.tenant_id;

DELETE doc FROM documents doc
INNER JOIN _tenant_ids_to_remove r ON r.id = doc.tenant_id;

DELETE er FROM exchange_rates er
INNER JOIN _tenant_ids_to_remove r ON r.id = er.tenant_id;

DELETE n FROM notifications n
INNER JOIN _tenant_ids_to_remove r ON r.id = n.tenant_id;

DELETE ap FROM accounting_periods ap
INNER JOIN _tenant_ids_to_remove r ON r.id = ap.tenant_id;

DELETE ds FROM document_sequences ds
INNER JOIN _tenant_ids_to_remove r ON r.id = ds.tenant_id;

DELETE ss FROM system_settings ss
INNER JOIN _tenant_ids_to_remove r ON r.id = ss.tenant_id;

DELETE alog FROM audit_logs alog
INNER JOIN _tenant_ids_to_remove r ON r.id = alog.tenant_id;

DELETE al FROM airlines al
INNER JOIN _tenant_ids_to_remove r ON r.id = al.tenant_id;

-- Wallet sub-accounts before parent COA rows
DELETE coa FROM chart_of_accounts coa
INNER JOIN _tenant_ids_to_remove r ON r.id = coa.tenant_id
WHERE coa.parent_id IS NOT NULL;

DELETE coa FROM chart_of_accounts coa
INNER JOIN _tenant_ids_to_remove r ON r.id = coa.tenant_id;

-- ---------------------------------------------------------------------------
-- Tenant removal (users, subscriptions, roles, tenant row)
-- reset-tenant-data.ts deletes sessions but keeps users; full cleanup removes all.
-- ---------------------------------------------------------------------------

-- Clear subscription approver FKs pointing at users we are about to delete
UPDATE subscriptions s
INNER JOIN _user_ids_to_remove u ON u.id = s.approved_by
SET s.approved_by = NULL;

DELETE sess FROM sessions sess
INNER JOIN _user_ids_to_remove u ON u.id = sess.user_id;

DELETE sub FROM subscriptions sub
INNER JOIN _tenant_ids_to_remove r ON r.id = sub.tenant_id;

DELETE u FROM users u
INNER JOIN _tenant_ids_to_remove r ON r.id = u.tenant_id;

DELETE ro FROM roles ro
INNER JOIN _tenant_ids_to_remove r ON r.id = ro.tenant_id;

DELETE t FROM tenants t
INNER JOIN _tenant_ids_to_remove r ON r.id = t.id;

-- ---------------------------------------------------------------------------
-- Verify kept tenants remain
-- ---------------------------------------------------------------------------
SELECT id, TRIM(name) AS name_trimmed, slug, status
FROM tenants
ORDER BY id;

DROP TEMPORARY TABLE IF EXISTS _user_ids_to_remove;
DROP TEMPORARY TABLE IF EXISTS _conversation_ids_to_remove;
DROP TEMPORARY TABLE IF EXISTS _journal_ids_to_remove;
DROP TEMPORARY TABLE IF EXISTS _invoice_ids_to_remove;
DROP TEMPORARY TABLE IF EXISTS _ticket_ids_to_remove;
DROP TEMPORARY TABLE IF EXISTS _tenant_ids_to_remove;

COMMIT;
*/

-- =============================================================================
-- After Phase 1: only these two tenant names should remain (if they existed):
--   Pouyan Shahr Balkh, Pioneer Travel Agency
-- =============================================================================
