CREATE TABLE IF NOT EXISTS `tenants` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `domain` varchar(255),
  `logo` text,
  `settings` json,
  `status` enum('active','suspended','trial','cancelled','pending','rejected') NOT NULL DEFAULT "trial",
  `plan` enum('free','starter','professional','enterprise') NOT NULL DEFAULT "free",
  `trial_ends_at` datetime,
  `registration_token` varchar(50),
  `owner_name` varchar(255),
  `owner_email` varchar(320),
  `owner_phone` varchar(50),
  `address` text,
  `city` varchar(100),
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `tenants_token_unique` (`registration_token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `unionId` varchar(255) NOT NULL,
  `password_hash` varchar(255),
  `tenant_id` bigint unsigned REFERENCES `tenants`(`id`),
  `name` varchar(255),
  `email` varchar(320),
  `avatar` text,
  `role` enum('super_admin','admin','agent','viewer') NOT NULL DEFAULT "agent",
  `status` enum('active','inactive','suspended') NOT NULL DEFAULT "active",
  `department` varchar(100),
  `phone` varchar(50),
  `last_sign_in_at` datetime,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `roles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` bigint unsigned REFERENCES `tenants`(`id`),
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `description` text,
  `permissions` json,
  `is_system` boolean NOT NULL DEFAULT false,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `airlines` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` bigint unsigned NOT NULL REFERENCES `tenants`(`id`),
  `code` varchar(10) NOT NULL,
  `name` varchar(255) NOT NULL,
  `logo` text,
  `iata_code` varchar(5),
  `icao_code` varchar(5),
  `contact_email` varchar(255),
  `contact_phone` varchar(50),
  `status` enum('active','inactive') NOT NULL DEFAULT "active",
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `expense_categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` bigint unsigned NOT NULL REFERENCES `tenants`(`id`),
  `name` varchar(100) NOT NULL,
  `description` text,
  `color` varchar(20) DEFAULT "#6366f1",
  `icon` varchar(50),
  `parent_id` bigint unsigned,
  `is_system` boolean NOT NULL DEFAULT false,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `chart_of_accounts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` bigint unsigned NOT NULL REFERENCES `tenants`(`id`),
  `code` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` enum('asset','liability','equity','revenue','expense') NOT NULL,
  `subtype` varchar(50),
  `parent_id` bigint unsigned,
  `description` text,
  `is_bank_account` boolean NOT NULL DEFAULT false,
  `bank_name` varchar(255),
  `account_number` varchar(100),
  `currency` varchar(3) NOT NULL DEFAULT "USD",
  `current_balance` decimal(15,2) NOT NULL DEFAULT "0.00",
  `status` enum('active','inactive') NOT NULL DEFAULT "active",
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `payment_locations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` bigint unsigned NOT NULL REFERENCES `tenants`(`id`),
  `name` varchar(255) NOT NULL,
  `city` varchar(100) NOT NULL,
  `address` text,
  `phone` varchar(50),
  `email` varchar(255),
  `opening_hours` varchar(255),
  `supported_methods` json,
  `status` enum('active','inactive') NOT NULL DEFAULT "active",
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `pl_tenant_idx` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `document_sequences` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` bigint unsigned NOT NULL REFERENCES `tenants`(`id`),
  `prefix` varchar(20) NOT NULL,
  `year` int NOT NULL,
  `last_number` bigint unsigned NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `ds_tenant_idx` (`tenant_id`),
  UNIQUE KEY `ds_tenant_prefix_year_unique` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` bigint unsigned NOT NULL REFERENCES `tenants`(`id`),
  `plan` enum('free','starter','professional','enterprise') NOT NULL DEFAULT "free",
  `duration_months` int NOT NULL DEFAULT 1,
  `status` enum('pending','active','expired','cancelled') NOT NULL DEFAULT "pending",
  `starts_at` datetime,
  `expires_at` datetime,
  `approved_by` bigint unsigned REFERENCES `users`(`id`),
  `approved_at` datetime,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `subs_tenant_idx` (`tenant_id`),
  KEY `subs_status_idx` (`status`),
  KEY `subs_expires_idx` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `wallets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` bigint unsigned NOT NULL REFERENCES `tenants`(`id`),
  `user_id` bigint unsigned REFERENCES `users`(`id`),
  `customer_id` bigint unsigned,
  `name` varchar(255) NOT NULL,
  `currency` varchar(3) NOT NULL DEFAULT "USD",
  `balance` decimal(15,2) NOT NULL DEFAULT "0.00",
  `reserved_balance` decimal(15,2) NOT NULL DEFAULT "0.00",
  `credit_limit` decimal(15,2) NOT NULL DEFAULT "0.00",
  `due_balance` decimal(15,2) NOT NULL DEFAULT "0.00",
  `status` enum('active','frozen','closed') NOT NULL DEFAULT "active",
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `leads` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` bigint unsigned NOT NULL REFERENCES `tenants`(`id`),
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(320),
  `phone` varchar(50),
  `company` varchar(255),
  `source` varchar(50),
  `status` enum('new','contacted','qualified','proposal','negotiation','won','lost') NOT NULL DEFAULT "new",
  `priority` enum('low','medium','high') NOT NULL DEFAULT "medium",
  `estimated_value` decimal(12,2),
  `notes` text,
  `assigned_to` bigint unsigned REFERENCES `users`(`id`),
  `expected_close_date` date,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `journal_entries` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` bigint unsigned NOT NULL REFERENCES `tenants`(`id`),
  `entry_number` varchar(50) NOT NULL,
  `date` date NOT NULL,
  `reference_type` varchar(50),
  `reference_id` bigint unsigned,
  `description` text NOT NULL,
  `total_debit` decimal(15,2) NOT NULL,
  `total_credit` decimal(15,2) NOT NULL,
  `status` enum('draft','posted','reversed') NOT NULL DEFAULT "draft",
  `posted_by` bigint unsigned REFERENCES `users`(`id`),
  `posted_at` datetime,
  `notes` text,
  `metadata` json,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ai_conversations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` bigint unsigned NOT NULL REFERENCES `tenants`(`id`),
  `user_id` bigint unsigned REFERENCES `users`(`id`),
  `title` varchar(255),
  `model` varchar(50) DEFAULT "gpt-4",
  `status` enum('active','archived') NOT NULL DEFAULT "active",
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` bigint unsigned NOT NULL REFERENCES `tenants`(`id`),
  `user_id` bigint unsigned REFERENCES `users`(`id`),
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` enum('info','success','warning','error','system') NOT NULL DEFAULT "info",
  `category` enum('ticket','wallet','expense','accounting','crm','system','security') NOT NULL DEFAULT "system",
  `reference_type` varchar(50),
  `reference_id` bigint unsigned,
  `is_read` boolean NOT NULL DEFAULT false,
  `read_at` datetime,
  `action_url` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `accounting_periods` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` bigint unsigned NOT NULL REFERENCES `tenants`(`id`),
  `year` int NOT NULL,
  `month` int,
  `status` enum('open','closing','closed') NOT NULL DEFAULT "open",
  `closed_by` bigint unsigned REFERENCES `users`(`id`),
  `closed_at` datetime,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `ap_tenant_year_month_idx` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sessions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` bigint unsigned NOT NULL REFERENCES `users`(`id`),
  `token` varchar(255) NOT NULL,
  `ip_address` varchar(45),
  `user_agent` text,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `sessions_user_idx` (`user_id`),
  KEY `sessions_token_idx` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` bigint unsigned NOT NULL REFERENCES `tenants`(`id`),
  `supplier_code` varchar(50) NOT NULL,
  `company_name` varchar(200) NOT NULL,
  `trade_name` varchar(200),
  `supplier_type` enum('airline','hotel','tour_operator','car_rental','insurance','visa_service','other') NOT NULL DEFAULT "other",
  `tax_id` varchar(50),
  `email` varchar(100),
  `phone` varchar(50),
  `address` text,
  `city` varchar(100),
  `country` varchar(100),
  `website` varchar(200),
  `credit_limit` decimal(15,2) NOT NULL DEFAULT "0.00",
  `balance_due` decimal(15,2) NOT NULL DEFAULT "0.00",
  `payment_terms` int DEFAULT 30,
  `currency` varchar(3) DEFAULT "USD",
  `status` enum('active','inactive','blocked') NOT NULL DEFAULT "active",
  `notes` text,
  `created_by` bigint unsigned REFERENCES `users`(`id`),
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `suppliers_tenant_idx` (`tenant_id`),
  KEY `suppliers_code_idx` (`supplier_code`),
  KEY `suppliers_status_idx` (`status`),
  UNIQUE KEY `suppliers_code_unique` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `exchange_rates` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` bigint unsigned NOT NULL REFERENCES `tenants`(`id`),
  `from_currency` varchar(3) NOT NULL,
  `to_currency` varchar(3) NOT NULL,
  `rate` decimal(15,6) NOT NULL,
  `effective_date` date NOT NULL,
  `source` enum('manual','api','system') NOT NULL DEFAULT "manual",
  `created_by` bigint unsigned REFERENCES `users`(`id`),
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `er_tenant_idx` (`tenant_id`),
  KEY `er_currency_idx` (`from_currency`),
  KEY `er_date_idx` (`effective_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` bigint unsigned NOT NULL REFERENCES `tenants`(`id`),
  `key` varchar(100) NOT NULL,
  `value` text,
  `category` varchar(50) DEFAULT "general",
  `description` text,
  `updated_by` bigint unsigned REFERENCES `users`(`id`),
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `ss_tenant_key_idx` (`tenant_id`),
  KEY `ss_category_idx` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `bank_statements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` bigint unsigned NOT NULL REFERENCES `tenants`(`id`),
  `account_id` bigint unsigned NOT NULL REFERENCES `chart_of_accounts`(`id`),
  `statement_date` date NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `opening_balance` decimal(15,2) NOT NULL DEFAULT "0.00",
  `closing_balance` decimal(15,2) NOT NULL DEFAULT "0.00",
  `file_url` text,
  `status` enum('pending','processing','partial','reconciled') NOT NULL DEFAULT "pending",
  `total_debits` decimal(15,2) NOT NULL DEFAULT "0.00",
  `total_credits` decimal(15,2) NOT NULL DEFAULT "0.00",
  `notes` text,
  `created_by` bigint unsigned REFERENCES `users`(`id`),
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `bs_tenant_idx` (`tenant_id`),
  KEY `bs_account_idx` (`account_id`),
  KEY `bs_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `wallet_transactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `wallet_id` bigint unsigned NOT NULL REFERENCES `wallets`(`id`),
  `tenant_id` bigint unsigned NOT NULL REFERENCES `tenants`(`id`),
  `type` enum('credit','debit','refund','transfer','fee','commission','lock','unlock') NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `balance_after` decimal(15,2) NOT NULL,
  `description` text,
  `reference_type` varchar(50),
  `reference_id` bigint unsigned,
  `metadata` json,
  `created_by` bigint unsigned REFERENCES `users`(`id`),
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `wallet_id_idx` (`wallet_id`),
  KEY `tenant_id_idx` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `journal_entry_lines` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `journal_entry_id` bigint unsigned NOT NULL REFERENCES `journal_entries`(`id`),
  `account_id` bigint unsigned NOT NULL REFERENCES `chart_of_accounts`(`id`),
  `description` text,
  `debit` decimal(15,2) NOT NULL DEFAULT "0.00",
  `credit` decimal(15,2) NOT NULL DEFAULT "0.00",
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ledger_entries` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` bigint unsigned NOT NULL REFERENCES `tenants`(`id`),
  `journal_entry_id` bigint unsigned REFERENCES `journal_entries`(`id`),
  `account_id` bigint unsigned NOT NULL REFERENCES `chart_of_accounts`(`id`),
  `date` date NOT NULL,
  `description` text,
  `debit` decimal(15,2) NOT NULL DEFAULT "0.00",
  `credit` decimal(15,2) NOT NULL DEFAULT "0.00",
  `balance` decimal(15,2) NOT NULL,
  `entry_type` enum('opening','transaction','adjustment','closing','reversal') NOT NULL DEFAULT "transaction",
  `reference_type` varchar(50),
  `reference_id` bigint unsigned,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ai_messages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `conversation_id` bigint unsigned NOT NULL REFERENCES `ai_conversations`(`id`),
  `role` enum('user','assistant','system') NOT NULL,
  `content` text NOT NULL,
  `tokens_used` int,
  `metadata` json,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `supplier_contacts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` bigint unsigned NOT NULL REFERENCES `tenants`(`id`),
  `supplier_id` bigint unsigned NOT NULL REFERENCES `suppliers`(`id`),
  `name` varchar(100) NOT NULL,
  `position` varchar(100),
  `email` varchar(100),
  `phone` varchar(50),
  `is_primary` boolean DEFAULT false,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `sc_supplier_idx` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `bank_statement_lines` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` bigint unsigned NOT NULL REFERENCES `tenants`(`id`),
  `statement_id` bigint unsigned NOT NULL REFERENCES `bank_statements`(`id`),
  `transaction_date` date NOT NULL,
  `description` text,
  `reference` varchar(100),
  `debit` decimal(15,2) NOT NULL DEFAULT "0.00",
  `credit` decimal(15,2) NOT NULL DEFAULT "0.00",
  `balance` decimal(15,2) NOT NULL DEFAULT "0.00",
  `matched_journal_entry_id` bigint unsigned REFERENCES `journal_entries`(`id`),
  `matched_ledger_entry_id` bigint unsigned REFERENCES `ledger_entries`(`id`),
  `match_confidence` decimal(5,2) DEFAULT "0.00",
  `status` enum('unmatched','matched','ignored') NOT NULL DEFAULT "unmatched",
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `bsl_tenant_idx` (`tenant_id`),
  KEY `bsl_statement_idx` (`statement_id`),
  KEY `bsl_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `tickets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` bigint unsigned NOT NULL REFERENCES `tenants`(`id`),
  `ticket_number` varchar(50) NOT NULL,
  `pnr_code` varchar(20),
  `airline_id` bigint unsigned REFERENCES `airlines`(`id`),
  `customer_id` bigint unsigned,
  `booking_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `travel_date` date,
  `return_date` date,
  `route_from` varchar(10) NOT NULL,
  `route_to` varchar(10) NOT NULL,
  `trip_type` enum('one_way','round_trip','multi_city') NOT NULL DEFAULT "one_way",
  `class` enum('economy','premium_economy','business','first') NOT NULL DEFAULT "economy",
  `base_fare` decimal(12,2) NOT NULL DEFAULT "0.00",
  `tax_amount` decimal(12,2) NOT NULL DEFAULT "0.00",
  `total_amount` decimal(12,2) NOT NULL DEFAULT "0.00",
  `commission_amount` decimal(12,2) NOT NULL DEFAULT "0.00",
  `paid_amount` decimal(12,2) NOT NULL DEFAULT "0.00",
  `supplier_cost` decimal(12,2) NOT NULL DEFAULT "0.00",
  `expense` decimal(12,2) NOT NULL DEFAULT "0.00",
  `net_payable` decimal(12,2) NOT NULL DEFAULT "0.00",
  `payment_status` enum('pending','partial','paid','refunded','cancelled') NOT NULL DEFAULT "pending",
  `status` enum('confirmed','pending','cancelled','refunded','completed') NOT NULL DEFAULT "pending",
  `issued_by` bigint unsigned REFERENCES `users`(`id`),
  `notes` text,
  `metadata` json,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` datetime,
  `deleted_by` bigint unsigned REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ticket_passengers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `ticket_id` bigint unsigned NOT NULL REFERENCES `tickets`(`id`),
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `passenger_type` enum('adult','child','infant') NOT NULL DEFAULT "adult",
  `passport_number` varchar(50),
  `nationality` varchar(100),
  `date_of_birth` date,
  `seat_number` varchar(10),
  `special_requests` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `customers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` bigint unsigned NOT NULL REFERENCES `tenants`(`id`),
  `customer_code` varchar(50) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(320),
  `phone` varchar(50),
  `alternate_phone` varchar(50),
  `company` varchar(255),
  `job_title` varchar(100),
  `address` text,
  `city` varchar(100),
  `country` varchar(100),
  `postal_code` varchar(20),
  `customer_type` enum('individual','corporate','agent') NOT NULL DEFAULT "individual",
  `status` enum('active','inactive','blacklisted','vip') NOT NULL DEFAULT "active",
  `source` varchar(50),
  `notes` text,
  `total_bookings` int NOT NULL DEFAULT 0,
  `total_revenue` decimal(12,2) NOT NULL DEFAULT "0.00",
  `last_booking_date` datetime,
  `assigned_to` bigint unsigned REFERENCES `users`(`id`),
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` datetime,
  `deleted_by` bigint unsigned REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `interactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` bigint unsigned NOT NULL REFERENCES `tenants`(`id`),
  `customer_id` bigint unsigned REFERENCES `customers`(`id`),
  `lead_id` bigint unsigned REFERENCES `leads`(`id`),
  `type` enum('call','email','meeting','note','task','sms','whatsapp') NOT NULL,
  `subject` varchar(255) NOT NULL,
  `description` text,
  `follow_up_date` datetime,
  `status` enum('pending','completed','overdue') NOT NULL DEFAULT "pending",
  `created_by` bigint unsigned REFERENCES `users`(`id`),
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `expenses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` bigint unsigned NOT NULL REFERENCES `tenants`(`id`),
  `category_id` bigint unsigned REFERENCES `expense_categories`(`id`),
  `title` varchar(255) NOT NULL,
  `description` text,
  `amount` decimal(12,2) NOT NULL,
  `currency` varchar(3) NOT NULL DEFAULT "USD",
  `expense_date` date NOT NULL,
  `payment_method` enum('cash','card','bank_transfer','cheque','wallet','other') NOT NULL DEFAULT "cash",
  `vendor` varchar(255),
  `receipt_number` varchar(100),
  `receipt_image` text,
  `status` enum('pending','approved','rejected','reimbursed') NOT NULL DEFAULT "pending",
  `approved_by` bigint unsigned REFERENCES `users`(`id`),
  `submitted_by` bigint unsigned REFERENCES `users`(`id`),
  `notes` text,
  `metadata` json,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` datetime,
  `deleted_by` bigint unsigned REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `invoices` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` bigint unsigned NOT NULL REFERENCES `tenants`(`id`),
  `customer_id` bigint unsigned NOT NULL REFERENCES `customers`(`id`),
  `invoice_number` varchar(50) NOT NULL,
  `ticket_id` bigint unsigned REFERENCES `tickets`(`id`),
  `issue_date` date NOT NULL,
  `due_date` date,
  `subtotal` decimal(15,2) NOT NULL DEFAULT "0.00",
  `tax_amount` decimal(15,2) NOT NULL DEFAULT "0.00",
  `total_amount` decimal(15,2) NOT NULL DEFAULT "0.00",
  `paid_amount` decimal(15,2) NOT NULL DEFAULT "0.00",
  `status` enum('draft','sent','partial','paid','overdue','cancelled') NOT NULL DEFAULT "draft",
  `notes` text,
  `created_by` bigint unsigned REFERENCES `users`(`id`),
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` datetime,
  `deleted_by` bigint unsigned REFERENCES `users`(`id`),
  KEY `invoices_tenant_idx` (`tenant_id`),
  KEY `invoices_customer_idx` (`customer_id`),
  KEY `invoices_ticket_idx` (`ticket_id`),
  UNIQUE KEY `invoices_number_unique` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `invoice_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `invoice_id` bigint unsigned NOT NULL REFERENCES `invoices`(`id`),
  `description` text NOT NULL,
  `quantity` int NOT NULL DEFAULT 1,
  `unit_price` decimal(15,2) NOT NULL DEFAULT "0.00",
  `total_price` decimal(15,2) NOT NULL DEFAULT "0.00",
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` bigint unsigned REFERENCES `tenants`(`id`),
  `user_id` bigint unsigned REFERENCES `users`(`id`),
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` varchar(50),
  `old_values` json,
  `new_values` json,
  `ip_address` varchar(45),
  `user_agent` text,
  `metadata` json,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` datetime,
  `deleted_by` bigint unsigned REFERENCES `users`(`id`),
  KEY `audit_tenant_idx` (`tenant_id`),
  KEY `audit_user_idx` (`user_id`),
  KEY `audit_action_idx` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `deposits` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` bigint unsigned NOT NULL REFERENCES `tenants`(`id`),
  `customer_id` bigint unsigned REFERENCES `customers`(`id`),
  `wallet_id` bigint unsigned NOT NULL REFERENCES `wallets`(`id`),
  `deposit_code` varchar(50) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `payment_method` enum('cash','bank_transfer','cheque') NOT NULL,
  `reference_number` varchar(100),
  `location_id` bigint unsigned REFERENCES `payment_locations`(`id`),
  `proof_image_url` text,
  `status` enum('pending','under_review','approved','rejected','expired') NOT NULL DEFAULT "pending",
  `approved_by` bigint unsigned REFERENCES `users`(`id`),
  `approved_at` datetime,
  `expires_at` datetime,
  `notes` text,
  `created_by` bigint unsigned REFERENCES `users`(`id`),
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` datetime,
  `deleted_by` bigint unsigned REFERENCES `users`(`id`),
  KEY `deposits_tenant_idx` (`tenant_id`),
  KEY `deposits_code_idx` (`deposit_code`),
  KEY `deposits_status_idx` (`status`),
  UNIQUE KEY `deposits_code_unique` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `bills` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` bigint unsigned NOT NULL REFERENCES `tenants`(`id`),
  `supplier_id` bigint unsigned NOT NULL REFERENCES `suppliers`(`id`),
  `bill_number` varchar(100) NOT NULL,
  `reference_number` varchar(100),
  `issue_date` date NOT NULL,
  `due_date` date NOT NULL,
  `subtotal` decimal(15,2) NOT NULL,
  `tax_amount` decimal(15,2) NOT NULL DEFAULT "0.00",
  `discount_amount` decimal(15,2) NOT NULL DEFAULT "0.00",
  `total_amount` decimal(15,2) NOT NULL,
  `amount_paid` decimal(15,2) NOT NULL DEFAULT "0.00",
  `balance_due` decimal(15,2) NOT NULL,
  `currency` varchar(3) DEFAULT "USD",
  `description` text,
  `status` enum('draft','open','partial','paid','overdue','cancelled') NOT NULL DEFAULT "draft",
  `category` varchar(100),
  `journal_entry_id` bigint unsigned REFERENCES `journal_entries`(`id`),
  `created_by` bigint unsigned REFERENCES `users`(`id`),
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` datetime,
  `deleted_by` bigint unsigned REFERENCES `users`(`id`),
  KEY `bills_tenant_idx` (`tenant_id`),
  KEY `bills_supplier_idx` (`supplier_id`),
  KEY `bills_number_idx` (`bill_number`),
  KEY `bills_status_idx` (`status`),
  KEY `bills_due_date_idx` (`due_date`),
  UNIQUE KEY `bills_number_unique` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `bill_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` bigint unsigned NOT NULL REFERENCES `tenants`(`id`),
  `bill_id` bigint unsigned NOT NULL REFERENCES `bills`(`id`),
  `description` varchar(255) NOT NULL,
  `quantity` decimal(10,2) NOT NULL DEFAULT "1.00",
  `unit_price` decimal(15,2) NOT NULL,
  `total` decimal(15,2) NOT NULL,
  `account_id` bigint unsigned REFERENCES `chart_of_accounts`(`id`),
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `bi_bill_idx` (`bill_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `supplier_payments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` bigint unsigned NOT NULL REFERENCES `tenants`(`id`),
  `supplier_id` bigint unsigned NOT NULL REFERENCES `suppliers`(`id`),
  `bill_id` bigint unsigned REFERENCES `bills`(`id`),
  `payment_number` varchar(100) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `payment_method` enum('cash','bank_transfer','cheque','credit_card','wallet') NOT NULL,
  `payment_date` date NOT NULL,
  `reference_number` varchar(100),
  `bank_account_id` bigint unsigned,
  `notes` text,
  `journal_entry_id` bigint unsigned REFERENCES `journal_entries`(`id`),
  `created_by` bigint unsigned REFERENCES `users`(`id`),
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` datetime,
  `deleted_by` bigint unsigned REFERENCES `users`(`id`),
  KEY `sp_tenant_idx` (`tenant_id`),
  KEY `sp_supplier_idx` (`supplier_id`),
  KEY `sp_bill_idx` (`bill_id`),
  KEY `sp_number_idx` (`payment_number`),
  UNIQUE KEY `sp_number_unique` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `documents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` bigint unsigned NOT NULL REFERENCES `tenants`(`id`),
  `entity_type` enum('invoice','ticket','deposit','supplier_payment','expense','report','customer','other') NOT NULL,
  `entity_id` bigint unsigned NOT NULL,
  `document_type` enum('invoice','receipt','voucher','statement','report','attachment') NOT NULL,
  `document_number` varchar(100),
  `file_name` varchar(255),
  `file_url` text,
  `file_size` bigint,
  `mime_type` varchar(50),
  `status` enum('draft','generated','sent','archived') NOT NULL DEFAULT "draft",
  `generated_by` bigint unsigned REFERENCES `users`(`id`),
  `generated_at` datetime,
  `sent_at` datetime,
  `sent_to` varchar(320),
  `metadata` json,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` datetime,
  `deleted_by` bigint unsigned REFERENCES `users`(`id`),
  KEY `docs_tenant_idx` (`tenant_id`),
  KEY `docs_entity_idx` (`entity_type`),
  KEY `docs_type_idx` (`document_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `customer_transactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` bigint unsigned NOT NULL REFERENCES `tenants`(`id`),
  `customer_id` bigint unsigned NOT NULL REFERENCES `customers`(`id`),
  `ticket_id` bigint unsigned REFERENCES `tickets`(`id`),
  `invoice_id` bigint unsigned REFERENCES `invoices`(`id`),
  `type` enum('receivable','payment','deposit','credit','refund','adjustment') NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `balance` decimal(15,2) NOT NULL,
  `description` text,
  `reference_number` varchar(100),
  `created_by` bigint unsigned REFERENCES `users`(`id`),
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
