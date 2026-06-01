-- Add foreign key constraints for PSB-ERP schema
-- Run this after importing all tables and verifying the target database.

ALTER TABLE subscriptions
  ADD CONSTRAINT fk_subscriptions_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  ADD CONSTRAINT fk_subscriptions_approved_by FOREIGN KEY (approved_by) REFERENCES users(id);

ALTER TABLE users
  ADD CONSTRAINT fk_users_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE wallets
  ADD CONSTRAINT fk_wallets_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  ADD CONSTRAINT fk_wallets_user_id FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE wallet_transactions
  ADD CONSTRAINT fk_wallet_transactions_wallet_id FOREIGN KEY (wallet_id) REFERENCES wallets(id),
  ADD CONSTRAINT fk_wallet_transactions_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  ADD CONSTRAINT fk_wallet_transactions_created_by FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE airlines
  ADD CONSTRAINT fk_airlines_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE tickets
  ADD CONSTRAINT fk_tickets_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  ADD CONSTRAINT fk_tickets_airline_id FOREIGN KEY (airline_id) REFERENCES airlines(id),
  ADD CONSTRAINT fk_tickets_customer_id FOREIGN KEY (customer_id) REFERENCES customers(id),
  ADD CONSTRAINT fk_tickets_issued_by FOREIGN KEY (issued_by) REFERENCES users(id),
  ADD CONSTRAINT fk_tickets_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id);

ALTER TABLE ticket_passengers
  ADD CONSTRAINT fk_ticket_passengers_ticket_id FOREIGN KEY (ticket_id) REFERENCES tickets(id);

ALTER TABLE customers
  ADD CONSTRAINT fk_customers_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  ADD CONSTRAINT fk_customers_assigned_to FOREIGN KEY (assigned_to) REFERENCES users(id),
  ADD CONSTRAINT fk_customers_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id);

ALTER TABLE leads
  ADD CONSTRAINT fk_leads_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  ADD CONSTRAINT fk_leads_assigned_to FOREIGN KEY (assigned_to) REFERENCES users(id),
  ADD CONSTRAINT fk_leads_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id);

ALTER TABLE interactions
  ADD CONSTRAINT fk_interactions_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  ADD CONSTRAINT fk_interactions_customer_id FOREIGN KEY (customer_id) REFERENCES customers(id),
  ADD CONSTRAINT fk_interactions_lead_id FOREIGN KEY (lead_id) REFERENCES leads(id),
  ADD CONSTRAINT fk_interactions_created_by FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE expense_categories
  ADD CONSTRAINT fk_expense_categories_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE expenses
  ADD CONSTRAINT fk_expenses_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  ADD CONSTRAINT fk_expenses_category_id FOREIGN KEY (category_id) REFERENCES expense_categories(id),
  ADD CONSTRAINT fk_expenses_approved_by FOREIGN KEY (approved_by) REFERENCES users(id),
  ADD CONSTRAINT fk_expenses_submitted_by FOREIGN KEY (submitted_by) REFERENCES users(id),
  ADD CONSTRAINT fk_expenses_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id);

ALTER TABLE chart_of_accounts
  ADD CONSTRAINT fk_chart_of_accounts_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE journal_entries
  ADD CONSTRAINT fk_journal_entries_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  ADD CONSTRAINT fk_journal_entries_posted_by FOREIGN KEY (posted_by) REFERENCES users(id);

ALTER TABLE journal_entry_lines
  ADD CONSTRAINT fk_journal_entry_lines_journal_entry_id FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id),
  ADD CONSTRAINT fk_journal_entry_lines_account_id FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id);

ALTER TABLE ledger_entries
  ADD CONSTRAINT fk_ledger_entries_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  ADD CONSTRAINT fk_ledger_entries_journal_entry_id FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id),
  ADD CONSTRAINT fk_ledger_entries_account_id FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id);

ALTER TABLE ai_conversations
  ADD CONSTRAINT fk_ai_conversations_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  ADD CONSTRAINT fk_ai_conversations_user_id FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE ai_messages
  ADD CONSTRAINT fk_ai_messages_conversation_id FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id);

ALTER TABLE customer_transactions
  ADD CONSTRAINT fk_customer_transactions_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  ADD CONSTRAINT fk_customer_transactions_customer_id FOREIGN KEY (customer_id) REFERENCES customers(id),
  ADD CONSTRAINT fk_customer_transactions_ticket_id FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  ADD CONSTRAINT fk_customer_transactions_invoice_id FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  ADD CONSTRAINT fk_customer_transactions_created_by FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE invoices
  ADD CONSTRAINT fk_invoices_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  ADD CONSTRAINT fk_invoices_customer_id FOREIGN KEY (customer_id) REFERENCES customers(id),
  ADD CONSTRAINT fk_invoices_ticket_id FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  ADD CONSTRAINT fk_invoices_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  ADD CONSTRAINT fk_invoices_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id);

ALTER TABLE invoice_items
  ADD CONSTRAINT fk_invoice_items_invoice_id FOREIGN KEY (invoice_id) REFERENCES invoices(id);

ALTER TABLE notifications
  ADD CONSTRAINT fk_notifications_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  ADD CONSTRAINT fk_notifications_user_id FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE accounting_periods
  ADD CONSTRAINT fk_accounting_periods_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  ADD CONSTRAINT fk_accounting_periods_closed_by FOREIGN KEY (closed_by) REFERENCES users(id);

ALTER TABLE audit_logs
  ADD CONSTRAINT fk_audit_logs_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  ADD CONSTRAINT fk_audit_logs_user_id FOREIGN KEY (user_id) REFERENCES users(id),
  ADD CONSTRAINT fk_audit_logs_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id);

ALTER TABLE sessions
  ADD CONSTRAINT fk_sessions_user_id FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE payment_locations
  ADD CONSTRAINT fk_payment_locations_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE deposits
  ADD CONSTRAINT fk_deposits_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  ADD CONSTRAINT fk_deposits_customer_id FOREIGN KEY (customer_id) REFERENCES customers(id),
  ADD CONSTRAINT fk_deposits_wallet_id FOREIGN KEY (wallet_id) REFERENCES wallets(id),
  ADD CONSTRAINT fk_deposits_location_id FOREIGN KEY (location_id) REFERENCES payment_locations(id),
  ADD CONSTRAINT fk_deposits_approved_by FOREIGN KEY (approved_by) REFERENCES users(id),
  ADD CONSTRAINT fk_deposits_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  ADD CONSTRAINT fk_deposits_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id);

ALTER TABLE suppliers
  ADD CONSTRAINT fk_suppliers_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  ADD CONSTRAINT fk_suppliers_created_by FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE supplier_contacts
  ADD CONSTRAINT fk_supplier_contacts_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  ADD CONSTRAINT fk_supplier_contacts_supplier_id FOREIGN KEY (supplier_id) REFERENCES suppliers(id);

ALTER TABLE bills
  ADD CONSTRAINT fk_bills_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  ADD CONSTRAINT fk_bills_supplier_id FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  ADD CONSTRAINT fk_bills_journal_entry_id FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id),
  ADD CONSTRAINT fk_bills_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  ADD CONSTRAINT fk_bills_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id);

ALTER TABLE bill_items
  ADD CONSTRAINT fk_bill_items_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  ADD CONSTRAINT fk_bill_items_bill_id FOREIGN KEY (bill_id) REFERENCES bills(id),
  ADD CONSTRAINT fk_bill_items_account_id FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id);

ALTER TABLE supplier_payments
  ADD CONSTRAINT fk_supplier_payments_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  ADD CONSTRAINT fk_supplier_payments_supplier_id FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  ADD CONSTRAINT fk_supplier_payments_bill_id FOREIGN KEY (bill_id) REFERENCES bills(id),
  ADD CONSTRAINT fk_supplier_payments_journal_entry_id FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id),
  ADD CONSTRAINT fk_supplier_payments_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  ADD CONSTRAINT fk_supplier_payments_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id);

ALTER TABLE exchange_rates
  ADD CONSTRAINT fk_exchange_rates_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  ADD CONSTRAINT fk_exchange_rates_created_by FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE bank_statements
  ADD CONSTRAINT fk_bank_statements_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  ADD CONSTRAINT fk_bank_statements_account_id FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id),
  ADD CONSTRAINT fk_bank_statements_created_by FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE bank_statement_lines
  ADD CONSTRAINT fk_bank_statement_lines_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  ADD CONSTRAINT fk_bank_statement_lines_statement_id FOREIGN KEY (statement_id) REFERENCES bank_statements(id),
  ADD CONSTRAINT fk_bank_statement_lines_matched_journal_entry_id FOREIGN KEY (matched_journal_entry_id) REFERENCES journal_entries(id),
  ADD CONSTRAINT fk_bank_statement_lines_matched_ledger_entry_id FOREIGN KEY (matched_ledger_entry_id) REFERENCES ledger_entries(id);

ALTER TABLE document_sequences
  ADD CONSTRAINT fk_document_sequences_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE system_settings
  ADD CONSTRAINT fk_system_settings_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  ADD CONSTRAINT fk_system_settings_updated_by FOREIGN KEY (updated_by) REFERENCES users(id);

ALTER TABLE documents
  ADD CONSTRAINT fk_documents_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  ADD CONSTRAINT fk_documents_generated_by FOREIGN KEY (generated_by) REFERENCES users(id),
  ADD CONSTRAINT fk_documents_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id);

ALTER TABLE roles
  ADD CONSTRAINT fk_roles_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id);
