-- =============================================================================
-- Fix: customer approved deposit did NOT settle an open loan (pre-unified-cash fix)
-- Run in phpMyAdmin AFTER replacing TENANT_ID, CUSTOMER_ID, LOAN_ID, DEPOSIT_ID.
-- Example: $200 deposit approved, $50 loan still open → loan repaid, deposit hold $150.
-- Prefer in-app fix: Receive Payment $50 with auto-allocate (after deploying new code).
-- =============================================================================

SET @tenant_id = 1;
SET @customer_id = 1;
SET @loan_id = 1;
SET @deposit_id = 1;
SET @repay_amount = 50.00;
SET @user_id = 1;

-- Preview
SELECT id, loan_number, balance_amount, status FROM customer_loans
WHERE tenant_id = @tenant_id AND id = @loan_id AND customer_id = @customer_id;

SELECT id, deposit_code, amount, status FROM deposits
WHERE tenant_id = @tenant_id AND id = @deposit_id AND customer_id = @customer_id;

-- 1) Record loan repayment
INSERT INTO customer_loan_repayments (tenant_id, loan_id, amount, payment_method, notes, created_by, created_at)
VALUES (@tenant_id, @loan_id, @repay_amount, 'cash', 'Manual fix: deposit should have settled loan', @user_id, NOW());

UPDATE customer_loans
SET repaid_amount = repaid_amount + @repay_amount,
    balance_amount = GREATEST(0, balance_amount - @repay_amount),
    status = IF(balance_amount - @repay_amount <= 0.01, 'repaid', status)
WHERE tenant_id = @tenant_id AND id = @loan_id;

-- 2) Reduce deposit hold to remainder (optional — only if full deposit amount was credited as hold)
UPDATE deposits
SET amount = GREATEST(0, amount - @repay_amount),
    notes = CONCAT(COALESCE(notes, ''), '\n[Manual fix] $', @repay_amount, ' applied to loan balance.')
WHERE tenant_id = @tenant_id AND id = @deposit_id;

-- 3) Customer ledger payment line (optional audit trail)
INSERT INTO customer_transactions (tenant_id, customer_id, type, amount, balance, description, created_by, created_at)
SELECT @tenant_id, @customer_id, 'payment', @repay_amount, 0,
       CONCAT('Manual fix: loan repayment from deposit settlement'),
       @user_id, NOW();

-- Verify
SELECT id, loan_number, balance_amount, status FROM customer_loans WHERE id = @loan_id;
SELECT id, deposit_code, amount FROM deposits WHERE id = @deposit_id;
