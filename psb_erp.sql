-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 02, 2026 at 10:27 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `psb_erp`
--

-- --------------------------------------------------------

--
-- Table structure for table `accounting_periods`
--

CREATE TABLE `accounting_periods` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `year` int(11) NOT NULL,
  `month` int(11) DEFAULT NULL,
  `status` enum('open','closing','closed') NOT NULL DEFAULT 'open',
  `closed_by` bigint(20) UNSIGNED DEFAULT NULL,
  `closed_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `airlines`
--

CREATE TABLE `airlines` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `code` varchar(10) NOT NULL,
  `name` varchar(255) NOT NULL,
  `logo` text DEFAULT NULL,
  `iata_code` varchar(5) DEFAULT NULL,
  `icao_code` varchar(5) DEFAULT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `contact_phone` varchar(50) DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `airlines`
--

INSERT INTO `airlines` (`id`, `tenant_id`, `code`, `name`, `logo`, `iata_code`, `icao_code`, `contact_email`, `contact_phone`, `status`, `created_at`) VALUES
(1, 1, 'AA', 'American Airlines', NULL, 'AA', 'AAL', 'support@aa.com', '+1-800-433-7300', 'active', '2026-05-11 10:23:06'),
(2, 1, 'DL', 'Delta Air Lines', NULL, 'DL', 'DAL', 'support@delta.com', '+1-800-221-1212', 'active', '2026-05-11 10:23:06'),
(3, 1, 'UA', 'United Airlines', NULL, 'UA', 'UAL', 'support@united.com', '+1-800-864-8331', 'active', '2026-05-11 10:23:06'),
(4, 1, 'BA', 'British Airways', NULL, 'BA', 'BAW', 'support@ba.com', '+44-344-493-0787', 'active', '2026-05-11 10:23:06'),
(5, 1, 'EK', 'Emirates', NULL, 'EK', 'UAE', 'support@emirates.com', '+971-4-295-4444', 'active', '2026-05-11 10:23:06'),
(6, 1, 'LH', 'Lufthansa', NULL, 'LH', 'DLH', 'support@lufthansa.com', '+49-69-867-99400', 'active', '2026-05-11 10:23:06'),
(7, 1, 'AF', 'Air France', NULL, 'AF', 'AFR', 'support@airfrance.com', '+33-1-57-02-1000', 'active', '2026-05-11 10:23:06'),
(8, 1, 'SQ', 'Singapore Airlines', NULL, 'SQ', 'SIA', 'support@singaporeair.com', '+65-6788-6868', 'active', '2026-05-11 10:23:06'),
(9, 1, 'FG', 'Ariana Afghan Airlines', NULL, NULL, NULL, NULL, NULL, 'active', '2026-05-11 11:27:12'),
(10, 1, 'RQ', 'Kam Air', NULL, NULL, NULL, NULL, NULL, 'active', '2026-05-11 11:27:12'),
(11, 1, 'EK', 'Emirates', NULL, NULL, NULL, NULL, NULL, 'active', '2026-05-11 11:27:12'),
(12, 1, 'QR', 'Qatar Airways', NULL, NULL, NULL, NULL, NULL, 'active', '2026-05-11 11:27:12'),
(13, 1, 'TK', 'Turkish Airlines', NULL, NULL, NULL, NULL, NULL, 'active', '2026-05-11 11:27:12'),
(14, 1, 'FZ', 'FlyDubai', NULL, NULL, NULL, NULL, NULL, 'active', '2026-05-11 11:27:12'),
(20, 41, '', 'Kam Air', NULL, NULL, NULL, NULL, NULL, 'active', '2026-05-22 16:40:38'),
(21, 41, '', 'Ariana Afghan Airlines', NULL, NULL, NULL, NULL, NULL, 'active', '2026-05-22 16:40:38'),
(22, 41, '', 'FlyDubai', NULL, NULL, NULL, NULL, NULL, 'active', '2026-05-22 16:40:38'),
(23, 41, '', 'Emirates', NULL, NULL, NULL, NULL, NULL, 'active', '2026-05-22 16:40:38'),
(24, 41, '', 'Qatar Airways', NULL, NULL, NULL, NULL, NULL, 'active', '2026-05-22 16:40:38'),
(25, 43, 'AA', 'American Airlines', NULL, 'AA', 'AAL', NULL, NULL, 'active', '2026-05-23 15:23:56'),
(26, 43, 'DL', 'Delta Air Lines', NULL, 'DL', 'DAL', NULL, NULL, 'active', '2026-05-23 15:23:56'),
(27, 43, 'UA', 'United Airlines', NULL, 'UA', 'UAL', NULL, NULL, 'active', '2026-05-23 15:23:56'),
(28, 43, 'BA', 'British Airways', NULL, 'BA', 'BAW', NULL, NULL, 'active', '2026-05-23 15:23:56'),
(29, 43, 'EK', 'Emirates', NULL, 'EK', 'UAE', NULL, NULL, 'active', '2026-05-23 15:23:56'),
(30, 43, 'LH', 'Lufthansa', NULL, 'LH', 'DLH', NULL, NULL, 'active', '2026-05-23 15:23:56'),
(31, 43, 'AF', 'Air France', NULL, 'AF', 'AFR', NULL, NULL, 'active', '2026-05-23 15:23:56'),
(32, 43, 'SQ', 'Singapore Airlines', NULL, 'SQ', 'SIA', NULL, NULL, 'active', '2026-05-23 15:23:56'),
(33, 44, 'AA', 'American Airlines', NULL, 'AA', 'AAL', NULL, NULL, 'active', '2026-05-24 07:40:32'),
(34, 44, 'DL', 'Delta Air Lines', NULL, 'DL', 'DAL', NULL, NULL, 'active', '2026-05-24 07:40:32'),
(35, 44, 'UA', 'United Airlines', NULL, 'UA', 'UAL', NULL, NULL, 'active', '2026-05-24 07:40:32'),
(36, 44, 'BA', 'British Airways', NULL, 'BA', 'BAW', NULL, NULL, 'active', '2026-05-24 07:40:32'),
(37, 44, 'EK', 'Emirates', NULL, 'EK', 'UAE', NULL, NULL, 'active', '2026-05-24 07:40:32'),
(38, 44, 'LH', 'Lufthansa', NULL, 'LH', 'DLH', NULL, NULL, 'active', '2026-05-24 07:40:32'),
(39, 44, 'AF', 'Air France', NULL, 'AF', 'AFR', NULL, NULL, 'active', '2026-05-24 07:40:32'),
(40, 44, 'SQ', 'Singapore Airlines', NULL, 'SQ', 'SIA', NULL, NULL, 'active', '2026-05-24 07:40:32');

-- --------------------------------------------------------

--
-- Table structure for table `ai_conversations`
--

CREATE TABLE `ai_conversations` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `model` varchar(50) DEFAULT 'gpt-4',
  `status` enum('active','archived') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `ai_conversations`
--

INSERT INTO `ai_conversations` (`id`, `tenant_id`, `user_id`, `title`, `model`, `status`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 'Revenue Forecast Analysis', 'gpt-4', 'active', '2026-05-11 10:23:07', '2026-05-11 10:23:07'),
(2, 1, 2, 'Expense Anomaly Detection', 'gpt-4', 'active', '2026-05-11 10:23:07', '2026-05-11 10:23:07'),
(3, 1, 3, 'Journal Entry Help', 'gpt-4', 'archived', '2026-05-11 10:23:07', '2026-05-11 10:23:07'),
(4, 1, 22, 'psb', 'gpt-4', 'active', '2026-05-18 15:55:27', '2026-05-18 15:55:27');

-- --------------------------------------------------------

--
-- Table structure for table `ai_messages`
--

CREATE TABLE `ai_messages` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `conversation_id` bigint(20) UNSIGNED NOT NULL,
  `role` enum('user','assistant','system') NOT NULL,
  `content` text NOT NULL,
  `tokens_used` int(11) DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `ai_messages`
--

INSERT INTO `ai_messages` (`id`, `conversation_id`, `role`, `content`, `tokens_used`, `metadata`, `created_at`) VALUES
(1, 1, 'user', 'What is our projected revenue for Q3 2026?', 15, NULL, '2026-05-11 10:23:07'),
(2, 1, 'assistant', 'Based on current booking trends and historical data, your projected Q3 2026 revenue is approximately $185,000. This represents a 23% increase over Q2. Key drivers include increased corporate bookings and premium cabin upgrades.', 56, NULL, '2026-05-11 10:23:07'),
(3, 1, 'user', 'Show me the breakdown by customer segment', 12, NULL, '2026-05-11 10:23:07'),
(4, 1, 'assistant', 'VIP Corporate: $95,000 (51%)\nRegular Corporate: $52,000 (28%)\nIndividual Premium: $28,000 (15%)\nStandard Individual: $10,000 (5%)\n\nVIP segment shows strongest growth at 35% YoY.', 89, NULL, '2026-05-11 10:23:07'),
(5, 2, 'user', 'Are there any unusual expense patterns this month?', 12, NULL, '2026-05-11 10:23:07'),
(6, 2, 'assistant', 'Equipment expense ($4,500) is 300% above monthly average. Travel expense ($2,800) for IATA conference is 180% above typical. Overall variance is within acceptable range (+12% vs budget).', 78, NULL, '2026-05-11 10:23:07'),
(7, 3, 'user', 'How do I record a ticket refund in the journal?', 13, NULL, '2026-05-11 10:23:07'),
(8, 3, 'assistant', '1. Reverse original revenue: Debit Ticket Revenue, Credit AR. 2. Record penalties: Debit Penalty Expense. 3. Update refund reserve wallet.', 92, NULL, '2026-05-11 10:23:07');

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED DEFAULT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` varchar(50) DEFAULT NULL,
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_values`)),
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_values`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` bigint(20) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `tenant_id`, `user_id`, `action`, `entity_type`, `entity_id`, `old_values`, `new_values`, `ip_address`, `user_agent`, `metadata`, `created_at`, `deleted_at`, `deleted_by`) VALUES
(1, 1, 1, 'login', 'user', '1', NULL, NULL, '192.168.1.1', NULL, NULL, '2026-05-11 10:23:07', NULL, NULL),
(2, 1, 4, 'ticket_created', 'ticket', '10', NULL, '{\"ticketNumber\":\"TKT-2026-010\",\"amount\":\"4320.00\"}', '192.168.1.45', NULL, NULL, '2026-05-11 10:23:07', NULL, NULL),
(3, 1, 3, 'journal_posted', 'journal_entry', '5', NULL, '{\"entryNumber\":\"JE-2026-005\",\"amount\":\"1500.00\"}', '192.168.1.23', NULL, NULL, '2026-05-11 10:23:07', NULL, NULL),
(4, 1, 2, 'wallet_transfer', 'wallet', '2', NULL, '{\"balance\":\"45000.00\"}', '192.168.1.67', NULL, NULL, '2026-05-11 10:23:07', NULL, NULL),
(5, 1, 1, 'role_updated', 'role', '3', NULL, '{\"permissions\":[\"accounting:*\",\"wallet:*\"]}', '192.168.1.1', NULL, NULL, '2026-05-11 10:23:07', NULL, NULL),
(6, 7, 12, 'transfer', 'wallet', '17', NULL, '{\"fromWalletId\":17,\"toWalletId\":18,\"amount\":\"100\"}', NULL, NULL, NULL, '2026-05-16 18:27:35', NULL, NULL),
(44, 1, 1, 'reject', 'ticket', '23', '{\"status\":\"pending\"}', '{\"status\":\"cancelled\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-17 06:03:42', NULL, NULL),
(47, 1, 1, 'create', 'ticket', '48', NULL, '{\"ticketNumber\":\"12\",\"status\":\"pending\",\"amount\":\"500\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-17 06:30:40', NULL, NULL),
(48, 1, 1, 'approve', 'ticket', '48', '{\"status\":\"pending\"}', '{\"status\":\"confirmed\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-17 06:30:45', NULL, NULL),
(49, 1, 1, 'supplier_created', 'supplier', '1', NULL, '{\"companyName\":\"test\",\"tradeName\":\"test1\",\"supplierType\":\"airline\",\"taxId\":\"1234\",\"email\":\"test@test.com\",\"phone\":\"0789101112\",\"address\":\"test@test.com\",\"city\":\"mazar i sharif\",\"country\":\"Afghanistan\",\"website\":\"www.psb-erp.com\",\"creditLimit\":20000,\"paymentTerms\":30,\"currency\":\"USD\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-17 06:40:33', NULL, NULL),
(50, 1, 1, 'bank_statement_created', 'bank_statement', '1', NULL, NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-17 06:43:56', NULL, NULL),
(55, 1, 1, 'create', 'ticket', '50', NULL, '{\"ticketNumber\":\"2020\",\"status\":\"pending\",\"amount\":\"0\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-17 07:29:35', NULL, NULL),
(56, 1, 1, 'approve', 'ticket', '50', '{\"status\":\"pending\"}', '{\"status\":\"confirmed\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-17 07:30:20', NULL, NULL),
(57, 1, 1, 'create', 'deposit', '1', NULL, '{\"depositCode\":\"MZR-2026-000004\",\"amount\":\"1000\",\"paymentMethod\":\"cash\",\"status\":\"pending\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-17 07:31:32', NULL, NULL),
(58, 1, 1, 'approve', 'deposit', '1', '{\"status\":\"pending\"}', '{\"status\":\"approved\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-17 07:31:36', NULL, NULL),
(59, 1, 1, 'bill_created', 'bill', '1', NULL, '{\"billNumber\":\"BILL-2026-00001\",\"totalAmount\":120000,\"supplierId\":1}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-17 07:33:14', NULL, NULL),
(60, 1, 1, 'create', 'ticket', '51', NULL, '{\"ticketNumber\":\"333\",\"status\":\"pending\",\"amount\":\"0\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-17 07:37:56', NULL, NULL),
(61, 1, 1, 'approve', 'ticket', '51', '{\"status\":\"pending\"}', '{\"status\":\"confirmed\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-17 07:38:00', NULL, NULL),
(64, 1, 1, 'create', 'ticket', '53', NULL, '{\"ticketNumber\":\"tt-tt\",\"status\":\"pending\",\"amount\":\"250\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-17 08:04:59', NULL, NULL),
(65, 1, 1, 'approve', 'ticket', '53', '{\"status\":\"pending\"}', '{\"status\":\"confirmed\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-17 08:05:13', NULL, NULL),
(66, 1, 1, 'approve', 'ticket', '19', '{\"status\":\"pending\"}', '{\"status\":\"confirmed\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-17 08:16:08', NULL, NULL),
(67, 1, 22, 'create', 'ticket', '54', NULL, '{\"ticketNumber\":\"no2233\",\"status\":\"pending\",\"amount\":\"380\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-18 10:12:59', NULL, NULL),
(68, 1, 22, 'approve', 'ticket', '54', '{\"status\":\"pending\"}', '{\"status\":\"confirmed\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-18 10:13:04', NULL, NULL),
(69, 1, 22, 'refund', 'ticket', '54', '{\"status\":\"confirmed\",\"totalAmount\":\"380.00\"}', '{\"status\":\"refunded\",\"refundAmount\":\"300.00\",\"penaltyAmount\":\"80\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-18 10:13:43', NULL, NULL),
(70, 1, 22, 'approve_registration', 'tenant', '40', NULL, '{\"status\":\"active\",\"expiresAt\":\"2026-06-19T10:26:06.140Z\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-19 10:26:06', NULL, NULL),
(71, 1, 22, 'approve_registration', 'tenant', '41', NULL, '{\"status\":\"active\",\"expiresAt\":\"2026-06-19T11:41:53.340Z\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-19 11:41:53', NULL, NULL),
(72, 1, 22, 'create', 'ticket', '55', NULL, '{\"ticketNumber\":\"tkt-2026-test\",\"status\":\"pending\",\"amount\":\"800\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-22 13:34:33', NULL, NULL),
(73, 41, 47, 'create', 'deposit', '2', NULL, '{\"depositCode\":\"MZR-2026-000001\",\"amount\":\"50000\",\"paymentMethod\":\"cash\",\"status\":\"pending\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-22 14:10:59', NULL, NULL),
(74, 41, 47, 'create', 'ticket', '56', NULL, '{\"ticketNumber\":\"tkt-123\",\"status\":\"pending\",\"amount\":\"400\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', NULL, '2026-05-22 16:43:06', NULL, NULL),
(75, 41, 47, 'create', 'ticket', '57', NULL, '{\"ticketNumber\":\"hhh\",\"status\":\"pending\",\"amount\":\"7000\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', NULL, '2026-05-22 17:23:57', NULL, NULL),
(76, 1, 1, 'approve_registration', 'tenant', '42', NULL, '{\"status\":\"active\",\"expiresAt\":\"2026-06-22T17:27:46.566Z\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', NULL, '2026-05-22 17:27:46', NULL, NULL),
(77, 1, 22, 'approve_registration', 'tenant', '43', NULL, '{\"status\":\"active\",\"expiresAt\":\"2026-06-23T15:23:56.026Z\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-23 15:23:56', NULL, NULL),
(78, 1, 22, 'approve', 'ticket', '55', '{\"status\":\"pending\"}', '{\"status\":\"confirmed\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-23 15:24:06', NULL, NULL),
(79, 1, 22, 'create', 'ticket', '58', NULL, '{\"ticketNumber\":\"jj-123\",\"status\":\"pending\",\"amount\":\"900\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-23 15:25:19', NULL, NULL),
(80, 1, 22, 'approve', 'ticket', '58', '{\"status\":\"pending\"}', '{\"status\":\"confirmed\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-23 15:25:22', NULL, NULL),
(81, 43, 49, 'create', 'ticket', '59', NULL, '{\"ticketNumber\":\"8989\",\"status\":\"pending\",\"amount\":\"900\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-23 15:29:26', NULL, NULL),
(82, 43, 49, 'create', 'ticket', '60', NULL, '{\"ticketNumber\":\"tt\",\"status\":\"pending\",\"amount\":\"100\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-23 15:36:47', NULL, NULL),
(83, 43, 49, 'approve', 'ticket', '60', '{\"status\":\"pending\"}', '{\"status\":\"confirmed\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-23 15:36:49', NULL, NULL),
(84, 43, 49, 'create', 'ticket', '61', NULL, '{\"ticketNumber\":\"kjk\",\"status\":\"pending\",\"amount\":\"800\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-23 15:39:25', NULL, NULL),
(85, 43, 49, 'approve', 'ticket', '61', '{\"status\":\"pending\"}', '{\"status\":\"confirmed\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-23 15:39:27', NULL, NULL),
(86, 1, 1, 'approve_registration', 'tenant', '44', NULL, '{\"status\":\"active\",\"expiresAt\":\"2026-06-24T07:40:32.291Z\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-24 07:40:32', NULL, NULL),
(87, 44, 50, 'create', 'ticket', '62', NULL, '{\"ticketNumber\":\"jfk-123\",\"status\":\"pending\",\"amount\":\"1500\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-24 07:43:16', NULL, NULL),
(88, 44, 50, 'approve', 'ticket', '62', '{\"status\":\"pending\"}', '{\"status\":\"confirmed\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-24 07:43:19', NULL, NULL),
(89, 44, 50, 'create', 'deposit', '3', NULL, '{\"depositCode\":\"MZR-2026-000001\",\"amount\":\"500\",\"paymentMethod\":\"cash\",\"status\":\"pending\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-24 07:45:20', NULL, NULL),
(90, 44, 50, 'approve', 'deposit', '3', '{\"status\":\"pending\"}', '{\"status\":\"approved\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-24 07:45:23', NULL, NULL),
(91, 44, 50, 'supplier_created', 'supplier', '2', NULL, '{\"companyName\":\"tomorrow tour\",\"supplierType\":\"airline\",\"taxId\":\"78654\",\"email\":\"test@test.com\",\"phone\":\"123456789\",\"address\":\"herat\",\"city\":\"jebrail\",\"country\":\"afghanistan\",\"creditLimit\":5000,\"paymentTerms\":30,\"currency\":\"USD\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-24 07:48:18', NULL, NULL),
(92, 44, 50, 'bill_created', 'bill', '2', NULL, '{\"billNumber\":\"BILL-2026-00001\",\"totalAmount\":1005,\"supplierId\":2}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-24 07:50:01', NULL, NULL),
(93, 44, 50, 'bank_statement_created', 'bank_statement', '2', NULL, NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-24 07:50:56', NULL, NULL),
(94, 44, 50, 'create', 'expense', '13', NULL, '{\"title\":\"iii\",\"amount\":\"100\",\"status\":\"pending\"}', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', NULL, '2026-05-24 11:12:48', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `bank_statements`
--

CREATE TABLE `bank_statements` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `account_id` bigint(20) UNSIGNED NOT NULL,
  `statement_date` date NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `opening_balance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `closing_balance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `file_url` text DEFAULT NULL,
  `status` enum('pending','processing','partial','reconciled') NOT NULL DEFAULT 'pending',
  `total_debits` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_credits` decimal(15,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bank_statements`
--

INSERT INTO `bank_statements` (`id`, `tenant_id`, `account_id`, `statement_date`, `start_date`, `end_date`, `opening_balance`, `closing_balance`, `file_url`, `status`, `total_debits`, `total_credits`, `notes`, `created_by`, `created_at`) VALUES
(1, 1, 2, '2026-05-17', '2026-05-17', '2026-05-27', 1000.00, 100.00, NULL, 'reconciled', 0.00, 0.00, 'test', NULL, '2026-05-17 06:43:56'),
(2, 44, 184, '2026-05-24', '2026-05-24', '2026-05-31', 100.00, 500.00, NULL, 'reconciled', 0.00, 0.00, NULL, NULL, '2026-05-24 07:50:56');

-- --------------------------------------------------------

--
-- Table structure for table `bank_statement_lines`
--

CREATE TABLE `bank_statement_lines` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `statement_id` bigint(20) UNSIGNED NOT NULL,
  `transaction_date` date NOT NULL,
  `description` text DEFAULT NULL,
  `reference` varchar(100) DEFAULT NULL,
  `debit` decimal(15,2) NOT NULL DEFAULT 0.00,
  `credit` decimal(15,2) NOT NULL DEFAULT 0.00,
  `balance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `matched_journal_entry_id` bigint(20) UNSIGNED DEFAULT NULL,
  `matched_ledger_entry_id` bigint(20) UNSIGNED DEFAULT NULL,
  `match_confidence` decimal(5,2) DEFAULT 0.00,
  `status` enum('unmatched','matched','ignored') NOT NULL DEFAULT 'unmatched',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bills`
--

CREATE TABLE `bills` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `supplier_id` bigint(20) UNSIGNED NOT NULL,
  `bill_number` varchar(100) NOT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `issue_date` date NOT NULL,
  `due_date` date NOT NULL,
  `subtotal` decimal(15,2) NOT NULL,
  `tax_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `discount_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(15,2) NOT NULL,
  `amount_paid` decimal(15,2) NOT NULL DEFAULT 0.00,
  `balance_due` decimal(15,2) NOT NULL,
  `currency` varchar(3) DEFAULT 'USD',
  `description` text DEFAULT NULL,
  `status` enum('draft','open','partial','paid','overdue','cancelled') NOT NULL DEFAULT 'draft',
  `category` varchar(100) DEFAULT NULL,
  `journal_entry_id` bigint(20) UNSIGNED DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` bigint(20) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bills`
--

INSERT INTO `bills` (`id`, `tenant_id`, `supplier_id`, `bill_number`, `reference_number`, `issue_date`, `due_date`, `subtotal`, `tax_amount`, `discount_amount`, `total_amount`, `amount_paid`, `balance_due`, `currency`, `description`, `status`, `category`, `journal_entry_id`, `created_by`, `created_at`, `updated_at`, `deleted_at`, `deleted_by`) VALUES
(1, 1, 1, 'BILL-2026-00001', '2020', '2026-05-17', '2026-06-02', 120000.00, 0.00, 0.00, 120000.00, 0.00, 120000.00, 'USD', 'test', 'open', 'hotel', 56, NULL, '2026-05-17 07:33:14', '2026-05-17 03:03:14', NULL, NULL),
(2, 44, 2, 'BILL-2026-00001', 'ttp-123', '2026-05-24', '2026-05-20', 1000.00, 10.00, 5.00, 1005.00, 0.00, 1005.00, 'USD', 'tickets', 'open', 'flight', 71, NULL, '2026-05-24 07:50:01', '2026-05-24 03:20:01', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `bill_items`
--

CREATE TABLE `bill_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `bill_id` bigint(20) UNSIGNED NOT NULL,
  `description` varchar(255) NOT NULL,
  `quantity` decimal(10,2) NOT NULL DEFAULT 1.00,
  `unit_price` decimal(15,2) NOT NULL,
  `total` decimal(15,2) NOT NULL,
  `account_id` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bill_items`
--

INSERT INTO `bill_items` (`id`, `tenant_id`, `bill_id`, `description`, `quantity`, `unit_price`, `total`, `account_id`, `created_at`) VALUES
(1, 1, 1, 'ticket', 6.00, 20000.00, 120000.00, 155, '2026-05-17 07:33:14'),
(2, 44, 2, 'jjjj', 1.00, 1000.00, 1000.00, 195, '2026-05-24 07:50:01');

-- --------------------------------------------------------

--
-- Table structure for table `chart_of_accounts`
--

CREATE TABLE `chart_of_accounts` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` enum('asset','liability','equity','revenue','expense') NOT NULL,
  `subtype` varchar(50) DEFAULT NULL,
  `parent_id` bigint(20) UNSIGNED DEFAULT NULL,
  `description` text DEFAULT NULL,
  `is_bank_account` tinyint(1) NOT NULL DEFAULT 0,
  `bank_name` varchar(255) DEFAULT NULL,
  `account_number` varchar(100) DEFAULT NULL,
  `currency` varchar(3) NOT NULL DEFAULT 'USD',
  `current_balance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `chart_of_accounts`
--

INSERT INTO `chart_of_accounts` (`id`, `tenant_id`, `code`, `name`, `type`, `subtype`, `parent_id`, `description`, `is_bank_account`, `bank_name`, `account_number`, `currency`, `current_balance`, `status`, `created_at`) VALUES
(1, 1, '1000', 'Cash on Hand', 'asset', 'current_asset', NULL, NULL, 0, NULL, NULL, 'USD', 15450.00, 'active', '2026-05-11 10:23:07'),
(2, 1, '1100', 'Bank Account - Main', 'asset', 'current_asset', NULL, NULL, 1, 'Chase Bank', '****4567', 'USD', 125000.00, 'active', '2026-05-11 10:23:07'),
(3, 1, '1200', 'Accounts Receivable', 'asset', 'current_asset', NULL, NULL, 0, NULL, NULL, 'USD', 45080.00, 'active', '2026-05-11 10:23:07'),
(4, 1, '1300', 'Commission Receivable', 'asset', 'current_asset', NULL, NULL, 0, NULL, NULL, 'USD', 2800.00, 'active', '2026-05-11 10:23:07'),
(5, 1, '2000', 'Accounts Payable', 'liability', 'current_liability', NULL, NULL, 0, NULL, NULL, 'USD', -120000.00, 'active', '2026-05-11 10:23:07'),
(6, 1, '2100', 'Customer Deposits', 'liability', 'current_liability', NULL, NULL, 0, NULL, NULL, 'USD', 77000.00, 'active', '2026-05-11 10:23:07'),
(7, 1, '3000', 'Owner Equity', 'equity', NULL, NULL, NULL, 0, NULL, NULL, 'USD', 65000.00, 'active', '2026-05-11 10:23:07'),
(8, 1, '3100', 'Retained Earnings', 'equity', NULL, NULL, NULL, 0, NULL, NULL, 'USD', 123800.00, 'active', '2026-05-11 10:23:07'),
(9, 1, '4000', 'Ticket Revenue', 'revenue', NULL, NULL, NULL, 0, NULL, NULL, 'USD', -4450.00, 'active', '2026-05-11 10:23:07'),
(10, 1, '4100', 'Commission Revenue', 'revenue', NULL, NULL, NULL, 0, NULL, NULL, 'USD', -9.00, 'active', '2026-05-11 10:23:07'),
(11, 1, '5000', 'Office Expenses', 'expense', NULL, NULL, NULL, 0, NULL, NULL, 'USD', 9.00, 'active', '2026-05-11 10:23:07'),
(12, 1, '5100', 'Travel Expenses', 'expense', NULL, NULL, NULL, 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-11 10:23:07'),
(13, 1, '5200', 'Software Expenses', 'expense', NULL, NULL, NULL, 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-11 10:23:07'),
(14, 1, '5300', 'Marketing Expenses', 'expense', NULL, NULL, NULL, 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-11 10:23:07'),
(15, 1, '5400', 'Professional Services', 'expense', NULL, NULL, NULL, 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-11 10:23:07'),
(16, 1, '2020', 'Elham', 'expense', '', NULL, 'hi', 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-12 09:52:33'),
(17, 1, '4001', 'Ticket Sales Revenue', 'revenue', 'sales', NULL, NULL, 0, NULL, NULL, 'USD', -5000.00, 'active', '2026-05-12 12:46:54'),
(108, 1, '0007', 'test', 'revenue', '', NULL, 'test', 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-17 02:53:03'),
(109, 1, '0909', 'test', 'revenue', '', NULL, 'test', 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-17 02:55:23'),
(155, 1, '5110', 'Hotel Expense', 'expense', NULL, NULL, NULL, 0, NULL, NULL, 'USD', 120000.00, 'active', '2026-05-17 07:33:14'),
(161, 1, '4200', 'Penalty Revenue', 'revenue', NULL, NULL, NULL, 0, NULL, NULL, 'USD', -80.00, 'active', '2026-05-18 10:13:42'),
(162, 41, '122', '121', 'asset', '', NULL, '', 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-22 14:14:23'),
(163, 41, '1000', 'Cash Account', 'asset', NULL, NULL, NULL, 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-22 15:03:43'),
(164, 41, '4000', 'Ticket Revenue', 'revenue', NULL, NULL, NULL, 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-22 15:03:43'),
(165, 43, '1000', 'Cash on Hand', 'asset', 'current_asset', NULL, NULL, 0, NULL, NULL, 'USD', 100.00, 'active', '2026-05-23 15:23:56'),
(166, 43, '1100', 'Bank Account - Main', 'asset', 'current_asset', NULL, NULL, 1, NULL, NULL, 'USD', 0.00, 'active', '2026-05-23 15:23:56'),
(167, 43, '1200', 'Accounts Receivable', 'asset', 'current_asset', NULL, NULL, 0, NULL, NULL, 'USD', 800.00, 'active', '2026-05-23 15:23:56'),
(168, 43, '1300', 'Commission Receivable', 'asset', 'current_asset', NULL, NULL, 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-23 15:23:56'),
(169, 43, '2000', 'Accounts Payable', 'liability', 'current_liability', NULL, NULL, 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-23 15:23:56'),
(170, 43, '2100', 'Customer Deposits', 'liability', 'current_liability', NULL, NULL, 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-23 15:23:56'),
(171, 43, '3000', 'Owner Equity', 'equity', NULL, NULL, NULL, 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-23 15:23:56'),
(172, 43, '3100', 'Retained Earnings', 'equity', NULL, NULL, NULL, 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-23 15:23:56'),
(173, 43, '4000', 'Ticket Revenue', 'revenue', NULL, NULL, NULL, 0, NULL, NULL, 'USD', -900.00, 'active', '2026-05-23 15:23:56'),
(174, 43, '4100', 'Commission Revenue', 'revenue', NULL, NULL, NULL, 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-23 15:23:56'),
(175, 43, '4200', 'Penalty Revenue', 'revenue', NULL, NULL, NULL, 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-23 15:23:56'),
(176, 43, '5000', 'Office Expenses', 'expense', NULL, NULL, NULL, 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-23 15:23:56'),
(177, 43, '5100', 'Travel Expenses', 'expense', NULL, NULL, NULL, 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-23 15:23:56'),
(178, 43, '5200', 'Software Expenses', 'expense', NULL, NULL, NULL, 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-23 15:23:56'),
(179, 43, '5300', 'Marketing Expenses', 'expense', NULL, NULL, NULL, 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-23 15:23:56'),
(180, 43, '5400', 'Professional Services', 'expense', NULL, NULL, NULL, 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-23 15:23:56'),
(181, 43, '0101', 'petty cash', 'revenue', '', NULL, '', 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-23 15:31:51'),
(182, 43, '1001', 'test', 'asset', '', NULL, '', 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-24 07:37:10'),
(183, 44, '1000', 'Cash on Hand', 'asset', 'current_asset', NULL, NULL, 0, NULL, NULL, 'USD', 2000.00, 'active', '2026-05-24 07:40:32'),
(184, 44, '1100', 'Bank Account - Main', 'asset', 'current_asset', NULL, NULL, 1, NULL, NULL, 'USD', 0.00, 'active', '2026-05-24 07:40:32'),
(185, 44, '1200', 'Accounts Receivable', 'asset', 'current_asset', NULL, NULL, 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-24 07:40:32'),
(186, 44, '1300', 'Commission Receivable', 'asset', 'current_asset', NULL, NULL, 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-24 07:40:32'),
(187, 44, '2000', 'Accounts Payable', 'liability', 'current_liability', NULL, NULL, 0, NULL, NULL, 'USD', -1005.00, 'active', '2026-05-24 07:40:32'),
(188, 44, '2100', 'Customer Deposits', 'liability', 'current_liability', NULL, NULL, 0, NULL, NULL, 'USD', -500.00, 'active', '2026-05-24 07:40:32'),
(189, 44, '3000', 'Owner Equity', 'equity', NULL, NULL, NULL, 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-24 07:40:32'),
(190, 44, '3100', 'Retained Earnings', 'equity', NULL, NULL, NULL, 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-24 07:40:32'),
(191, 44, '4000', 'Ticket Revenue', 'revenue', NULL, NULL, NULL, 0, NULL, NULL, 'USD', -1500.00, 'active', '2026-05-24 07:40:32'),
(192, 44, '4100', 'Commission Revenue', 'revenue', NULL, NULL, NULL, 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-24 07:40:32'),
(193, 44, '4200', 'Penalty Revenue', 'revenue', NULL, NULL, NULL, 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-24 07:40:32'),
(194, 44, '5000', 'Office Expenses', 'expense', NULL, NULL, NULL, 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-24 07:40:32'),
(195, 44, '5100', 'Travel Expenses', 'expense', NULL, NULL, NULL, 0, NULL, NULL, 'USD', 1005.00, 'active', '2026-05-24 07:40:32'),
(196, 44, '5200', 'Software Expenses', 'expense', NULL, NULL, NULL, 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-24 07:40:32'),
(197, 44, '5300', 'Marketing Expenses', 'expense', NULL, NULL, NULL, 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-24 07:40:32'),
(198, 44, '5400', 'Professional Services', 'expense', NULL, NULL, NULL, 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-24 07:40:32'),
(199, 44, '88', 'jhj', 'asset', '', NULL, '', 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-24 07:53:17'),
(200, 44, '0101', 'elham', 'expense', '', NULL, 'hi', 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-24 07:53:57'),
(201, 44, '0102', 'test', 'revenue', '', NULL, 'test2026', 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-24 08:30:15'),
(202, 44, '10', 'ddd', 'asset', '', NULL, 'elham', 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-24 08:32:19'),
(203, 44, '0303', 'TEST', 'asset', '', NULL, 'test by test', 0, NULL, NULL, 'USD', 0.00, 'active', '2026-05-24 09:26:17');

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `customer_code` varchar(50) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(320) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `alternate_phone` varchar(50) DEFAULT NULL,
  `company` varchar(255) DEFAULT NULL,
  `job_title` varchar(100) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `customer_type` enum('individual','corporate','agent') NOT NULL DEFAULT 'individual',
  `status` enum('active','inactive','blacklisted','vip') NOT NULL DEFAULT 'active',
  `source` varchar(50) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `total_bookings` int(11) NOT NULL DEFAULT 0,
  `total_revenue` decimal(12,2) NOT NULL DEFAULT 0.00,
  `last_booking_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `assigned_to` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`id`, `tenant_id`, `customer_code`, `first_name`, `last_name`, `email`, `phone`, `alternate_phone`, `company`, `job_title`, `address`, `city`, `country`, `postal_code`, `customer_type`, `status`, `source`, `notes`, `total_bookings`, `total_revenue`, `last_booking_date`, `assigned_to`, `created_at`, `updated_at`, `deleted_at`, `deleted_by`) VALUES
(1, 1, 'CUST-001', 'John', 'Smith', 'john.smith@techcorp.com', '+1-555-1001', NULL, 'TechCorp Inc.', 'CTO', NULL, NULL, NULL, NULL, 'corporate', 'vip', NULL, NULL, 24, 48500.00, '2026-04-14 19:30:00', 4, '2026-05-11 10:23:06', '2026-05-11 10:23:06', NULL, NULL),
(2, 1, 'CUST-002', 'Maria', 'Garcia', 'maria.g@globalmedia.com', '+1-555-1002', NULL, 'Global Media', 'Director', NULL, NULL, NULL, NULL, 'corporate', 'active', NULL, NULL, 15, 32000.00, '2026-04-19 19:30:00', 4, '2026-05-11 10:23:06', '2026-05-11 10:23:06', NULL, NULL),
(3, 1, 'CUST-003', 'Robert', 'Anderson', 'robert.a@gmail.com', '+1-555-1003', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'individual', 'active', NULL, NULL, 8, 12500.00, '2026-03-27 19:30:00', 5, '2026-05-11 10:23:06', '2026-05-11 10:23:06', NULL, NULL),
(4, 1, 'CUST-004', 'Lisa', 'Wang', 'lisa.wang@pharma.co', '+1-555-1004', NULL, 'Pharma Solutions', 'VP Sales', NULL, NULL, NULL, NULL, 'corporate', 'vip', NULL, NULL, 32, 67800.00, '2026-04-30 19:30:00', 4, '2026-05-11 10:23:06', '2026-05-11 10:23:06', NULL, NULL),
(5, 1, 'CUST-005', 'Michael', 'Brown', 'm.brown@consulting.com', '+1-555-1005', NULL, 'Brown Consulting', 'Principal', NULL, NULL, NULL, NULL, 'corporate', 'active', NULL, NULL, 12, 28900.00, '2026-04-09 19:30:00', 5, '2026-05-11 10:23:06', '2026-05-11 10:23:06', NULL, NULL),
(6, 1, 'CUST-006', 'Jennifer', 'Lee', 'jlee@fashionbrand.com', '+1-555-1006', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'individual', 'active', NULL, NULL, 5, 8900.00, '2026-02-14 19:30:00', 4, '2026-05-11 10:23:06', '2026-05-11 10:23:06', NULL, NULL),
(7, 1, 'CUST-007', 'William', 'Davis', 'w.davis@finance.com', '+1-555-1007', NULL, 'Finance Group', 'CFO', NULL, NULL, NULL, NULL, 'corporate', 'active', NULL, NULL, 18, 41200.00, '2026-04-21 19:30:00', 5, '2026-05-11 10:23:06', '2026-05-11 10:23:06', NULL, NULL),
(8, 1, 'CUST-008', 'Amanda', 'Wilson', 'amanda.w@retailchain.com', '+1-555-1008', NULL, 'Retail Chain Co', 'Operations Manager', NULL, NULL, NULL, NULL, 'corporate', 'active', NULL, NULL, 9, 15600.00, '2026-03-29 19:30:00', 4, '2026-05-11 10:23:06', '2026-05-11 10:23:06', NULL, NULL),
(9, 1, 'CUST-MP2G6EAA', 'Elham', 'Mukhtari', 'elhammukhtari12345@gmail.com', '07818398969', NULL, 'Elhamuddin Mukhtari', NULL, NULL, NULL, NULL, NULL, 'individual', 'active', NULL, '', 1, 0.00, '2026-05-18 10:13:43', NULL, '2026-05-12 09:47:53', '2026-05-18 05:43:43', NULL, NULL),
(28, 1, 'CUST-MP95YCH9', 'test', 'test1', 'test@PSB-ERP.com', '782636327', NULL, 'PSB', NULL, NULL, NULL, NULL, NULL, 'individual', 'active', NULL, 'TEST', 1, 500.00, '2026-05-17 02:00:45', NULL, '2026-05-17 02:36:04', '2026-05-17 02:00:45', NULL, NULL),
(39, 41, 'CUST-MPGZY86K', 'hhh', 'kkj', 'elhammukhtari12345@gmail.com', '0782636327', NULL, '', NULL, NULL, NULL, NULL, NULL, 'individual', 'active', NULL, '', 0, 0.00, '2026-05-22 14:10:10', NULL, '2026-05-22 14:10:10', '2026-05-22 14:10:10', NULL, NULL),
(40, 43, 'CUST-MPIII9QN', 'john', 'doe', 'test@test.com', '0789123456', NULL, 'Elhamuddin Mukhtari', NULL, NULL, NULL, NULL, NULL, 'individual', 'active', NULL, '', 1, 800.00, '2026-05-23 11:09:27', NULL, '2026-05-23 15:37:25', '2026-05-23 11:09:27', NULL, NULL),
(41, 44, 'CUST-MPJH15E7', 'elham', 'mukhtari', 'elhammukhtari123456@gmail.com', '0782636327', NULL, 'mukhtari tour', NULL, NULL, NULL, NULL, NULL, 'individual', 'active', NULL, '', 0, 0.00, '2026-05-24 07:43:52', NULL, '2026-05-24 07:43:52', '2026-05-24 07:43:52', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `customer_transactions`
--

CREATE TABLE `customer_transactions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `customer_id` bigint(20) UNSIGNED NOT NULL,
  `ticket_id` bigint(20) UNSIGNED DEFAULT NULL,
  `invoice_id` bigint(20) UNSIGNED DEFAULT NULL,
  `type` enum('receivable','payment','deposit','credit','refund','adjustment') NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `balance` decimal(15,2) NOT NULL,
  `description` text DEFAULT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `customer_transactions`
--

INSERT INTO `customer_transactions` (`id`, `tenant_id`, `customer_id`, `ticket_id`, `invoice_id`, `type`, `amount`, `balance`, `description`, `reference_number`, `created_by`, `created_at`) VALUES
(37, 1, 28, 48, 28, 'receivable', 500.00, 500.00, 'Ticket sale: 12', NULL, 1, '2026-05-17 06:30:45'),
(38, 1, 28, NULL, NULL, 'payment', 500.00, 0.00, 'Payment received (cash)', NULL, 1, '2026-05-17 06:32:06'),
(43, 1, 9, 50, 33, 'receivable', 0.00, 0.00, 'Ticket sale: 2020', NULL, 1, '2026-05-17 07:30:20'),
(44, 1, 9, NULL, NULL, 'deposit', 1000.00, 1000.00, 'Deposit MZR-2026-000004', 'MZR-2026-000004', 1, '2026-05-17 07:31:36'),
(47, 1, 9, 54, 36, 'receivable', 380.00, -620.00, 'Ticket sale: no2233', NULL, 22, '2026-05-18 10:13:04'),
(48, 1, 9, 54, NULL, 'refund', 300.00, 300.00, 'Ticket refund: no2233', NULL, 22, '2026-05-18 10:13:43'),
(49, 43, 40, 61, 37, 'receivable', 800.00, 800.00, 'Ticket sale: kjk', NULL, 49, '2026-05-23 15:39:27'),
(50, 44, 41, NULL, NULL, 'deposit', 500.00, 500.00, 'Deposit MZR-2026-000001', 'MZR-2026-000001', 50, '2026-05-24 07:45:22');

-- --------------------------------------------------------

--
-- Table structure for table `deposits`
--

CREATE TABLE `deposits` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `customer_id` bigint(20) UNSIGNED DEFAULT NULL,
  `wallet_id` bigint(20) UNSIGNED NOT NULL,
  `deposit_code` varchar(50) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `payment_method` enum('cash','bank_transfer','cheque') NOT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `location_id` bigint(20) UNSIGNED DEFAULT NULL,
  `proof_image_url` text DEFAULT NULL,
  `status` enum('pending','under_review','approved','rejected','expired') NOT NULL DEFAULT 'pending',
  `approved_by` bigint(20) UNSIGNED DEFAULT NULL,
  `approved_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `expires_at` timestamp NULL DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  `deleted_by` bigint(20) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `deposits`
--

INSERT INTO `deposits` (`id`, `tenant_id`, `customer_id`, `wallet_id`, `deposit_code`, `amount`, `payment_method`, `reference_number`, `location_id`, `proof_image_url`, `status`, `approved_by`, `approved_at`, `expires_at`, `notes`, `created_by`, `created_at`, `updated_at`, `deleted_at`, `deleted_by`) VALUES
(1, 1, 9, 11, 'MZR-2026-000004', 1000.00, 'cash', NULL, 1, NULL, 'approved', 1, '2026-05-17 03:01:36', NULL, NULL, 1, '2026-05-17 07:31:32', '2026-05-17 03:01:36', NULL, NULL),
(2, 41, 39, 72, 'MZR-2026-000001', 50000.00, 'cash', NULL, NULL, NULL, 'pending', NULL, '2026-05-22 14:10:59', NULL, 'sdsd', 47, '2026-05-22 14:10:59', '2026-05-22 14:10:59', NULL, NULL),
(3, 44, 41, 81, 'MZR-2026-000001', 500.00, 'cash', 'pr123456789', NULL, NULL, 'approved', 50, '2026-05-24 03:15:22', NULL, NULL, 50, '2026-05-24 07:45:20', '2026-05-24 03:15:22', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `documents`
--

CREATE TABLE `documents` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `entity_type` enum('invoice','ticket','deposit','supplier_payment','expense','report','customer','other') NOT NULL,
  `entity_id` bigint(20) UNSIGNED NOT NULL,
  `document_type` enum('invoice','receipt','voucher','statement','report','attachment') NOT NULL,
  `document_number` varchar(100) DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_url` text DEFAULT NULL,
  `file_size` bigint(20) DEFAULT NULL,
  `mime_type` varchar(50) DEFAULT NULL,
  `status` enum('draft','generated','sent','archived') NOT NULL DEFAULT 'draft',
  `generated_by` bigint(20) UNSIGNED DEFAULT NULL,
  `generated_at` timestamp NULL DEFAULT NULL,
  `sent_at` timestamp NULL DEFAULT NULL,
  `sent_to` varchar(320) DEFAULT NULL,
  `metadata` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` bigint(20) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `document_sequences`
--

CREATE TABLE `document_sequences` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `prefix` varchar(20) NOT NULL,
  `year` int(11) NOT NULL,
  `last_number` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `document_sequences`
--

INSERT INTO `document_sequences` (`id`, `tenant_id`, `prefix`, `year`, `last_number`, `created_at`, `updated_at`) VALUES
(1, 25, 'INV', 2026, 1, '2026-05-17 05:49:40', '2026-05-17 05:49:40'),
(5, 1, 'INV', 2026, 3, '2026-05-17 06:30:45', '2026-05-18 05:43:04'),
(6, 1, 'MZR', 2026, 4, '2026-05-17 06:33:20', '2026-05-17 03:01:32'),
(7, 1, 'SUP', 2026, 1, '2026-05-17 06:40:33', '2026-05-17 06:40:33'),
(9, 1, 'BILL', 2026, 1, '2026-05-17 07:33:14', '2026-05-17 07:33:14'),
(11, 33, 'REG', 2026, 1, '2026-05-17 08:22:07', '2026-05-17 08:22:07'),
(12, 34, 'REG', 2026, 1, '2026-05-18 07:46:30', '2026-05-18 07:46:30'),
(13, 35, 'REG', 2026, 1, '2026-05-18 08:06:50', '2026-05-18 08:06:50'),
(14, 36, 'REG', 2026, 1, '2026-05-18 09:47:51', '2026-05-18 09:47:51'),
(15, 37, 'REG', 2026, 1, '2026-05-18 15:16:53', '2026-05-18 15:16:53'),
(16, 38, 'REG', 2026, 1, '2026-05-19 09:43:02', '2026-05-19 09:43:02'),
(17, 40, 'REG', 2026, 1, '2026-05-19 10:19:35', '2026-05-19 10:19:35'),
(18, 41, 'REG', 2026, 1, '2026-05-19 11:41:13', '2026-05-19 11:41:13'),
(19, 41, 'MZR', 2026, 1, '2026-05-22 14:10:59', '2026-05-22 14:10:59'),
(20, 42, 'REG', 2026, 1, '2026-05-22 17:26:35', '2026-05-22 17:26:35'),
(21, 43, 'REG', 2026, 1, '2026-05-23 15:22:09', '2026-05-23 15:22:09'),
(22, 43, 'INV', 2026, 1, '2026-05-23 15:39:27', '2026-05-23 15:39:27'),
(23, 44, 'REG', 2026, 1, '2026-05-24 07:40:09', '2026-05-24 07:40:09'),
(24, 44, 'MZR', 2026, 1, '2026-05-24 07:45:20', '2026-05-24 07:45:20'),
(25, 44, 'SUP', 2026, 1, '2026-05-24 07:48:18', '2026-05-24 07:48:18'),
(26, 44, 'BILL', 2026, 1, '2026-05-24 07:50:01', '2026-05-24 07:50:01');

-- --------------------------------------------------------

--
-- Table structure for table `exchange_rates`
--

CREATE TABLE `exchange_rates` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `from_currency` varchar(3) NOT NULL,
  `to_currency` varchar(3) NOT NULL,
  `rate` decimal(15,6) NOT NULL,
  `effective_date` date NOT NULL,
  `source` enum('manual','api','system') NOT NULL DEFAULT 'manual',
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `exchange_rates`
--

INSERT INTO `exchange_rates` (`id`, `tenant_id`, `from_currency`, `to_currency`, `rate`, `effective_date`, `source`, `created_by`, `created_at`) VALUES
(1, 1, 'USD', 'EUR', 76.000000, '2026-05-17', 'manual', NULL, '2026-05-17 06:42:58');

-- --------------------------------------------------------

--
-- Table structure for table `expenses`
--

CREATE TABLE `expenses` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `category_id` bigint(20) UNSIGNED DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL,
  `currency` varchar(3) NOT NULL DEFAULT 'USD',
  `expense_date` date NOT NULL,
  `payment_method` enum('cash','card','bank_transfer','cheque','wallet','other') NOT NULL DEFAULT 'cash',
  `vendor` varchar(255) DEFAULT NULL,
  `receipt_number` varchar(100) DEFAULT NULL,
  `receipt_image` text DEFAULT NULL,
  `status` enum('pending','approved','rejected','reimbursed') NOT NULL DEFAULT 'pending',
  `approved_by` bigint(20) UNSIGNED DEFAULT NULL,
  `submitted_by` bigint(20) UNSIGNED DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  `deleted_by` bigint(20) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `expenses`
--

INSERT INTO `expenses` (`id`, `tenant_id`, `category_id`, `title`, `description`, `amount`, `currency`, `expense_date`, `payment_method`, `vendor`, `receipt_number`, `receipt_image`, `status`, `approved_by`, `submitted_by`, `notes`, `metadata`, `created_at`, `updated_at`, `deleted_at`, `deleted_by`) VALUES
(1, 1, 1, 'Stationery bulk order', 'Q2 office supplies', 450.00, 'USD', '2026-04-01', 'card', 'Office Depot', 'REC-001', NULL, 'approved', 1, 3, NULL, NULL, '2026-05-11 10:23:07', '2026-05-11 10:23:07', NULL, NULL),
(2, 1, 2, 'IATA conference travel', 'Annual conference attendance', 2800.00, 'USD', '2026-04-05', 'bank_transfer', 'Marriott Hotels', 'REC-002', NULL, 'approved', 1, 2, NULL, NULL, '2026-05-11 10:23:07', '2026-05-11 10:23:07', NULL, NULL),
(3, 1, 3, 'CRM Software License', 'Annual CRM subscription', 3600.00, 'USD', '2026-04-10', 'card', 'Salesforce', 'REC-003', NULL, 'approved', 1, 3, NULL, NULL, '2026-05-11 10:23:07', '2026-05-11 10:23:07', NULL, NULL),
(4, 1, 4, 'Google Ads Campaign', 'Spring campaign', 1500.00, 'USD', '2026-04-12', 'card', 'Google', 'REC-004', NULL, 'approved', 2, 4, NULL, NULL, '2026-05-11 10:23:07', '2026-05-11 10:23:07', NULL, NULL),
(5, 1, 5, 'Office Internet', 'Monthly fiber connection', 250.00, 'USD', '2026-04-15', 'bank_transfer', 'AT&T', 'REC-005', NULL, 'approved', 1, 3, NULL, NULL, '2026-05-11 10:23:07', '2026-05-11 10:23:07', NULL, NULL),
(6, 1, 6, 'Legal consultation', 'Contract review services', 1200.00, 'USD', '2026-04-18', 'cheque', 'Lawson & Partners', 'REC-006', NULL, 'pending', NULL, 2, NULL, NULL, '2026-05-11 10:23:07', '2026-05-11 10:23:07', NULL, NULL),
(7, 1, 7, 'New laptops', '3x MacBook Pro for agents', 4500.00, 'USD', '2026-04-20', 'card', 'Apple Store', 'REC-007', NULL, 'approved', 1, 3, NULL, NULL, '2026-05-11 10:23:07', '2026-05-11 10:23:07', NULL, NULL),
(8, 1, 8, 'IATA certification course', 'Training for 2 agents', 1800.00, 'USD', '2026-04-22', 'bank_transfer', 'IATA Training', 'REC-008', NULL, 'pending', NULL, 2, NULL, NULL, '2026-05-11 10:23:07', '2026-05-11 10:23:07', NULL, NULL),
(9, 1, 1, 'food', '', 500.00, 'USD', '2026-05-12', 'card', '', '', NULL, 'pending', NULL, 1, '', NULL, '2026-05-12 09:50:42', '2026-05-12 09:50:42', NULL, NULL),
(10, 1, 1, 'laptop', '', 25000.00, 'USD', '2026-05-13', 'cash', 'Elham', '', NULL, 'pending', NULL, 1, '', NULL, '2026-05-13 11:00:16', '2026-05-13 11:00:16', NULL, NULL),
(11, 1, 1, 'Debug Minimal Insert', NULL, 100.50, 'USD', '2026-05-24', 'card', NULL, NULL, NULL, 'pending', NULL, 1, NULL, NULL, '2026-05-24 10:04:09', '2026-05-24 10:04:09', NULL, NULL),
(12, 1, 1, 'Debug Drizzle Insert', NULL, 100.50, 'USD', '2026-05-24', 'card', NULL, NULL, NULL, 'pending', NULL, 1, NULL, NULL, '2026-05-24 10:44:16', '2026-05-24 10:44:16', NULL, NULL),
(13, 44, 23, 'iii', '', 100.00, 'USD', '2026-05-24', 'card', '', '', NULL, 'pending', NULL, 50, '', '\"{}\"', '2026-05-24 06:42:48', '2026-05-24 06:42:48', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `expense_categories`
--

CREATE TABLE `expense_categories` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `color` varchar(20) DEFAULT '#6366f1',
  `icon` varchar(50) DEFAULT NULL,
  `parent_id` bigint(20) UNSIGNED DEFAULT NULL,
  `is_system` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `expense_categories`
--

INSERT INTO `expense_categories` (`id`, `tenant_id`, `name`, `description`, `color`, `icon`, `parent_id`, `is_system`, `created_at`) VALUES
(1, 1, 'Office Supplies', 'General office materials', '#3b82f6', 'package', NULL, 0, '2026-05-11 10:23:07'),
(2, 1, 'Travel & Accommodation', 'Staff travel and hotels', '#f59e0b', 'plane', NULL, 0, '2026-05-11 10:23:07'),
(3, 1, 'Software & Subscriptions', 'SaaS and software licenses', '#10b981', 'monitor', NULL, 0, '2026-05-11 10:23:07'),
(4, 1, 'Marketing & Advertising', 'Promotional activities', '#ef4444', 'megaphone', NULL, 0, '2026-05-11 10:23:07'),
(5, 1, 'Utilities', 'Electricity, internet, phone', '#8b5cf6', 'zap', NULL, 0, '2026-05-11 10:23:07'),
(6, 1, 'Professional Services', 'Legal, accounting, consulting', '#ec4899', 'briefcase', NULL, 0, '2026-05-11 10:23:07'),
(7, 1, 'Equipment', 'Hardware and equipment', '#06b6d4', 'cpu', NULL, 0, '2026-05-11 10:23:07'),
(8, 1, 'Training & Development', 'Staff education and courses', '#84cc16', 'graduation-cap', NULL, 0, '2026-05-11 10:23:07'),
(9, 43, 'Office Supplies', 'General office materials', '#3b82f6', 'package', NULL, 0, '2026-05-23 15:23:56'),
(10, 43, 'Travel & Accommodation', 'Staff travel and hotels', '#f59e0b', 'plane', NULL, 0, '2026-05-23 15:23:56'),
(11, 43, 'Software & Subscriptions', 'SaaS and software licenses', '#10b981', 'monitor', NULL, 0, '2026-05-23 15:23:56'),
(12, 43, 'Marketing & Advertising', 'Promotional activities', '#ef4444', 'megaphone', NULL, 0, '2026-05-23 15:23:56'),
(13, 43, 'Utilities', 'Electricity, internet, phone', '#8b5cf6', 'zap', NULL, 0, '2026-05-23 15:23:56'),
(14, 43, 'Professional Services', 'Legal, accounting, consulting', '#ec4899', 'briefcase', NULL, 0, '2026-05-23 15:23:56'),
(15, 43, 'Equipment', 'Hardware and equipment', '#06b6d4', 'cpu', NULL, 0, '2026-05-23 15:23:56'),
(16, 43, 'Training & Development', 'Staff education and courses', '#84cc16', 'graduation-cap', NULL, 0, '2026-05-23 15:23:56'),
(17, 44, 'Office Supplies', 'General office materials', '#3b82f6', 'package', NULL, 0, '2026-05-24 07:40:32'),
(18, 44, 'Travel & Accommodation', 'Staff travel and hotels', '#f59e0b', 'plane', NULL, 0, '2026-05-24 07:40:32'),
(19, 44, 'Software & Subscriptions', 'SaaS and software licenses', '#10b981', 'monitor', NULL, 0, '2026-05-24 07:40:32'),
(20, 44, 'Marketing & Advertising', 'Promotional activities', '#ef4444', 'megaphone', NULL, 0, '2026-05-24 07:40:32'),
(21, 44, 'Utilities', 'Electricity, internet, phone', '#8b5cf6', 'zap', NULL, 0, '2026-05-24 07:40:32'),
(22, 44, 'Professional Services', 'Legal, accounting, consulting', '#ec4899', 'briefcase', NULL, 0, '2026-05-24 07:40:32'),
(23, 44, 'Equipment', 'Hardware and equipment', '#06b6d4', 'cpu', NULL, 0, '2026-05-24 07:40:32'),
(24, 44, 'Training & Development', 'Staff education and courses', '#84cc16', 'graduation-cap', NULL, 0, '2026-05-24 07:40:32');

-- --------------------------------------------------------

--
-- Table structure for table `interactions`
--

CREATE TABLE `interactions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `customer_id` bigint(20) UNSIGNED DEFAULT NULL,
  `lead_id` bigint(20) UNSIGNED DEFAULT NULL,
  `type` enum('call','email','meeting','note','task','sms','whatsapp') NOT NULL,
  `subject` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `follow_up_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `status` enum('pending','completed','overdue') NOT NULL DEFAULT 'pending',
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `interactions`
--

INSERT INTO `interactions` (`id`, `tenant_id`, `customer_id`, `lead_id`, `type`, `subject`, `description`, `follow_up_date`, `status`, `created_by`, `created_at`) VALUES
(1, 1, 1, NULL, 'call', 'Follow-up on business trip', 'Discussed upcoming Q3 travel plans', '2026-05-11 10:23:07', 'completed', 4, '2026-05-11 10:23:07'),
(2, 1, NULL, 1, 'email', 'Proposal for corporate rates', 'Sent customized rate sheet', '2026-05-14 19:30:00', 'pending', 4, '2026-05-11 10:23:07'),
(3, 1, 3, NULL, 'meeting', 'Annual travel review', 'Reviewed travel patterns and preferences', '2026-05-11 10:23:07', 'completed', 5, '2026-05-11 10:23:07'),
(4, 1, NULL, 2, 'call', 'Luxury package discussion', 'Presented premium offerings', '2026-05-19 19:30:00', 'pending', 5, '2026-05-11 10:23:07'),
(5, 1, 4, NULL, 'note', 'VIP preferences updated', 'Updated meal and seat preferences', '2026-05-11 10:23:07', 'completed', 4, '2026-05-11 10:23:07');

-- --------------------------------------------------------

--
-- Table structure for table `invoices`
--

CREATE TABLE `invoices` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `customer_id` bigint(20) UNSIGNED NOT NULL,
  `invoice_number` varchar(50) NOT NULL,
  `ticket_id` bigint(20) UNSIGNED DEFAULT NULL,
  `issue_date` date NOT NULL,
  `due_date` date DEFAULT NULL,
  `subtotal` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `paid_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `status` enum('draft','sent','partial','paid','overdue','cancelled') NOT NULL DEFAULT 'draft',
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `invoices`
--

INSERT INTO `invoices` (`id`, `tenant_id`, `customer_id`, `invoice_number`, `ticket_id`, `issue_date`, `due_date`, `subtotal`, `tax_amount`, `total_amount`, `paid_amount`, `status`, `notes`, `created_by`, `created_at`, `updated_at`, `deleted_at`, `deleted_by`) VALUES
(28, 1, 28, 'INV-2026-00001', 48, '2026-05-17', '2026-05-31', 500.00, 0.00, 500.00, 0.00, 'sent', 'Generated from ticket 12', 1, '2026-05-17 06:30:45', '2026-05-17 06:30:45', NULL, NULL),
(33, 1, 9, 'INV-2026-00002', 50, '2026-05-17', '2026-05-31', 0.00, 0.00, 0.00, 0.00, 'sent', 'Generated from ticket 2020', 1, '2026-05-17 07:30:20', '2026-05-17 07:30:20', NULL, NULL),
(36, 1, 9, 'INV-2026-00003', 54, '2026-05-18', '2026-06-01', 380.00, 0.00, 380.00, 0.00, 'cancelled', 'Generated from ticket no2233', 22, '2026-05-18 10:13:04', '2026-05-18 05:43:43', NULL, NULL),
(37, 43, 40, 'INV-2026-00001', 61, '2026-05-23', '2026-06-06', 800.00, 0.00, 800.00, 0.00, 'sent', 'Generated from ticket kjk', 49, '2026-05-23 15:39:27', '2026-05-23 15:39:27', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `invoice_items`
--

CREATE TABLE `invoice_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `invoice_id` bigint(20) UNSIGNED NOT NULL,
  `description` text NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `unit_price` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_price` decimal(15,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `invoice_items`
--

INSERT INTO `invoice_items` (`id`, `invoice_id`, `description`, `quantity`, `unit_price`, `total_price`, `created_at`) VALUES
(5, 28, 'Flight: JFK → LHR | Ariana Afghan Airlines | test test1', 1, 500.00, 500.00, '2026-05-17 06:30:45'),
(7, 33, 'Flight: JFK → LHR | Ariana Afghan Airlines | test test1', 1, 0.00, 0.00, '2026-05-17 07:30:20'),
(9, 36, 'Flight: JFK → LHR | American Airlines | test test123', 1, 380.00, 380.00, '2026-05-18 10:13:04'),
(10, 37, 'Flight: TEST → TEST | Air France | tt yy', 1, 800.00, 800.00, '2026-05-23 15:39:27');

-- --------------------------------------------------------

--
-- Table structure for table `journal_entries`
--

CREATE TABLE `journal_entries` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `entry_number` varchar(50) NOT NULL,
  `date` date NOT NULL,
  `reference_type` varchar(50) DEFAULT NULL,
  `reference_id` bigint(20) UNSIGNED DEFAULT NULL,
  `description` text NOT NULL,
  `total_debit` decimal(15,2) NOT NULL,
  `total_credit` decimal(15,2) NOT NULL,
  `status` enum('draft','posted','reversed') NOT NULL DEFAULT 'draft',
  `posted_by` bigint(20) UNSIGNED DEFAULT NULL,
  `posted_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `notes` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `journal_entries`
--

INSERT INTO `journal_entries` (`id`, `tenant_id`, `entry_number`, `date`, `reference_type`, `reference_id`, `description`, `total_debit`, `total_credit`, `status`, `posted_by`, `posted_at`, `notes`, `metadata`, `created_at`, `updated_at`) VALUES
(1, 1, 'JE-2026-001', '2026-04-01', NULL, NULL, 'Initial capital contribution', 50000.00, 50000.00, 'posted', 1, '2026-05-11 10:23:07', NULL, NULL, '2026-05-11 10:23:07', '2026-05-11 10:23:07'),
(2, 1, 'JE-2026-002', '2026-04-05', 'ticket', 1, 'Ticket sale - John Smith', 3250.00, 3250.00, 'posted', 1, '2026-05-11 10:23:07', NULL, NULL, '2026-05-11 10:23:07', '2026-05-11 10:23:07'),
(3, 1, 'JE-2026-003', '2026-04-10', 'expense', 1, 'Office supplies purchase', 450.00, 450.00, 'posted', 3, '2026-05-11 10:23:07', NULL, NULL, '2026-05-11 10:23:07', '2026-05-11 10:23:07'),
(4, 1, 'JE-2026-004', '2026-04-12', NULL, NULL, 'Commission earned - Delta', 103.00, 103.00, 'posted', 3, '2026-05-11 10:23:07', NULL, NULL, '2026-05-11 10:23:07', '2026-05-11 10:23:07'),
(5, 1, 'JE-2026-005', '2026-04-15', 'expense', 4, 'Google Ads payment', 1500.00, 1500.00, 'posted', 1, '2026-05-11 10:23:07', NULL, NULL, '2026-05-11 10:23:07', '2026-05-11 10:23:07'),
(6, 1, 'JE-1778591605072', '2026-05-12', 'ticket', 16, 'Ticket Sale test3', 20000.00, 20000.00, 'posted', NULL, '2026-05-12 13:13:25', NULL, NULL, '2026-05-12 13:13:25', '2026-05-12 13:13:25'),
(7, 1, 'JE-1778661315686', '2026-05-13', 'ticket', 19, 'Ticket Sale 2525', 2000.00, 2000.00, 'posted', NULL, '2026-05-13 08:35:15', NULL, NULL, '2026-05-13 08:35:15', '2026-05-13 08:35:15'),
(8, 1, 'JE-1778661498790', '2026-05-13', 'ticket', 20, 'Ticket Sale rr', 10000.00, 10000.00, 'posted', NULL, '2026-05-13 08:38:18', NULL, NULL, '2026-05-13 08:38:18', '2026-05-13 08:38:18'),
(9, 1, 'JE-1778662619996', '2026-05-13', 'ticket', 21, 'Ticket Sale tkt-121', 15000.00, 15000.00, 'posted', NULL, '2026-05-13 08:57:00', NULL, NULL, '2026-05-13 08:57:00', '2026-05-13 08:57:00'),
(10, 1, 'JE-1778663258822', '2026-05-13', 'ticket', 22, 'Ticket Sale ww', 10000.00, 10000.00, 'posted', NULL, '2026-05-13 09:07:38', NULL, NULL, '2026-05-13 09:07:38', '2026-05-13 09:07:38'),
(11, 1, 'JE-1778669348659', '2026-05-13', 'ticket', 23, 'Ticket Sale tt1', 5000.00, 5000.00, 'posted', NULL, '2026-05-13 10:49:08', NULL, NULL, '2026-05-13 10:49:08', '2026-05-13 10:49:08'),
(48, 1, 'JE-1778999445446', '2026-05-17', 'ticket', 48, 'Ticket Sale 12', 500.00, 500.00, 'posted', NULL, '2026-05-17 06:30:45', NULL, NULL, '2026-05-17 06:30:45', '2026-05-17 06:30:45'),
(49, 1, 'JE-1778999526090', '2026-05-17', 'payment', NULL, 'Customer payment: test test1', 500.00, 500.00, 'posted', NULL, '2026-05-17 06:32:06', NULL, NULL, '2026-05-17 06:32:06', '2026-05-17 06:32:06'),
(54, 1, 'JE-1779003020596', '2026-05-17', 'ticket', 50, 'Ticket Sale 2020', 0.00, 0.00, 'posted', NULL, '2026-05-17 07:30:20', NULL, NULL, '2026-05-17 07:30:20', '2026-05-17 07:30:20'),
(55, 1, 'JE-1779003096644', '2026-05-17', 'deposit', 1, 'Deposit received: MZR-2026-000004', 1000.00, 1000.00, 'posted', NULL, '2026-05-17 07:31:36', NULL, NULL, '2026-05-17 07:31:36', '2026-05-17 07:31:36'),
(56, 1, 'JE-1779003194524', '2026-05-17', 'bill', 1, 'Bill BILL-2026-00001 - test', 120000.00, 120000.00, 'posted', NULL, '2026-05-17 07:33:14', NULL, NULL, '2026-05-17 07:33:14', '2026-05-17 07:33:14'),
(57, 1, 'JE-1779003480325', '2026-05-17', 'ticket', 51, 'Ticket Sale 333', 0.00, 0.00, 'posted', NULL, '2026-05-17 07:38:00', NULL, NULL, '2026-05-17 07:38:00', '2026-05-17 07:38:00'),
(60, 1, 'JE-1779005113590', '2026-05-17', 'ticket', 53, 'Ticket Sale tt-tt', 259.00, 259.00, 'posted', NULL, '2026-05-17 08:05:13', NULL, NULL, '2026-05-17 08:05:13', '2026-05-17 03:35:13'),
(61, 1, 'JE-1779005768580', '2026-05-17', 'ticket', 19, 'Ticket Sale 2525', 2000.00, 2000.00, 'posted', NULL, '2026-05-17 08:16:08', NULL, NULL, '2026-05-17 08:16:08', '2026-05-17 08:16:08'),
(62, 1, 'JE-1779099184628', '2026-05-18', 'ticket', 54, 'Ticket Sale no2233', 380.00, 380.00, 'posted', NULL, '2026-05-18 10:13:04', NULL, NULL, '2026-05-18 10:13:04', '2026-05-18 10:13:04'),
(63, 1, 'JE-1779099222948', '2026-05-18', 'ticket', 54, 'Ticket Refund no2233', 380.00, 380.00, 'posted', NULL, '2026-05-18 10:13:42', NULL, NULL, '2026-05-18 10:13:42', '2026-05-18 10:13:42'),
(64, 1, 'JE-1779549846915', '2026-05-23', 'ticket', 55, 'Ticket Sale tkt-2026-test', 800.00, 800.00, 'posted', NULL, '2026-05-23 15:24:06', NULL, NULL, '2026-05-23 15:24:06', '2026-05-23 15:24:06'),
(65, 1, 'JE-1779549922623', '2026-05-23', 'ticket', 58, 'Ticket Sale jj-123', 900.00, 900.00, 'posted', NULL, '2026-05-23 15:25:22', NULL, NULL, '2026-05-23 15:25:22', '2026-05-23 15:25:22'),
(66, 43, '1', '2026-05-23', NULL, NULL, 'petty cash', 1100.00, 1100.00, 'draft', NULL, '2026-05-23 15:34:35', NULL, NULL, '2026-05-23 15:34:35', '2026-05-23 15:34:35'),
(67, 43, 'JE-1779550609795', '2026-05-23', 'ticket', 60, 'Ticket Sale tt', 100.00, 100.00, 'posted', NULL, '2026-05-23 15:36:49', NULL, NULL, '2026-05-23 15:36:49', '2026-05-23 15:36:49'),
(68, 43, 'JE-1779550767896', '2026-05-23', 'ticket', 61, 'Ticket Sale kjk', 800.00, 800.00, 'posted', NULL, '2026-05-23 15:39:27', NULL, NULL, '2026-05-23 15:39:27', '2026-05-23 15:39:27'),
(69, 44, 'JE-1779608599735', '2026-05-24', 'ticket', 62, 'Ticket Sale jfk-123', 1500.00, 1500.00, 'posted', NULL, '2026-05-24 07:43:19', NULL, NULL, '2026-05-24 07:43:19', '2026-05-24 07:43:19'),
(70, 44, 'JE-1779608722987', '2026-05-24', 'deposit', 3, 'Deposit received: MZR-2026-000001', 500.00, 500.00, 'posted', NULL, '2026-05-24 07:45:22', NULL, NULL, '2026-05-24 07:45:22', '2026-05-24 07:45:22'),
(71, 44, 'JE-1779609001832', '2026-05-24', 'bill', 2, 'Bill BILL-2026-00001 - tomorrow tour', 1005.00, 1005.00, 'posted', NULL, '2026-05-24 07:50:01', NULL, NULL, '2026-05-24 07:50:01', '2026-05-24 07:50:01'),
(72, 44, 'je-26-kl', '2026-05-24', NULL, NULL, 'hi', 600.00, 600.00, 'posted', 50, '2026-05-24 04:55:44', NULL, NULL, '2026-05-24 07:54:55', '2026-05-24 04:55:44'),
(73, 44, 'cc', '2026-05-31', NULL, NULL, 'test', 200.00, 200.00, 'posted', 50, '2026-05-24 04:55:37', NULL, NULL, '2026-05-24 07:56:03', '2026-05-24 04:55:37'),
(74, 44, '0102', '2026-05-24', NULL, NULL, 'test', 300.00, 300.00, 'posted', 50, '2026-05-24 04:55:43', NULL, NULL, '2026-05-24 08:31:25', '2026-05-24 04:55:43'),
(75, 44, '10', '2026-05-24', NULL, NULL, 'elham', 200.00, 200.00, 'posted', 50, '2026-05-24 04:55:42', NULL, NULL, '2026-05-24 08:33:21', '2026-05-24 04:55:42'),
(76, 44, '50', '2026-05-24', NULL, NULL, 'jj', 30.00, 30.00, 'posted', 50, '2026-05-24 04:55:47', NULL, NULL, '2026-05-24 08:34:36', '2026-05-24 04:55:47'),
(77, 44, '0303', '2026-05-24', NULL, NULL, 'Test by test', 700.00, 700.00, 'posted', 50, '2026-05-24 04:57:23', NULL, NULL, '2026-05-24 09:27:11', '2026-05-24 04:57:23');

-- --------------------------------------------------------

--
-- Table structure for table `journal_entry_lines`
--

CREATE TABLE `journal_entry_lines` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `journal_entry_id` bigint(20) UNSIGNED NOT NULL,
  `account_id` bigint(20) UNSIGNED NOT NULL,
  `description` text DEFAULT NULL,
  `debit` decimal(15,2) NOT NULL DEFAULT 0.00,
  `credit` decimal(15,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `journal_entry_lines`
--

INSERT INTO `journal_entry_lines` (`id`, `journal_entry_id`, `account_id`, `description`, `debit`, `credit`, `created_at`) VALUES
(1, 1, 2, 'Bank deposit', 50000.00, 0.00, '2026-05-11 10:23:07'),
(2, 1, 7, 'Owner capital', 0.00, 50000.00, '2026-05-11 10:23:07'),
(3, 2, 3, 'Receivable from customer', 3250.00, 0.00, '2026-05-11 10:23:07'),
(4, 2, 9, 'Ticket revenue', 0.00, 3250.00, '2026-05-11 10:23:07'),
(5, 3, 11, 'Office supplies', 450.00, 0.00, '2026-05-11 10:23:07'),
(6, 3, 2, 'Bank payment', 0.00, 450.00, '2026-05-11 10:23:07'),
(7, 4, 4, 'Commission receivable', 103.00, 0.00, '2026-05-11 10:23:07'),
(8, 4, 10, 'Commission revenue', 0.00, 103.00, '2026-05-11 10:23:07'),
(9, 5, 14, 'Marketing expense', 1500.00, 0.00, '2026-05-11 10:23:07'),
(10, 5, 2, 'Bank payment', 0.00, 1500.00, '2026-05-11 10:23:07'),
(11, 6, 1, 'Wallet deduction for ticket booking', 20000.00, 0.00, '2026-05-12 13:13:25'),
(12, 6, 17, 'Ticket sales revenue', 0.00, 20000.00, '2026-05-12 13:13:25'),
(13, 7, 1, 'Wallet deduction for ticket booking', 2000.00, 0.00, '2026-05-13 08:35:15'),
(14, 7, 17, 'Ticket sales revenue', 0.00, 2000.00, '2026-05-13 08:35:15'),
(15, 8, 1, 'Wallet deduction for ticket booking', 10000.00, 0.00, '2026-05-13 08:38:18'),
(16, 8, 17, 'Ticket sales revenue', 0.00, 10000.00, '2026-05-13 08:38:18'),
(17, 9, 1, 'Wallet deduction for ticket booking', 15000.00, 0.00, '2026-05-13 08:57:00'),
(18, 9, 17, 'Ticket sales revenue', 0.00, 15000.00, '2026-05-13 08:57:00'),
(19, 10, 1, 'Wallet deduction for ticket booking', 10000.00, 0.00, '2026-05-13 09:07:38'),
(20, 10, 17, 'Ticket sales revenue', 0.00, 10000.00, '2026-05-13 09:07:38'),
(21, 11, 1, 'Wallet deduction for ticket booking', 5000.00, 0.00, '2026-05-13 10:49:08'),
(22, 11, 17, 'Ticket sales revenue', 0.00, 5000.00, '2026-05-13 10:49:08'),
(131, 48, 3, 'Accounts Receivable - Ticket Sale', 500.00, 0.00, '2026-05-17 06:30:45'),
(132, 48, 9, 'Ticket sales revenue', 0.00, 500.00, '2026-05-17 06:30:45'),
(133, 49, 1, 'Cash received', 500.00, 0.00, '2026-05-17 06:32:06'),
(134, 49, 3, 'AR reduction', 0.00, 500.00, '2026-05-17 06:32:06'),
(145, 54, 3, 'Accounts Receivable - Ticket Sale', 0.00, 0.00, '2026-05-17 07:30:20'),
(146, 54, 9, 'Ticket sales revenue', 0.00, 0.00, '2026-05-17 07:30:20'),
(147, 55, 1, 'Cash/Bank received', 1000.00, 0.00, '2026-05-17 07:31:36'),
(148, 55, 6, 'Customer deposit liability', 0.00, 1000.00, '2026-05-17 07:31:36'),
(149, 56, 155, 'Expense for bill BILL-2026-00001', 120000.00, 0.00, '2026-05-17 07:33:14'),
(150, 56, 5, 'AP for bill BILL-2026-00001', 0.00, 120000.00, '2026-05-17 07:33:14'),
(151, 57, 1, 'Wallet deduction for ticket booking', 0.00, 0.00, '2026-05-17 07:38:00'),
(152, 57, 9, 'Ticket sales revenue', 0.00, 0.00, '2026-05-17 07:38:00'),
(159, 60, 1, 'Wallet deduction for ticket booking', 250.00, 0.00, '2026-05-17 08:05:13'),
(160, 60, 9, 'Ticket sales revenue', 0.00, 250.00, '2026-05-17 08:05:13'),
(161, 60, 11, 'Commission expense', 9.00, 0.00, '2026-05-17 08:05:13'),
(162, 60, 10, 'Commission revenue', 0.00, 9.00, '2026-05-17 08:05:13'),
(163, 61, 1, 'Wallet deduction for ticket booking', 2000.00, 0.00, '2026-05-17 08:16:08'),
(164, 61, 9, 'Ticket sales revenue', 0.00, 2000.00, '2026-05-17 08:16:08'),
(165, 62, 3, 'Accounts Receivable - Ticket Sale', 380.00, 0.00, '2026-05-18 10:13:04'),
(166, 62, 9, 'Ticket sales revenue', 0.00, 380.00, '2026-05-18 10:13:04'),
(167, 63, 9, 'Revenue reversal - ticket refund', 380.00, 0.00, '2026-05-18 10:13:42'),
(168, 63, 3, 'Cash/AR refund to customer', 0.00, 300.00, '2026-05-18 10:13:42'),
(169, 63, 161, 'Cancellation penalty', 0.00, 80.00, '2026-05-18 10:13:42'),
(170, 64, 1, 'Wallet deduction for ticket booking', 800.00, 0.00, '2026-05-23 15:24:06'),
(171, 64, 9, 'Ticket sales revenue', 0.00, 800.00, '2026-05-23 15:24:06'),
(172, 65, 1, 'Wallet deduction for ticket booking', 900.00, 0.00, '2026-05-23 15:25:22'),
(173, 65, 9, 'Ticket sales revenue', 0.00, 900.00, '2026-05-23 15:25:22'),
(174, 66, 181, '', 1000.00, 1000.00, '2026-05-23 15:34:35'),
(175, 66, 176, '', 100.00, 100.00, '2026-05-23 15:34:35'),
(176, 67, 165, 'Wallet deduction for ticket booking', 100.00, 0.00, '2026-05-23 15:36:49'),
(177, 67, 173, 'Ticket sales revenue', 0.00, 100.00, '2026-05-23 15:36:49'),
(178, 68, 167, 'Accounts Receivable - Ticket Sale', 800.00, 0.00, '2026-05-23 15:39:27'),
(179, 68, 173, 'Ticket sales revenue', 0.00, 800.00, '2026-05-23 15:39:27'),
(180, 69, 183, 'Wallet deduction for ticket booking', 1500.00, 0.00, '2026-05-24 07:43:19'),
(181, 69, 191, 'Ticket sales revenue', 0.00, 1500.00, '2026-05-24 07:43:19'),
(182, 70, 183, 'Cash/Bank received', 500.00, 0.00, '2026-05-24 07:45:22'),
(183, 70, 188, 'Customer deposit liability', 0.00, 500.00, '2026-05-24 07:45:22'),
(184, 71, 195, 'Expense for bill BILL-2026-00001', 1005.00, 0.00, '2026-05-24 07:50:01'),
(185, 71, 187, 'AP for bill BILL-2026-00001', 0.00, 1005.00, '2026-05-24 07:50:01'),
(186, 72, 200, '', 100.00, 100.00, '2026-05-24 07:54:55'),
(187, 72, 200, '', 500.00, 500.00, '2026-05-24 07:54:55'),
(188, 73, 199, 'hi', 100.00, 100.00, '2026-05-24 07:56:03'),
(189, 73, 200, 'hi', 100.00, 100.00, '2026-05-24 07:56:03'),
(190, 74, 201, 'test2026', 100.00, 100.00, '2026-05-24 08:31:25'),
(191, 74, 201, 'test2026', 200.00, 200.00, '2026-05-24 08:31:25'),
(192, 75, 202, 'hi', 100.00, 100.00, '2026-05-24 08:33:21'),
(193, 75, 202, 'hi', 100.00, 100.00, '2026-05-24 08:33:21'),
(194, 76, 199, 'j', 10.00, 10.00, '2026-05-24 08:34:36'),
(195, 76, 199, 'j', 20.00, 20.00, '2026-05-24 08:34:36'),
(196, 77, 203, 'test', 100.00, 100.00, '2026-05-24 09:27:11'),
(197, 77, 203, 'test', 600.00, 600.00, '2026-05-24 09:27:11');

-- --------------------------------------------------------

--
-- Table structure for table `leads`
--

CREATE TABLE `leads` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(320) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `company` varchar(255) DEFAULT NULL,
  `source` varchar(50) DEFAULT NULL,
  `status` enum('new','contacted','qualified','proposal','negotiation','won','lost') NOT NULL DEFAULT 'new',
  `priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
  `estimated_value` decimal(12,2) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `assigned_to` bigint(20) UNSIGNED DEFAULT NULL,
  `expected_close_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `leads`
--

INSERT INTO `leads` (`id`, `tenant_id`, `first_name`, `last_name`, `email`, `phone`, `company`, `source`, `status`, `priority`, `estimated_value`, `notes`, `assigned_to`, `expected_close_date`, `created_at`, `updated_at`) VALUES
(1, 1, 'Patrick', 'O\'Connor', 'patrick.oc@enterprise.com', '+1-555-2001', 'Enterprise Solutions', 'Website', 'qualified', 'high', 15000.00, NULL, 4, '2026-06-30', '2026-05-11 10:23:07', '2026-05-11 10:23:07'),
(2, 1, 'Sophie', 'Martin', 'sophie.m@luxury.com', '+1-555-2002', 'Luxury Brands Co', 'Referral', 'proposal', 'medium', 8500.00, NULL, 5, '2026-07-15', '2026-05-11 10:23:07', '2026-05-11 10:23:07'),
(3, 1, 'James', 'Wilson', 'j.wilson@startup.io', '+1-555-2003', 'Tech Startup Inc', 'Social Media', 'contacted', 'medium', 5000.00, NULL, 4, '2026-07-30', '2026-05-11 10:23:07', '2026-05-11 10:23:07'),
(4, 1, 'Emma', 'Thompson', 'emma.t@healthcare.org', '+1-555-2004', 'Healthcare Group', 'Email Campaign', 'new', 'high', 22000.00, NULL, 5, '2026-08-15', '2026-05-11 10:23:07', '2026-05-11 10:23:07'),
(5, 1, 'Daniel', 'Lee', 'daniel.lee@education.edu', '+1-555-2005', 'Education Foundation', 'Event', 'negotiation', 'low', 3000.00, NULL, 4, '2026-06-20', '2026-05-11 10:23:07', '2026-05-11 10:23:07'),
(6, 1, 'Elham', 'Mukhtari', 'elhammukhtari12345@gmail.com', '', 'PSB', 'PSB', 'qualified', 'medium', 10000.00, '', NULL, NULL, '2026-05-12 09:49:55', '2026-05-12 05:33:36'),
(7, 43, 'Elham', 'Mukhtari', 'elhammukhtari12345@gmail.com', '', 'Elhamuddin Mukhtari', '', 'new', 'medium', 1000.00, '', NULL, NULL, '2026-05-23 15:38:13', '2026-05-23 11:08:24'),
(8, 44, 'elham', 'Mukhtari', 'elhammukhtari123456@gmail.com', '', 'mukhtari tour', '', 'new', 'medium', 10000.00, '', NULL, NULL, '2026-05-24 07:44:25', '2026-05-24 07:44:25');

-- --------------------------------------------------------

--
-- Table structure for table `ledger_entries`
--

CREATE TABLE `ledger_entries` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `journal_entry_id` bigint(20) UNSIGNED DEFAULT NULL,
  `account_id` bigint(20) UNSIGNED NOT NULL,
  `date` date NOT NULL,
  `description` text DEFAULT NULL,
  `debit` decimal(15,2) NOT NULL DEFAULT 0.00,
  `credit` decimal(15,2) NOT NULL DEFAULT 0.00,
  `balance` decimal(15,2) NOT NULL,
  `entry_type` enum('opening','transaction','adjustment','closing','reversal') NOT NULL DEFAULT 'transaction',
  `reference_type` varchar(50) DEFAULT NULL,
  `reference_id` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `ledger_entries`
--

INSERT INTO `ledger_entries` (`id`, `tenant_id`, `journal_entry_id`, `account_id`, `date`, `description`, `debit`, `credit`, `balance`, `entry_type`, `reference_type`, `reference_id`, `created_at`) VALUES
(1, 1, NULL, 2, '2026-04-01', 'Initial capital', 50000.00, 0.00, 50000.00, 'transaction', NULL, NULL, '2026-05-11 10:23:07'),
(2, 1, NULL, 2, '2026-04-05', 'Ticket payment received', 3250.00, 0.00, 53250.00, 'transaction', NULL, NULL, '2026-05-11 10:23:07'),
(3, 1, NULL, 2, '2026-04-10', 'Office supplies', 0.00, 450.00, 52800.00, 'transaction', NULL, NULL, '2026-05-11 10:23:07'),
(4, 1, NULL, 2, '2026-04-15', 'Google Ads', 0.00, 1500.00, 51300.00, 'transaction', NULL, NULL, '2026-05-11 10:23:07'),
(5, 1, NULL, 7, '2026-04-01', 'Owner equity', 0.00, 50000.00, 50000.00, 'transaction', NULL, NULL, '2026-05-11 10:23:07'),
(6, 1, NULL, 9, '2026-04-05', 'Ticket revenue', 0.00, 3250.00, 3250.00, 'transaction', NULL, NULL, '2026-05-11 10:23:07'),
(7, 1, NULL, 10, '2026-04-12', 'Commission revenue', 0.00, 103.00, 103.00, 'transaction', NULL, NULL, '2026-05-11 10:23:07'),
(8, 1, NULL, 11, '2026-04-10', 'Office supplies', 450.00, 0.00, 450.00, 'transaction', NULL, NULL, '2026-05-11 10:23:07'),
(9, 1, NULL, 14, '2026-04-15', 'Marketing expense', 1500.00, 0.00, 1500.00, 'transaction', NULL, NULL, '2026-05-11 10:23:07'),
(10, 1, 11, 1, '2026-05-13', 'Wallet deduction for ticket booking', 5000.00, 0.00, 10000.00, 'transaction', NULL, NULL, '2026-05-13 10:49:08'),
(11, 1, 11, 17, '2026-05-13', 'Ticket sales revenue', 0.00, 5000.00, -5000.00, 'transaction', NULL, NULL, '2026-05-13 10:49:08'),
(120, 1, 48, 3, '2026-05-17', 'Accounts Receivable - Ticket Sale', 500.00, 0.00, 45500.00, 'transaction', NULL, NULL, '2026-05-17 06:30:45'),
(121, 1, 48, 9, '2026-05-17', 'Ticket sales revenue', 0.00, 500.00, -500.00, 'transaction', NULL, NULL, '2026-05-17 06:30:45'),
(122, 1, 49, 1, '2026-05-17', 'Cash received', 500.00, 0.00, 10500.00, 'transaction', NULL, NULL, '2026-05-17 06:32:06'),
(123, 1, 49, 3, '2026-05-17', 'AR reduction', 0.00, 500.00, 45000.00, 'transaction', NULL, NULL, '2026-05-17 06:32:06'),
(134, 1, 54, 3, '2026-05-17', 'Accounts Receivable - Ticket Sale', 0.00, 0.00, 45000.00, 'transaction', NULL, NULL, '2026-05-17 07:30:20'),
(135, 1, 54, 9, '2026-05-17', 'Ticket sales revenue', 0.00, 0.00, -500.00, 'transaction', NULL, NULL, '2026-05-17 07:30:20'),
(136, 1, 55, 1, '2026-05-17', 'Cash/Bank received', 1000.00, 0.00, 11500.00, 'transaction', NULL, NULL, '2026-05-17 07:31:36'),
(137, 1, 55, 6, '2026-05-17', 'Customer deposit liability', 0.00, 1000.00, 77000.00, 'transaction', NULL, NULL, '2026-05-17 07:31:36'),
(138, 1, 56, 155, '2026-05-17', 'Expense for bill BILL-2026-00001', 120000.00, 0.00, 120000.00, 'transaction', 'bill', 1, '2026-05-17 07:33:14'),
(139, 1, 56, 5, '2026-05-17', 'AP for bill BILL-2026-00001', 0.00, 120000.00, -120000.00, 'transaction', 'bill', 1, '2026-05-17 07:33:14'),
(140, 1, 57, 1, '2026-05-17', 'Wallet deduction for ticket booking', 0.00, 0.00, 11500.00, 'transaction', NULL, NULL, '2026-05-17 07:38:00'),
(141, 1, 57, 9, '2026-05-17', 'Ticket sales revenue', 0.00, 0.00, -500.00, 'transaction', NULL, NULL, '2026-05-17 07:38:00'),
(148, 1, 60, 1, '2026-05-17', 'Wallet deduction for ticket booking', 250.00, 0.00, 11750.00, 'transaction', NULL, NULL, '2026-05-17 08:05:13'),
(149, 1, 60, 9, '2026-05-17', 'Ticket sales revenue', 0.00, 250.00, -750.00, 'transaction', NULL, NULL, '2026-05-17 08:05:13'),
(150, 1, 60, 11, '2026-05-17', 'Commission expense', 9.00, 0.00, 9.00, 'transaction', NULL, NULL, '2026-05-17 08:05:13'),
(151, 1, 60, 10, '2026-05-17', 'Commission revenue', 0.00, 9.00, -9.00, 'transaction', NULL, NULL, '2026-05-17 08:05:13'),
(152, 1, 61, 1, '2026-05-17', 'Wallet deduction for ticket booking', 2000.00, 0.00, 13750.00, 'transaction', NULL, NULL, '2026-05-17 08:16:08'),
(153, 1, 61, 9, '2026-05-17', 'Ticket sales revenue', 0.00, 2000.00, -2750.00, 'transaction', NULL, NULL, '2026-05-17 08:16:08'),
(154, 1, 62, 3, '2026-05-18', 'Accounts Receivable - Ticket Sale', 380.00, 0.00, 45380.00, 'transaction', NULL, NULL, '2026-05-18 10:13:04'),
(155, 1, 62, 9, '2026-05-18', 'Ticket sales revenue', 0.00, 380.00, -3130.00, 'transaction', NULL, NULL, '2026-05-18 10:13:04'),
(156, 1, 63, 9, '2026-05-18', 'Revenue reversal - ticket refund', 380.00, 0.00, -2750.00, 'transaction', NULL, NULL, '2026-05-18 10:13:42'),
(157, 1, 63, 3, '2026-05-18', 'Cash/AR refund to customer', 0.00, 300.00, 45080.00, 'transaction', NULL, NULL, '2026-05-18 10:13:42'),
(158, 1, 63, 161, '2026-05-18', 'Cancellation penalty', 0.00, 80.00, -80.00, 'transaction', NULL, NULL, '2026-05-18 10:13:42'),
(159, 1, 64, 1, '2026-05-23', 'Wallet deduction for ticket booking', 800.00, 0.00, 14550.00, 'transaction', NULL, NULL, '2026-05-23 15:24:06'),
(160, 1, 64, 9, '2026-05-23', 'Ticket sales revenue', 0.00, 800.00, -3550.00, 'transaction', NULL, NULL, '2026-05-23 15:24:06'),
(161, 1, 65, 1, '2026-05-23', 'Wallet deduction for ticket booking', 900.00, 0.00, 15450.00, 'transaction', NULL, NULL, '2026-05-23 15:25:22'),
(162, 1, 65, 9, '2026-05-23', 'Ticket sales revenue', 0.00, 900.00, -4450.00, 'transaction', NULL, NULL, '2026-05-23 15:25:22'),
(163, 43, 67, 165, '2026-05-23', 'Wallet deduction for ticket booking', 100.00, 0.00, 100.00, 'transaction', NULL, NULL, '2026-05-23 15:36:49'),
(164, 43, 67, 173, '2026-05-23', 'Ticket sales revenue', 0.00, 100.00, -100.00, 'transaction', NULL, NULL, '2026-05-23 15:36:49'),
(165, 43, 68, 167, '2026-05-23', 'Accounts Receivable - Ticket Sale', 800.00, 0.00, 800.00, 'transaction', NULL, NULL, '2026-05-23 15:39:27'),
(166, 43, 68, 173, '2026-05-23', 'Ticket sales revenue', 0.00, 800.00, -900.00, 'transaction', NULL, NULL, '2026-05-23 15:39:27'),
(167, 44, 69, 183, '2026-05-24', 'Wallet deduction for ticket booking', 1500.00, 0.00, 1500.00, 'transaction', NULL, NULL, '2026-05-24 07:43:19'),
(168, 44, 69, 191, '2026-05-24', 'Ticket sales revenue', 0.00, 1500.00, -1500.00, 'transaction', NULL, NULL, '2026-05-24 07:43:19'),
(169, 44, 70, 183, '2026-05-24', 'Cash/Bank received', 500.00, 0.00, 2000.00, 'transaction', NULL, NULL, '2026-05-24 07:45:22'),
(170, 44, 70, 188, '2026-05-24', 'Customer deposit liability', 0.00, 500.00, -500.00, 'transaction', NULL, NULL, '2026-05-24 07:45:22'),
(171, 44, 71, 195, '2026-05-24', 'Expense for bill BILL-2026-00001', 1005.00, 0.00, 1005.00, 'transaction', 'bill', 2, '2026-05-24 07:50:01'),
(172, 44, 71, 187, '2026-05-24', 'AP for bill BILL-2026-00001', 0.00, 1005.00, -1005.00, 'transaction', 'bill', 2, '2026-05-24 07:50:01'),
(173, 44, 73, 199, '2026-05-31', 'hi', 100.00, 100.00, 0.00, 'transaction', NULL, NULL, '2026-05-24 09:25:37'),
(174, 44, 73, 200, '2026-05-31', 'hi', 100.00, 100.00, 0.00, 'transaction', NULL, NULL, '2026-05-24 09:25:37'),
(175, 44, 75, 202, '2026-05-24', 'hi', 100.00, 100.00, 0.00, 'transaction', NULL, NULL, '2026-05-24 09:25:42'),
(176, 44, 75, 202, '2026-05-24', 'hi', 100.00, 100.00, 0.00, 'transaction', NULL, NULL, '2026-05-24 09:25:42'),
(177, 44, 74, 201, '2026-05-24', 'test2026', 100.00, 100.00, 0.00, 'transaction', NULL, NULL, '2026-05-24 09:25:43'),
(178, 44, 74, 201, '2026-05-24', 'test2026', 200.00, 200.00, 0.00, 'transaction', NULL, NULL, '2026-05-24 09:25:43'),
(179, 44, 72, 200, '2026-05-24', 'hi', 100.00, 100.00, 0.00, 'transaction', NULL, NULL, '2026-05-24 09:25:44'),
(180, 44, 72, 200, '2026-05-24', 'hi', 500.00, 500.00, 0.00, 'transaction', NULL, NULL, '2026-05-24 09:25:44'),
(181, 44, 76, 199, '2026-05-24', 'j', 10.00, 10.00, 0.00, 'transaction', NULL, NULL, '2026-05-24 09:25:47'),
(182, 44, 76, 199, '2026-05-24', 'j', 20.00, 20.00, 0.00, 'transaction', NULL, NULL, '2026-05-24 09:25:47'),
(183, 44, 77, 203, '2026-05-24', 'test', 100.00, 100.00, 0.00, 'transaction', NULL, NULL, '2026-05-24 09:27:23'),
(184, 44, 77, 203, '2026-05-24', 'test', 600.00, 600.00, 0.00, 'transaction', NULL, NULL, '2026-05-24 09:27:23');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` enum('info','success','warning','error','system') NOT NULL DEFAULT 'info',
  `category` enum('ticket','wallet','expense','accounting','crm','system','security') NOT NULL DEFAULT 'system',
  `reference_type` varchar(50) DEFAULT NULL,
  `reference_id` bigint(20) UNSIGNED DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `read_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `action_url` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `tenant_id`, `user_id`, `title`, `message`, `type`, `category`, `reference_type`, `reference_id`, `is_read`, `read_at`, `action_url`, `created_at`) VALUES
(1, 1, 1, 'New ticket booked', 'TKT-2026-010 has been confirmed for Lisa Wang', 'success', 'ticket', 'ticket', 10, 1, '2026-05-12 05:26:18', NULL, '2026-05-11 10:23:07'),
(2, 1, 1, 'Expense approval needed', 'Legal consultation expense pending approval', 'warning', 'expense', 'expense', 6, 1, '2026-05-12 05:26:19', NULL, '2026-05-11 10:23:07'),
(3, 1, 2, 'Low wallet balance alert', 'Petty Cash wallet is running low', 'warning', 'wallet', 'wallet', 3, 1, '2026-05-12 05:26:19', NULL, '2026-05-11 10:23:07'),
(4, 1, 3, 'Journal entry posted', 'JE-2026-005 has been posted successfully', 'success', 'accounting', 'journal', 5, 1, '2026-05-12 05:26:19', NULL, '2026-05-11 10:23:07'),
(5, 1, 4, 'New lead assigned', 'Patrick O\'Connor has been assigned to you', 'info', 'crm', 'lead', 1, 1, '2026-05-12 05:26:19', NULL, '2026-05-11 10:23:07'),
(6, 1, 1, 'System update', 'PSB-ERP v2.1.0 update scheduled for tonight', 'info', 'system', NULL, NULL, 1, '2026-05-12 05:26:20', NULL, '2026-05-11 10:23:07'),
(7, 1, 2, 'High-value ticket', 'First class booking worth $9,700 confirmed', 'success', 'ticket', 'ticket', 4, 1, '2026-05-12 05:26:20', NULL, '2026-05-11 10:23:07'),
(8, 1, 3, 'Monthly reconciliation due', 'April month-end closing in 3 days', 'warning', 'accounting', NULL, NULL, 1, '2026-05-12 05:26:21', NULL, '2026-05-11 10:23:07'),
(9, 6, 11, 'Wallet Transfer', '$100 transferred between wallets.', 'info', 'wallet', 'wallet', 15, 0, '2026-05-16 18:10:27', NULL, '2026-05-16 18:10:27'),
(10, 7, 12, 'Wallet Transfer', '$100 transferred between wallets.', 'info', 'wallet', 'wallet', 17, 0, '2026-05-16 18:27:35', NULL, '2026-05-16 18:27:35'),
(65, 1, 1, 'Ticket Rejected', 'Ticket tt1 has been rejected. ', 'warning', 'ticket', 'ticket', 23, 0, '2026-05-17 06:03:42', NULL, '2026-05-17 06:03:42'),
(69, 1, 1, 'New Ticket Pending Approval', 'Ticket 12 has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 48, 0, '2026-05-17 06:30:40', NULL, '2026-05-17 06:30:40'),
(70, 1, 1, 'New Ticket Pending Approval', 'Ticket 12 has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 48, 0, '2026-05-17 06:30:40', NULL, '2026-05-17 06:30:40'),
(71, 1, 3, 'New Ticket Pending Approval', 'Ticket 12 has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 48, 0, '2026-05-17 06:30:40', NULL, '2026-05-17 06:30:40'),
(72, 1, 1, 'Ticket Approved', 'Ticket 12 has been approved and processed.', 'success', 'ticket', 'ticket', 48, 0, '2026-05-17 06:30:45', NULL, '2026-05-17 06:30:45'),
(73, 1, 1, 'Payment Received', '$500 received from test test1.', 'success', 'accounting', NULL, NULL, 0, '2026-05-17 06:32:06', NULL, '2026-05-17 06:32:06'),
(81, 1, 1, 'New Ticket Pending Approval', 'Ticket 2020 has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 50, 0, '2026-05-17 07:29:35', NULL, '2026-05-17 07:29:35'),
(82, 1, 1, 'New Ticket Pending Approval', 'Ticket 2020 has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 50, 0, '2026-05-17 07:29:35', NULL, '2026-05-17 07:29:35'),
(83, 1, 3, 'New Ticket Pending Approval', 'Ticket 2020 has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 50, 0, '2026-05-17 07:29:35', NULL, '2026-05-17 07:29:35'),
(84, 1, 1, 'Ticket Approved', 'Ticket 2020 has been approved and processed.', 'success', 'ticket', 'ticket', 50, 0, '2026-05-17 07:30:20', NULL, '2026-05-17 07:30:20'),
(85, 1, 1, 'New Deposit Request', 'Deposit MZR-2026-000004 for $1,000 is awaiting approval.', 'info', 'wallet', 'deposit', 1, 0, '2026-05-17 07:31:32', NULL, '2026-05-17 07:31:32'),
(86, 1, 1, 'Deposit Approved', 'Deposit MZR-2026-000004 has been approved.', 'success', 'wallet', 'deposit', 1, 0, '2026-05-17 07:31:36', NULL, '2026-05-17 07:31:36'),
(87, 1, 1, 'Deposit Approved', 'Deposit MZR-2026-000004 has been approved.', 'success', 'wallet', 'deposit', 1, 0, '2026-05-17 07:31:36', NULL, '2026-05-17 07:31:36'),
(88, 1, 3, 'Deposit Approved', 'Deposit MZR-2026-000004 has been approved.', 'success', 'wallet', 'deposit', 1, 0, '2026-05-17 07:31:36', NULL, '2026-05-17 07:31:36'),
(89, 1, 1, 'New Ticket Pending Approval', 'Ticket 333 has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 51, 0, '2026-05-17 07:37:56', NULL, '2026-05-17 07:37:56'),
(90, 1, 1, 'New Ticket Pending Approval', 'Ticket 333 has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 51, 0, '2026-05-17 07:37:56', NULL, '2026-05-17 07:37:56'),
(91, 1, 3, 'New Ticket Pending Approval', 'Ticket 333 has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 51, 0, '2026-05-17 07:37:56', NULL, '2026-05-17 07:37:56'),
(92, 1, 1, 'Ticket Approved', 'Ticket 333 has been approved and processed.', 'success', 'ticket', 'ticket', 51, 0, '2026-05-17 07:38:00', NULL, '2026-05-17 07:38:00'),
(96, 1, 1, 'New Ticket Pending Approval', 'Ticket tt-tt has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 53, 0, '2026-05-17 08:04:59', NULL, '2026-05-17 08:04:59'),
(97, 1, 1, 'New Ticket Pending Approval', 'Ticket tt-tt has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 53, 0, '2026-05-17 08:04:59', NULL, '2026-05-17 08:04:59'),
(98, 1, 3, 'New Ticket Pending Approval', 'Ticket tt-tt has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 53, 0, '2026-05-17 08:04:59', NULL, '2026-05-17 08:04:59'),
(99, 1, 1, 'Ticket Approved', 'Ticket tt-tt has been approved and processed.', 'success', 'ticket', 'ticket', 53, 0, '2026-05-17 08:05:13', NULL, '2026-05-17 08:05:13'),
(100, 1, 1, 'Ticket Approved', 'Ticket 2525 has been approved and processed.', 'success', 'ticket', 'ticket', 19, 0, '2026-05-17 08:16:08', NULL, '2026-05-17 08:16:08'),
(101, 1, 22, 'New Ticket Pending Approval', 'Ticket no2233 has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 54, 0, '2026-05-18 10:12:59', NULL, '2026-05-18 10:12:59'),
(102, 1, 1, 'New Ticket Pending Approval', 'Ticket no2233 has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 54, 0, '2026-05-18 10:12:59', NULL, '2026-05-18 10:12:59'),
(103, 1, 3, 'New Ticket Pending Approval', 'Ticket no2233 has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 54, 0, '2026-05-18 10:12:59', NULL, '2026-05-18 10:12:59'),
(104, 1, 22, 'New Ticket Pending Approval', 'Ticket no2233 has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 54, 0, '2026-05-18 10:12:59', NULL, '2026-05-18 10:12:59'),
(105, 1, 22, 'Ticket Approved', 'Ticket no2233 has been approved and processed.', 'success', 'ticket', 'ticket', 54, 0, '2026-05-18 10:13:04', NULL, '2026-05-18 10:13:04'),
(106, 1, 22, 'Ticket Refunded', 'Ticket no2233 has been refunded.$300 returned (penalty: $80).', 'warning', 'ticket', 'ticket', 54, 0, '2026-05-18 10:13:43', NULL, '2026-05-18 10:13:43'),
(107, 1, 22, 'New Ticket Pending Approval', 'Ticket tkt-2026-test has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 55, 0, '2026-05-22 13:34:33', NULL, '2026-05-22 13:34:33'),
(108, 1, 1, 'New Ticket Pending Approval', 'Ticket tkt-2026-test has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 55, 0, '2026-05-22 13:34:33', NULL, '2026-05-22 13:34:33'),
(109, 1, 3, 'New Ticket Pending Approval', 'Ticket tkt-2026-test has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 55, 0, '2026-05-22 13:34:33', NULL, '2026-05-22 13:34:33'),
(110, 1, 22, 'New Ticket Pending Approval', 'Ticket tkt-2026-test has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 55, 0, '2026-05-22 13:34:33', NULL, '2026-05-22 13:34:33'),
(111, 41, 47, 'New Deposit Request', 'Deposit MZR-2026-000001 for $50,000 is awaiting approval.', 'info', 'wallet', 'deposit', 2, 1, '2026-05-22 12:54:41', NULL, '2026-05-22 14:10:59'),
(112, 41, 47, 'New Ticket Pending Approval', 'Ticket tkt-123 has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 56, 1, '2026-05-22 12:54:36', NULL, '2026-05-22 16:43:06'),
(113, 41, 47, 'New Ticket Pending Approval', 'Ticket tkt-123 has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 56, 1, '2026-05-22 12:54:40', NULL, '2026-05-22 16:43:06'),
(114, 41, 47, 'New Ticket Pending Approval', 'Ticket hhh has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 57, 1, '2026-05-22 12:54:37', NULL, '2026-05-22 17:23:57'),
(115, 41, 47, 'New Ticket Pending Approval', 'Ticket hhh has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 57, 1, '2026-05-22 12:54:38', NULL, '2026-05-22 17:23:57'),
(116, 1, 22, 'Ticket Approved', 'Ticket tkt-2026-test has been approved and processed.', 'success', 'ticket', 'ticket', 55, 0, '2026-05-23 15:24:06', NULL, '2026-05-23 15:24:06'),
(117, 1, 22, 'New Ticket Pending Approval', 'Ticket jj-123 has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 58, 0, '2026-05-23 15:25:19', NULL, '2026-05-23 15:25:19'),
(118, 1, 1, 'New Ticket Pending Approval', 'Ticket jj-123 has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 58, 0, '2026-05-23 15:25:19', NULL, '2026-05-23 15:25:19'),
(119, 1, 3, 'New Ticket Pending Approval', 'Ticket jj-123 has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 58, 0, '2026-05-23 15:25:19', NULL, '2026-05-23 15:25:19'),
(120, 1, 22, 'New Ticket Pending Approval', 'Ticket jj-123 has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 58, 0, '2026-05-23 15:25:19', NULL, '2026-05-23 15:25:19'),
(121, 1, 22, 'Ticket Approved', 'Ticket jj-123 has been approved and processed.', 'success', 'ticket', 'ticket', 58, 0, '2026-05-23 15:25:22', NULL, '2026-05-23 15:25:22'),
(122, 43, 49, 'New Ticket Pending Approval', 'Ticket 8989 has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 59, 0, '2026-05-23 15:29:26', NULL, '2026-05-23 15:29:26'),
(123, 43, 49, 'New Ticket Pending Approval', 'Ticket 8989 has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 59, 0, '2026-05-23 15:29:26', NULL, '2026-05-23 15:29:26'),
(124, 43, 49, 'New Ticket Pending Approval', 'Ticket tt has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 60, 0, '2026-05-23 15:36:47', NULL, '2026-05-23 15:36:47'),
(125, 43, 49, 'New Ticket Pending Approval', 'Ticket tt has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 60, 0, '2026-05-23 15:36:47', NULL, '2026-05-23 15:36:47'),
(126, 43, 49, 'Ticket Approved', 'Ticket tt has been approved and processed.', 'success', 'ticket', 'ticket', 60, 0, '2026-05-23 15:36:49', NULL, '2026-05-23 15:36:49'),
(127, 43, 49, 'New Ticket Pending Approval', 'Ticket kjk has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 61, 0, '2026-05-23 15:39:25', NULL, '2026-05-23 15:39:25'),
(128, 43, 49, 'New Ticket Pending Approval', 'Ticket kjk has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 61, 0, '2026-05-23 15:39:25', NULL, '2026-05-23 15:39:25'),
(129, 43, 49, 'Ticket Approved', 'Ticket kjk has been approved and processed.', 'success', 'ticket', 'ticket', 61, 0, '2026-05-23 15:39:27', NULL, '2026-05-23 15:39:27'),
(130, 44, 50, 'New Ticket Pending Approval', 'Ticket jfk-123 has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 62, 1, '2026-05-24 06:45:09', NULL, '2026-05-24 07:43:16'),
(131, 44, 50, 'New Ticket Pending Approval', 'Ticket jfk-123 has been created and is awaiting approval.', 'info', 'ticket', 'ticket', 62, 1, '2026-05-24 06:45:10', NULL, '2026-05-24 07:43:16'),
(132, 44, 50, 'Ticket Approved', 'Ticket jfk-123 has been approved and processed.', 'success', 'ticket', 'ticket', 62, 1, '2026-05-24 06:45:04', NULL, '2026-05-24 07:43:19'),
(133, 44, 50, 'New Deposit Request', 'Deposit MZR-2026-000001 for $500 is awaiting approval.', 'info', 'wallet', 'deposit', 3, 1, '2026-05-24 06:45:02', NULL, '2026-05-24 07:45:21'),
(134, 44, 50, 'Deposit Approved', 'Deposit MZR-2026-000001 has been approved.', 'success', 'wallet', 'deposit', 3, 1, '2026-05-24 06:44:59', NULL, '2026-05-24 07:45:23'),
(135, 44, 50, 'Deposit Approved', 'Deposit MZR-2026-000001 has been approved.', 'success', 'wallet', 'deposit', 3, 1, '2026-05-24 06:45:01', NULL, '2026-05-24 07:45:23'),
(136, 44, 50, 'New Expense Submitted', 'Expense \"iii\" ($100) is awaiting approval.', 'info', 'expense', 'expense', 13, 1, '2026-05-24 06:45:00', NULL, '2026-05-24 11:12:48');

-- --------------------------------------------------------

--
-- Table structure for table `payment_locations`
--

CREATE TABLE `payment_locations` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `city` varchar(100) NOT NULL,
  `address` text DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `opening_hours` varchar(255) DEFAULT NULL,
  `supported_methods` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`supported_methods`)),
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `payment_locations`
--

INSERT INTO `payment_locations` (`id`, `tenant_id`, `name`, `city`, `address`, `phone`, `email`, `opening_hours`, `supported_methods`, `status`, `created_at`, `updated_at`) VALUES
(1, 1, 'Pouyan Shahr Balkh', 'Mazar-i-Sharif', 'opposite door of Court of Apeals', '0711340970', 'pouyanshahrbalkh.travel@gmail.com', 'Sat-Thu 08:00 AM 05:00 PM', NULL, 'active', '2026-05-17 02:44:37', '2026-05-17 02:44:37'),
(2, 44, 'Pouyan Shahr Balkh', 'Mazar-i-Sharif', 'airport street kabul afghanistan', '0782636327', 'roheen.aqaie@psb-erp.com', '', NULL, 'active', '2026-05-24 07:46:41', '2026-05-24 07:46:41');

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`permissions`)),
  `is_system` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `tenant_id`, `name`, `slug`, `description`, `permissions`, `is_system`, `created_at`) VALUES
(1, 1, 'Administrator', 'admin', 'Full system access', '[\"*\"]', 1, '2026-05-11 10:23:06'),
(2, 1, 'Manager', 'manager', 'Manage operations and teams', '[\"dashboard:read\",\"tickets:*\",\"crm:*\",\"expenses:*\",\"accounting:read\",\"reports:*\",\"wallet:*\"]', 1, '2026-05-11 10:23:06'),
(3, 1, 'Accountant', 'accountant', 'Financial operations', '[\"dashboard:read\",\"accounting:*\",\"expenses:*\",\"wallet:*\",\"reports:read\"]', 1, '2026-05-11 10:23:06'),
(4, 1, 'Travel Agent', 'agent', 'Ticket sales and CRM', '[\"dashboard:read\",\"tickets:*\",\"crm:*\",\"expenses:create\"]', 1, '2026-05-11 10:23:06');

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `token` varchar(255) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `subscriptions`
--

CREATE TABLE `subscriptions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `plan` varchar(100) NOT NULL,
  `duration_months` int(11) DEFAULT 1,
  `status` enum('pending','active','expired','suspended') DEFAULT 'pending',
  `starts_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `approved_by` bigint(20) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `subscriptions`
--

INSERT INTO `subscriptions` (`id`, `tenant_id`, `plan`, `duration_months`, `status`, `starts_at`, `expires_at`, `approved_by`, `approved_at`, `created_at`, `updated_at`) VALUES
(1, 2, 'Professional', 1, 'active', '2026-05-16 22:40:06', '2027-05-16 22:40:06', NULL, NULL, '2026-05-16 18:10:06', '2026-05-16 18:10:06'),
(2, 1, 'Professional', 1, 'active', '2026-05-16 22:40:06', '2027-05-16 22:40:06', NULL, NULL, '2026-05-16 18:10:06', '2026-05-16 18:10:06'),
(3, 35, 'starter', 1, 'pending', NULL, NULL, NULL, NULL, '2026-05-18 08:06:50', '2026-05-18 08:06:50'),
(4, 36, 'starter', 12, 'pending', NULL, NULL, NULL, NULL, '2026-05-18 09:47:51', '2026-05-18 09:47:51'),
(5, 37, 'starter', 3, 'pending', NULL, NULL, NULL, NULL, '2026-05-18 15:16:53', '2026-05-18 15:16:53'),
(6, 38, 'starter', 1, 'pending', NULL, NULL, NULL, NULL, '2026-05-19 09:43:02', '2026-05-19 09:43:02'),
(7, 40, 'starter', 1, 'active', '2026-05-19 10:26:06', '2026-06-19 10:26:06', 22, '2026-05-19 10:26:06', '2026-05-19 10:19:35', '2026-05-19 05:56:06'),
(8, 41, 'starter', 1, 'active', '2026-05-19 11:41:53', '2026-06-19 11:41:53', 22, '2026-05-19 11:41:53', '2026-05-19 11:41:13', '2026-05-19 07:11:53'),
(9, 42, 'starter', 1, 'active', '2026-05-22 17:27:46', '2026-06-22 17:27:46', 1, '2026-05-22 17:27:46', '2026-05-22 17:26:35', '2026-05-22 12:57:46'),
(10, 43, 'starter', 1, 'active', '2026-05-23 15:23:56', '2026-06-23 15:23:56', 22, '2026-05-23 15:23:56', '2026-05-23 15:22:09', '2026-05-23 10:53:56'),
(11, 44, 'starter', 1, 'active', '2026-05-24 07:40:32', '2026-06-24 07:40:32', 1, '2026-05-24 07:40:32', '2026-05-24 07:40:09', '2026-05-24 03:10:32');

-- --------------------------------------------------------

--
-- Table structure for table `suppliers`
--

CREATE TABLE `suppliers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `supplier_code` varchar(50) NOT NULL,
  `company_name` varchar(200) NOT NULL,
  `trade_name` varchar(200) DEFAULT NULL,
  `supplier_type` enum('airline','hotel','tour_operator','car_rental','insurance','visa_service','other') NOT NULL DEFAULT 'other',
  `tax_id` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `website` varchar(200) DEFAULT NULL,
  `credit_limit` decimal(15,2) NOT NULL DEFAULT 0.00,
  `balance_due` decimal(15,2) NOT NULL DEFAULT 0.00,
  `payment_terms` int(11) DEFAULT 30,
  `currency` varchar(3) DEFAULT 'USD',
  `status` enum('active','inactive','blocked') NOT NULL DEFAULT 'active',
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `suppliers`
--

INSERT INTO `suppliers` (`id`, `tenant_id`, `supplier_code`, `company_name`, `trade_name`, `supplier_type`, `tax_id`, `email`, `phone`, `address`, `city`, `country`, `website`, `credit_limit`, `balance_due`, `payment_terms`, `currency`, `status`, `notes`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 1, 'SUP-2026-0001', 'test', 'test1', 'airline', '1234', 'test@test.com', '0789101112', 'test@test.com', 'mazar i sharif', 'Afghanistan', 'www.psb-erp.com', 20000.00, 120000.00, 30, 'USD', 'active', NULL, NULL, '2026-05-17 06:40:33', '2026-05-17 03:03:14'),
(2, 44, 'SUP-2026-0001', 'tomorrow tour', NULL, 'airline', '78654', 'test@test.com', '123456789', 'herat', 'jebrail', 'afghanistan', NULL, 5000.00, 1005.00, 30, 'USD', 'active', NULL, NULL, '2026-05-24 07:48:18', '2026-05-24 03:20:01');

-- --------------------------------------------------------

--
-- Table structure for table `supplier_contacts`
--

CREATE TABLE `supplier_contacts` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `supplier_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `position` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `is_primary` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `supplier_payments`
--

CREATE TABLE `supplier_payments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `supplier_id` bigint(20) UNSIGNED NOT NULL,
  `bill_id` bigint(20) UNSIGNED DEFAULT NULL,
  `payment_number` varchar(100) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `payment_method` enum('cash','bank_transfer','cheque','credit_card','wallet') NOT NULL,
  `payment_date` date NOT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `bank_account_id` bigint(20) UNSIGNED DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `journal_entry_id` bigint(20) UNSIGNED DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` bigint(20) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `system_settings`
--

CREATE TABLE `system_settings` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `key` varchar(100) NOT NULL,
  `value` text DEFAULT NULL,
  `category` varchar(50) DEFAULT 'general',
  `description` text DEFAULT NULL,
  `updated_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `system_settings`
--

INSERT INTO `system_settings` (`id`, `tenant_id`, `key`, `value`, `category`, `description`, `updated_by`, `created_at`, `updated_at`) VALUES
(1, 43, 'company_name', '', 'general', 'Company legal name', 22, '2026-05-23 15:23:56', '2026-05-23 15:23:56'),
(2, 43, 'company_address', '', 'general', 'Company address', 22, '2026-05-23 15:23:56', '2026-05-23 15:23:56'),
(3, 43, 'company_phone', '', 'general', 'Company phone', 22, '2026-05-23 15:23:56', '2026-05-23 15:23:56'),
(4, 43, 'company_email', '', 'general', 'Company email', 22, '2026-05-23 15:23:56', '2026-05-23 15:23:56'),
(5, 43, 'default_currency', 'USD', 'currency', 'Default currency code', 22, '2026-05-23 15:23:56', '2026-05-23 15:23:56'),
(6, 43, 'supported_currencies', '[\"USD\",\"AFN\",\"EUR\",\"AED\"]', 'currency', 'Supported currency codes', 22, '2026-05-23 15:23:56', '2026-05-23 15:23:56'),
(7, 43, 'default_tax_rate', '0', 'tax', 'Default tax rate percentage', 22, '2026-05-23 15:23:56', '2026-05-23 15:23:56'),
(8, 43, 'tax_inclusive_pricing', 'false', 'tax', 'Prices include tax by default', 22, '2026-05-23 15:23:56', '2026-05-23 15:23:56'),
(9, 43, 'default_commission_rate', '0', 'commission', 'Default commission rate percentage', 22, '2026-05-23 15:23:56', '2026-05-23 15:23:56'),
(10, 43, 'commission_auto_post', 'true', 'commission', 'Auto-post commission journal entries', 22, '2026-05-23 15:23:56', '2026-05-23 15:23:56'),
(11, 43, 'ticket_approval_required', 'true', 'approval', 'Tickets require manager approval', 22, '2026-05-23 15:23:56', '2026-05-23 15:23:56'),
(12, 43, 'expense_approval_required', 'true', 'approval', 'Expenses require manager approval', 22, '2026-05-23 15:23:56', '2026-05-23 15:23:56'),
(13, 43, 'deposit_approval_required', 'true', 'approval', 'Deposits require manager approval', 22, '2026-05-23 15:23:56', '2026-05-23 15:23:56'),
(14, 43, 'invoice_prefix', 'INV', 'numbering', 'Invoice number prefix', 22, '2026-05-23 15:23:56', '2026-05-23 15:23:56'),
(15, 43, 'deposit_prefix', 'MZR', 'numbering', 'Deposit code prefix', 22, '2026-05-23 15:23:56', '2026-05-23 15:23:56'),
(16, 43, 'ticket_prefix', 'TCK', 'numbering', 'Ticket number prefix', 22, '2026-05-23 15:23:56', '2026-05-23 15:23:56'),
(17, 43, 'bill_prefix', 'BILL', 'numbering', 'Bill number prefix', 22, '2026-05-23 15:23:56', '2026-05-23 15:23:56'),
(18, 43, 'payment_prefix', 'SP', 'numbering', 'Supplier payment prefix', 22, '2026-05-23 15:23:56', '2026-05-23 15:23:56'),
(19, 43, 'supplier_prefix', 'SUP', 'numbering', 'Supplier code prefix', 22, '2026-05-23 15:23:56', '2026-05-23 15:23:56'),
(20, 43, 'expense_prefix', 'EXP', 'numbering', 'Expense reference prefix', 22, '2026-05-23 15:23:56', '2026-05-23 15:23:56'),
(21, 43, 'journal_prefix', 'JE', 'numbering', 'Journal entry prefix', 22, '2026-05-23 15:23:56', '2026-05-23 15:23:56'),
(22, 43, 'numbering_year_reset', 'true', 'numbering', 'Reset sequence numbers yearly', 22, '2026-05-23 15:23:56', '2026-05-23 15:23:56'),
(23, 43, 'email_notifications_enabled', 'false', 'notifications', 'Enable email notifications', 22, '2026-05-23 15:23:56', '2026-05-23 15:23:56'),
(24, 43, 'notify_on_ticket_booking', 'true', 'notifications', 'Notify admins on new ticket', 22, '2026-05-23 15:23:56', '2026-05-23 15:23:56'),
(25, 43, 'notify_on_deposit', 'true', 'notifications', 'Notify admins on deposit request', 22, '2026-05-23 15:23:56', '2026-05-23 15:23:56'),
(26, 43, 'notify_on_expense', 'true', 'notifications', 'Notify admins on expense submission', 22, '2026-05-23 15:23:56', '2026-05-23 15:23:56'),
(27, 44, 'company_name', '', 'general', 'Company legal name', 1, '2026-05-24 07:40:32', '2026-05-24 07:40:32'),
(28, 44, 'company_address', '', 'general', 'Company address', 1, '2026-05-24 07:40:32', '2026-05-24 07:40:32'),
(29, 44, 'company_phone', '', 'general', 'Company phone', 1, '2026-05-24 07:40:32', '2026-05-24 07:40:32'),
(30, 44, 'company_email', '', 'general', 'Company email', 1, '2026-05-24 07:40:32', '2026-05-24 07:40:32'),
(31, 44, 'default_currency', 'USD', 'currency', 'Default currency code', 1, '2026-05-24 07:40:32', '2026-05-24 07:40:32'),
(32, 44, 'supported_currencies', '[\"USD\",\"AFN\",\"EUR\",\"AED\"]', 'currency', 'Supported currency codes', 1, '2026-05-24 07:40:32', '2026-05-24 07:40:32'),
(33, 44, 'default_tax_rate', '0', 'tax', 'Default tax rate percentage', 1, '2026-05-24 07:40:32', '2026-05-24 07:40:32'),
(34, 44, 'tax_inclusive_pricing', 'false', 'tax', 'Prices include tax by default', 1, '2026-05-24 07:40:32', '2026-05-24 07:40:32'),
(35, 44, 'default_commission_rate', '0', 'commission', 'Default commission rate percentage', 1, '2026-05-24 07:40:32', '2026-05-24 07:40:32'),
(36, 44, 'commission_auto_post', 'true', 'commission', 'Auto-post commission journal entries', 1, '2026-05-24 07:40:32', '2026-05-24 07:40:32'),
(37, 44, 'ticket_approval_required', 'true', 'approval', 'Tickets require manager approval', 1, '2026-05-24 07:40:32', '2026-05-24 07:40:32'),
(38, 44, 'expense_approval_required', 'true', 'approval', 'Expenses require manager approval', 1, '2026-05-24 07:40:32', '2026-05-24 07:40:32'),
(39, 44, 'deposit_approval_required', 'true', 'approval', 'Deposits require manager approval', 1, '2026-05-24 07:40:32', '2026-05-24 07:40:32'),
(40, 44, 'invoice_prefix', 'INV', 'numbering', 'Invoice number prefix', 1, '2026-05-24 07:40:32', '2026-05-24 07:40:32'),
(41, 44, 'deposit_prefix', 'MZR', 'numbering', 'Deposit code prefix', 1, '2026-05-24 07:40:32', '2026-05-24 07:40:32'),
(42, 44, 'ticket_prefix', 'TCK', 'numbering', 'Ticket number prefix', 1, '2026-05-24 07:40:32', '2026-05-24 07:40:32'),
(43, 44, 'bill_prefix', 'BILL', 'numbering', 'Bill number prefix', 1, '2026-05-24 07:40:32', '2026-05-24 07:40:32'),
(44, 44, 'payment_prefix', 'SP', 'numbering', 'Supplier payment prefix', 1, '2026-05-24 07:40:32', '2026-05-24 07:40:32'),
(45, 44, 'supplier_prefix', 'SUP', 'numbering', 'Supplier code prefix', 1, '2026-05-24 07:40:32', '2026-05-24 07:40:32'),
(46, 44, 'expense_prefix', 'EXP', 'numbering', 'Expense reference prefix', 1, '2026-05-24 07:40:32', '2026-05-24 07:40:32'),
(47, 44, 'journal_prefix', 'JE', 'numbering', 'Journal entry prefix', 1, '2026-05-24 07:40:32', '2026-05-24 07:40:32'),
(48, 44, 'numbering_year_reset', 'true', 'numbering', 'Reset sequence numbers yearly', 1, '2026-05-24 07:40:32', '2026-05-24 07:40:32'),
(49, 44, 'email_notifications_enabled', 'false', 'notifications', 'Enable email notifications', 1, '2026-05-24 07:40:32', '2026-05-24 07:40:32'),
(50, 44, 'notify_on_ticket_booking', 'true', 'notifications', 'Notify admins on new ticket', 1, '2026-05-24 07:40:32', '2026-05-24 07:40:32'),
(51, 44, 'notify_on_deposit', 'true', 'notifications', 'Notify admins on deposit request', 1, '2026-05-24 07:40:32', '2026-05-24 07:40:32'),
(52, 44, 'notify_on_expense', 'true', 'notifications', 'Notify admins on expense submission', 1, '2026-05-24 07:40:32', '2026-05-24 07:40:32');

-- --------------------------------------------------------

--
-- Table structure for table `tenants`
--

CREATE TABLE `tenants` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `domain` varchar(255) DEFAULT NULL,
  `logo` text DEFAULT NULL,
  `settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`settings`)),
  `status` enum('active','suspended','trial','cancelled','pending','rejected') NOT NULL DEFAULT 'trial',
  `plan` enum('free','starter','professional','enterprise') NOT NULL DEFAULT 'free',
  `registration_token` varchar(50) DEFAULT NULL,
  `owner_name` varchar(255) DEFAULT NULL,
  `owner_email` varchar(320) DEFAULT NULL,
  `owner_phone` varchar(50) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `trial_ends_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tenants`
--

INSERT INTO `tenants` (`id`, `name`, `slug`, `domain`, `logo`, `settings`, `status`, `plan`, `registration_token`, `owner_name`, `owner_email`, `owner_phone`, `address`, `city`, `trial_ends_at`, `created_at`, `updated_at`) VALUES
(1, 'Pioneer Travel Agency', 'pioneer-travel', 'pioneer.psb-erp.com', NULL, '{\"currency\":\"USD\",\"timezone\":\"America/New_York\",\"language\":\"en\"}', 'active', 'enterprise', NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-11 10:23:06', '2026-05-11 10:23:06', '2026-05-11 10:23:06'),
(2, 'Global Wings Travel', 'global-wings', 'globalwings.psb-erp.com', NULL, '{\"currency\":\"EUR\",\"timezone\":\"Europe/London\",\"language\":\"en\"}', 'active', 'professional', NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-11 10:23:06', '2026-05-11 10:23:06', '2026-05-11 10:23:06'),
(6, 'Smoke Test Tenant', 'smoke-test-1778955027007', NULL, NULL, NULL, 'active', 'enterprise', NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-16 18:10:27', '2026-05-16 18:10:27', '2026-05-16 18:10:27'),
(7, 'Smoke Test Tenant', 'smoke-test-1778956055108', NULL, NULL, NULL, 'active', 'enterprise', NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-16 18:27:35', '2026-05-16 18:27:35', '2026-05-16 18:27:35'),
(25, 'Smoke Test Tenant', 'smoke-test-1778996979820', NULL, NULL, NULL, 'active', 'enterprise', NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-17 05:49:39', '2026-05-17 05:49:39', '2026-05-17 05:49:39'),
(33, 'PSB', 'psb', NULL, NULL, NULL, '', 'starter', 'REG-2026-000001', 'Roheen', 'pouyanshahrbalkh.travel@gmail.com', '0711340970', 'Mazar sharif', 'balkh', '2026-05-17 08:22:07', '2026-05-17 08:22:07', '2026-05-17 03:52:07'),
(34, 'test', 'test', NULL, NULL, NULL, '', 'starter', 'REG-2026-000001', 'test1', 'test@test.com', '0789123456', 'sdffgfdgdf', 'kjkjkj', '2026-05-18 07:46:30', '2026-05-18 07:46:30', '2026-05-18 03:16:30'),
(35, 'test420', 'test420', NULL, NULL, NULL, '', 'starter', 'REG-2026-000001', 'test1', 'gbbb@bjjnjn.com', 'lkkkjjb', 'bbbbb', 'bbbbb', '2026-05-18 08:06:50', '2026-05-18 08:06:50', '2026-05-18 03:36:50'),
(36, 'PSB1', 'psb1', NULL, NULL, NULL, '', 'starter', 'REG-2026-000001', 'Roheen', 'pouyan.shahrbalkh.travel@gmail.com', '0711340970', 'mazar', 'mazar', '2026-05-18 09:47:51', '2026-05-18 09:47:51', '2026-05-18 05:17:51'),
(37, 'Elham', 'elham', NULL, NULL, NULL, '', 'starter', 'REG-2026-000001', 'Elhamuddin', 'elhammukhtari12345@gmail.com', '0782636327', 'kabul', 'kabul', '2026-05-18 15:16:53', '2026-05-18 15:16:53', '2026-05-18 10:46:53'),
(38, 'test12', 'test12', NULL, NULL, NULL, '', 'starter', 'REG-2026-000001', 'test12', 'super.admin@psb.local', '000000000000000', 'test@test.com', 'mazar', '2026-05-19 09:43:02', '2026-05-19 09:43:02', '2026-05-19 05:13:02'),
(39, 'regtest-1779184704650', 'regtest-1779184704649', NULL, NULL, NULL, '', 'starter', NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-19 09:58:24', '2026-05-19 09:58:24', '2026-05-19 09:58:24'),
(40, 'final', 'final', NULL, NULL, NULL, 'active', 'starter', 'REG-2026-000001', 'final', 'superadmin@psb.locall', '0987654321', 'balkh', 'mazar', '2026-05-19 10:26:06', '2026-05-19 10:19:35', '2026-05-19 05:56:06'),
(41, 'behrooz', 'behrooz', NULL, NULL, NULL, 'active', 'starter', 'REG-2026-000001', 'behrooz 1', 'behrooz.haidari@psb-erp.com', '0782121202', 'kabul', 'qarqha', '2026-05-19 11:41:53', '2026-05-19 11:41:13', '2026-05-19 07:11:53'),
(42, 'test20', 'test20', NULL, NULL, NULL, 'active', 'starter', 'REG-2026-000001', 'test20', 'test20@psb-erp.com', '07818398969', '72 mayswood garden, Dagenham', 'Degenham', '2026-05-22 17:27:46', '2026-05-22 17:26:35', '2026-05-22 12:57:46'),
(43, 'Elham-air', 'elham-air', NULL, NULL, NULL, 'active', 'starter', 'REG-2026-000001', 'Elhamuddin', 'elham.mukhtari@psb-erp.com', '0792119298', 'kabul', 'shahrak aria', '2026-05-23 15:23:56', '2026-05-23 15:22:09', '2026-05-23 10:53:56'),
(44, 'final test', 'final-test', NULL, NULL, NULL, 'active', 'starter', 'REG-2026-000001', 'Elhamuddin', 'elhammukhtari123456@gmail.com', '0782636327', 'kabul, shahr new ', 'kabul', '2026-05-24 07:40:32', '2026-05-24 07:40:09', '2026-05-24 03:10:32');

-- --------------------------------------------------------

--
-- Table structure for table `tickets`
--

CREATE TABLE `tickets` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `ticket_number` varchar(50) NOT NULL,
  `pnr_code` varchar(20) DEFAULT NULL,
  `airline_id` bigint(20) UNSIGNED DEFAULT NULL,
  `customer_id` bigint(20) UNSIGNED DEFAULT NULL,
  `booking_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `travel_date` date DEFAULT NULL,
  `return_date` date DEFAULT NULL,
  `route_from` varchar(10) NOT NULL,
  `route_to` varchar(10) NOT NULL,
  `trip_type` enum('one_way','round_trip','multi_city') NOT NULL DEFAULT 'one_way',
  `class` enum('economy','premium_economy','business','first') NOT NULL DEFAULT 'economy',
  `base_fare` decimal(12,2) NOT NULL DEFAULT 0.00,
  `tax_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `commission_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `net_payable` decimal(12,2) NOT NULL DEFAULT 0.00,
  `payment_status` enum('pending','partial','paid','refunded','cancelled') NOT NULL DEFAULT 'pending',
  `status` enum('confirmed','pending','cancelled','refunded','completed') NOT NULL DEFAULT 'pending',
  `issued_by` bigint(20) UNSIGNED DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` int(11) DEFAULT NULL,
  `paid_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `supplier_cost` decimal(12,2) NOT NULL DEFAULT 0.00,
  `expense` decimal(12,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tickets`
--

INSERT INTO `tickets` (`id`, `tenant_id`, `ticket_number`, `pnr_code`, `airline_id`, `customer_id`, `booking_date`, `travel_date`, `return_date`, `route_from`, `route_to`, `trip_type`, `class`, `base_fare`, `tax_amount`, `total_amount`, `commission_amount`, `net_payable`, `payment_status`, `status`, `issued_by`, `notes`, `metadata`, `created_at`, `updated_at`, `deleted_at`, `deleted_by`, `paid_amount`, `supplier_cost`, `expense`) VALUES
(1, 1, 'TKT-2026-001', 'ABC123', 1, 1, '2026-05-11 10:23:06', '2026-06-15', '2026-06-22', 'JFK', 'LHR', 'round_trip', 'business', 2800.00, 450.00, 3250.00, 325.00, 2925.00, 'paid', 'confirmed', 4, NULL, NULL, '2026-05-11 10:23:06', '2026-05-11 10:23:06', NULL, NULL, 0.00, 0.00, 0.00),
(2, 1, 'TKT-2026-002', 'DEF456', 2, 2, '2026-05-11 10:23:06', '2026-06-20', '2026-06-25', 'LAX', 'CDG', 'round_trip', 'economy', 850.00, 180.00, 1030.00, 103.00, 927.00, 'paid', 'confirmed', 4, NULL, NULL, '2026-05-11 10:23:06', '2026-05-11 10:23:06', NULL, NULL, 0.00, 0.00, 0.00),
(3, 1, 'TKT-2026-003', 'GHI789', 3, 3, '2026-05-11 10:23:06', '2026-07-01', NULL, 'ORD', 'NRT', 'one_way', 'premium_economy', 1200.00, 220.00, 1420.00, 142.00, 1278.00, 'partial', 'pending', 5, NULL, NULL, '2026-05-11 10:23:06', '2026-05-11 10:23:06', NULL, NULL, 0.00, 0.00, 0.00),
(4, 1, 'TKT-2026-004', 'JKL012', 4, 4, '2026-05-11 10:23:06', '2026-05-25', '2026-06-05', 'MIA', 'DXB', 'round_trip', 'first', 8500.00, 1200.00, 9700.00, 970.00, 8730.00, 'paid', 'confirmed', 4, NULL, NULL, '2026-05-11 10:23:06', '2026-05-11 10:23:06', NULL, NULL, 0.00, 0.00, 0.00),
(5, 1, 'TKT-2026-005', 'MNO345', 5, 5, '2026-05-11 10:23:06', '2026-06-10', '2026-06-18', 'SFO', 'SIN', 'round_trip', 'business', 5200.00, 680.00, 5880.00, 588.00, 5292.00, 'paid', 'confirmed', 5, NULL, NULL, '2026-05-11 10:23:06', '2026-05-11 10:23:06', NULL, NULL, 0.00, 0.00, 0.00),
(6, 1, 'TKT-2026-006', 'PQR678', 6, 1, '2026-05-11 10:23:06', '2026-07-15', NULL, 'BOS', 'FRA', 'one_way', 'economy', 750.00, 150.00, 900.00, 90.00, 810.00, 'pending', 'pending', 4, NULL, NULL, '2026-05-11 10:23:06', '2026-05-11 10:23:06', NULL, NULL, 0.00, 0.00, 0.00),
(7, 1, 'TKT-2026-007', 'STU901', 7, 6, '2026-05-11 10:23:06', '2026-05-30', '2026-06-07', 'SEA', 'CDG', 'round_trip', 'economy', 920.00, 195.00, 1115.00, 111.50, 1003.50, 'paid', 'completed', 5, NULL, NULL, '2026-05-11 10:23:06', '2026-05-11 10:23:06', NULL, NULL, 0.00, 0.00, 0.00),
(8, 1, 'TKT-2026-008', 'VWX234', 8, 7, '2026-05-11 10:23:06', '2026-06-25', NULL, 'DFW', 'SIN', 'one_way', 'business', 4200.00, 550.00, 4750.00, 475.00, 4275.00, 'partial', 'pending', 4, NULL, NULL, '2026-05-11 10:23:06', '2026-05-11 10:23:06', NULL, NULL, 0.00, 0.00, 0.00),
(9, 1, 'TKT-2026-009', 'YZA567', 1, 8, '2026-05-11 10:23:06', '2026-04-15', '2026-04-20', 'ATL', 'LHR', 'round_trip', 'economy', 680.00, 140.00, 820.00, 82.00, 738.00, 'refunded', 'refunded', 5, NULL, NULL, '2026-05-11 10:23:06', '2026-05-11 10:23:06', NULL, NULL, 0.00, 0.00, 0.00),
(10, 1, 'TKT-2026-010', 'BCD890', 3, 4, '2026-05-11 10:23:06', '2026-08-01', '2026-08-10', 'DEN', 'HND', 'round_trip', 'business', 3800.00, 520.00, 4320.00, 432.00, 3888.00, 'paid', 'confirmed', 4, NULL, NULL, '2026-05-11 10:23:06', '2026-05-11 10:23:06', NULL, NULL, 0.00, 0.00, 0.00),
(11, 1, 'rr', 'eee3', 1, NULL, '2026-05-12 09:46:02', '2026-12-09', NULL, 'JFK', 'LHR', 'one_way', 'business', 12.00, 12.00, 24.00, 5.00, 19.00, 'pending', 'pending', 1, '', NULL, '2026-05-12 09:46:02', '2026-05-12 09:46:02', NULL, NULL, 0.00, 0.00, 0.00),
(12, 1, 'eee', 'eee123', 10, NULL, '2026-05-12 10:02:00', '2026-05-12', NULL, 'KBL', 'TEHR', 'one_way', 'economy', 0.00, 0.00, 0.00, 0.00, 0.00, 'pending', 'pending', 1, 'hi', NULL, '2026-05-12 10:02:00', '2026-05-12 10:02:00', NULL, NULL, 0.00, 0.00, 0.00),
(13, 1, 'test1', 't123', 10, NULL, '2026-05-12 12:04:16', '2026-05-12', NULL, 'JFK', 'LHR', 'one_way', 'business', 2.00, 2.00, 4.00, 6.00, 4.00, 'pending', 'pending', 1, 'test1', NULL, '2026-05-12 12:04:16', '2026-05-12 12:04:16', NULL, NULL, 0.00, 0.00, 0.00),
(14, 1, 'test1', 't123', 10, NULL, '2026-05-12 12:33:55', '2026-05-12', NULL, 'JFK', 'LHR', 'one_way', 'business', 5.00, 5.00, 10.00, 15.00, 10.00, 'pending', 'pending', 1, 'test', NULL, '2026-05-12 12:33:55', '2026-05-12 12:33:55', NULL, NULL, 0.00, 0.00, 0.00),
(15, 1, 'test2', 't222', 9, NULL, '2026-05-12 12:36:33', '2026-05-12', NULL, 'JFK', 'KBL', 'one_way', 'first', 0.00, 0.00, 10000.00, 0.00, 0.00, 'pending', 'pending', 1, 'test2', NULL, '2026-05-12 12:36:33', '2026-05-12 12:36:33', NULL, NULL, 0.00, 0.00, 0.00),
(16, 1, 'test3', 't33', 4, NULL, '2026-05-12 13:13:25', '2026-05-12', '2026-05-20', 'JFK', 'LHR', 'one_way', 'economy', 0.00, 0.00, 20000.00, 0.00, 0.00, 'pending', 'pending', 1, 'test3', NULL, '2026-05-12 13:13:25', '2026-05-12 13:13:25', NULL, NULL, 0.00, 0.00, 0.00),
(17, 1, 'test4', 'ts4', 9, NULL, '2026-05-13 07:01:24', '2026-05-13', NULL, 'KBL', 'LHR', 'one_way', 'economy', 0.00, 0.00, 9990.00, 0.00, 0.00, 'pending', 'pending', 1, 'test4', NULL, '2026-05-13 07:01:24', '2026-05-13 07:01:24', NULL, NULL, 0.00, 0.00, 0.00),
(18, 1, 'tkt-5', 't-5', 4, NULL, '2026-05-13 07:49:08', '2026-05-13', NULL, 'JFK', 'LHR', 'one_way', 'economy', 0.00, 0.00, 11000.00, 0.00, 0.00, 'pending', 'pending', 1, '', NULL, '2026-05-13 07:49:08', '2026-05-13 07:49:08', NULL, NULL, 0.00, 0.00, 0.00),
(19, 1, '2525', 't1', 14, NULL, '2026-05-13 08:35:15', '2026-05-13', NULL, 'JFK', 'LHR', 'one_way', 'economy', 0.00, 0.00, 2000.00, 0.00, 0.00, 'paid', 'confirmed', 1, '', NULL, '2026-05-13 08:35:15', '2026-05-17 03:46:08', NULL, NULL, 0.00, 0.00, 0.00),
(20, 1, 'rr', '123', 2, NULL, '2026-05-13 08:38:18', '2026-05-13', NULL, 'JFK', 'LHR', 'one_way', 'premium_economy', 0.00, 0.00, 10000.00, 0.00, 0.00, 'pending', 'pending', 1, '', NULL, '2026-05-13 08:38:18', '2026-05-13 08:38:18', NULL, NULL, 0.00, 0.00, 0.00),
(21, 1, 'tkt-121', 't12', 2, NULL, '2026-05-13 08:56:59', '2026-05-13', NULL, 'JFK', 'IND', 'one_way', 'economy', 0.00, 0.00, 15000.00, 0.00, 0.00, 'pending', 'pending', 1, '', NULL, '2026-05-13 08:56:59', '2026-05-13 08:56:59', NULL, NULL, 0.00, 0.00, 0.00),
(22, 1, 'ww', '12', 11, NULL, '2026-05-13 09:07:38', '2026-05-13', NULL, 'JKF', 'LHR', 'one_way', 'business', 0.00, 0.00, 10000.00, 0.00, 0.00, 'pending', 'pending', 1, '', NULL, '2026-05-13 09:07:38', '2026-05-13 09:07:38', NULL, NULL, 0.00, 0.00, 0.00),
(23, 1, 'tt1', 'tt2', 5, NULL, '2026-05-13 10:49:08', '2026-05-13', NULL, 'TEH', 'KBL', 'one_way', 'business', 4990.00, 10.00, 5000.00, 10.00, 4990.00, 'cancelled', 'cancelled', 1, 'test', NULL, '2026-05-13 10:49:08', '2026-05-17 01:33:42', NULL, NULL, 0.00, 0.00, 0.00),
(48, 1, '12', 'test12', 9, 28, '2026-05-17 06:30:40', '2026-05-17', NULL, 'JFK', 'LHR', 'one_way', 'economy', 500.00, 0.00, 500.00, 0.00, 500.00, 'paid', 'confirmed', 1, '', '{\"walletId\":9}', '2026-05-17 06:30:40', '2026-05-17 02:00:45', NULL, NULL, 0.00, 0.00, 0.00),
(50, 1, '2020', 'pnr123', 9, 9, '2026-05-17 07:29:34', '2026-05-17', '2026-05-30', 'JFK', 'LHR', 'round_trip', 'business', 0.00, 0.00, 0.00, 0.00, 0.00, 'paid', 'confirmed', 1, '', '{\"walletId\":11}', '2026-05-17 07:29:34', '2026-05-17 03:00:20', NULL, NULL, 1000.00, 0.00, 0.00),
(51, 1, '333', '222', 1, NULL, '2026-05-17 07:37:56', '2026-05-17', '2026-05-24', 'KBL', 'LHR', 'round_trip', 'economy', 0.00, 0.00, 0.00, 0.00, 0.00, 'paid', 'confirmed', 1, '', '{\"walletId\":11}', '2026-05-17 07:37:56', '2026-05-17 03:08:00', NULL, NULL, 20000.00, 0.00, 0.00),
(53, 1, 'tt-tt', 'abc123', 2, NULL, '2026-05-17 08:04:59', '2026-05-17', NULL, 'TEH', 'KBL', 'one_way', 'economy', 248.00, 2.00, 250.00, 9.00, 241.00, 'paid', 'confirmed', 1, 'test', '{\"walletId\":68}', '2026-05-17 08:04:59', '2026-05-17 03:35:13', NULL, NULL, 250.00, 0.00, 0.00),
(54, 1, 'no2233', 'nnu7878', 1, 9, '2026-05-18 10:12:59', '2026-05-18', NULL, 'JFK', 'LHR', 'one_way', 'economy', 380.00, 0.00, 380.00, 0.00, 380.00, 'refunded', 'refunded', 22, '', '{\"walletId\":11}', '2026-05-18 10:12:59', '2026-05-18 05:43:43', NULL, NULL, 380.00, 0.00, 0.00),
(55, 1, 'tkt-2026-test', 'test123', 4, NULL, '2026-05-22 13:34:33', '2026-05-22', NULL, 'JFK', 'LHR', 'one_way', 'economy', 800.00, 0.00, 800.00, 0.00, 800.00, 'paid', 'confirmed', 22, '', '{\"walletId\":71}', '2026-05-22 13:34:33', '2026-05-23 10:54:06', NULL, NULL, 750.00, 0.00, 0.00),
(56, 41, 'tkt-123', 'abc123', 23, 39, '2026-05-22 16:43:06', '2026-05-22', NULL, 'JFK', 'LHR', 'one_way', 'economy', 400.00, 0.00, 400.00, 0.00, 400.00, 'paid', 'pending', 47, '', '{\"walletId\":72}', '2026-05-22 16:43:06', '2026-05-22 16:43:06', NULL, NULL, 400.00, 0.00, 0.00),
(57, 41, 'hhh', 'aaaaa', 22, 39, '2026-05-22 17:23:57', '2026-05-22', NULL, 'JFK', 'LHR', 'one_way', 'economy', 7000.00, 0.00, 7000.00, 0.00, 7000.00, 'paid', 'pending', 47, '', '{\"walletId\":72}', '2026-05-22 17:23:57', '2026-05-22 17:23:57', NULL, NULL, 7000.00, 0.00, 0.00),
(58, 1, 'jj-123', 'jj-1234', 1, NULL, '2026-05-23 15:25:19', '2026-05-23', '2026-05-24', 'JFK', 'LHR', 'one_way', 'economy', 900.00, 0.00, 900.00, 0.00, 900.00, 'paid', 'confirmed', 22, '', '{\"walletId\":10}', '2026-05-23 15:25:19', '2026-05-23 10:55:22', NULL, NULL, 900.00, 0.00, 0.00),
(59, 43, '8989', '8787', 29, NULL, '2026-05-23 15:29:26', '2026-05-23', NULL, 'KBL', 'TEH', 'one_way', 'economy', 900.00, 0.00, 900.00, 0.00, 900.00, 'paid', 'pending', 49, '', '{\"walletId\":75}', '2026-05-23 15:29:26', '2026-05-23 15:29:26', NULL, NULL, 900.00, 0.00, 0.00),
(60, 43, 'tt', 'abc', 28, NULL, '2026-05-23 15:36:47', '2026-05-23', NULL, 'JFK', 'LHR', 'one_way', 'economy', 100.00, 0.00, 100.00, 0.00, 100.00, 'paid', 'confirmed', 49, '', '{\"walletId\":77}', '2026-05-23 15:36:47', '2026-05-23 11:06:49', NULL, NULL, 100.00, 0.00, 0.00),
(61, 43, 'kjk', 'kjkj', 31, 40, '2026-05-23 15:39:25', '2026-05-23', NULL, 'TEST', 'TEST', 'one_way', 'economy', 800.00, 0.00, 800.00, 0.00, 800.00, 'paid', 'confirmed', 49, '', '{\"walletId\":77}', '2026-05-23 15:39:25', '2026-05-23 11:09:27', NULL, NULL, 800.00, 0.00, 0.00),
(62, 44, 'jfk-123', 'lhr-123', 33, NULL, '2026-05-24 07:43:16', '2026-05-24', '2026-05-25', 'JFK', 'LHR', 'round_trip', 'economy', 1500.00, 0.00, 1500.00, 0.00, 1500.00, 'paid', 'confirmed', 50, '', '{\"walletId\":81}', '2026-05-24 07:43:16', '2026-05-24 03:13:19', NULL, NULL, 1500.00, 0.00, 0.00);

-- --------------------------------------------------------

--
-- Table structure for table `ticket_passengers`
--

CREATE TABLE `ticket_passengers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `ticket_id` bigint(20) UNSIGNED NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `passenger_type` enum('adult','child','infant') NOT NULL DEFAULT 'adult',
  `passport_number` varchar(50) DEFAULT NULL,
  `nationality` varchar(100) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `seat_number` varchar(10) DEFAULT NULL,
  `special_requests` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `ticket_passengers`
--

INSERT INTO `ticket_passengers` (`id`, `ticket_id`, `first_name`, `last_name`, `passenger_type`, `passport_number`, `nationality`, `date_of_birth`, `seat_number`, `special_requests`, `created_at`) VALUES
(1, 1, 'John', 'Smith', 'adult', 'P12345678', 'US', NULL, '2A', NULL, '2026-05-11 10:23:06'),
(2, 2, 'Maria', 'Garcia', 'adult', 'P87654321', 'US', NULL, '14C', NULL, '2026-05-11 10:23:06'),
(3, 3, 'Robert', 'Anderson', 'adult', 'P23456789', 'US', NULL, NULL, NULL, '2026-05-11 10:23:06'),
(4, 4, 'Lisa', 'Wang', 'adult', 'P34567890', 'US', NULL, '1A', NULL, '2026-05-11 10:23:06'),
(5, 5, 'Michael', 'Brown', 'adult', 'P45678901', 'US', NULL, '5K', NULL, '2026-05-11 10:23:06'),
(6, 6, 'John', 'Smith', 'adult', 'P12345678', 'US', NULL, NULL, NULL, '2026-05-11 10:23:06'),
(7, 7, 'Jennifer', 'Lee', 'adult', 'P56789012', 'US', NULL, '22F', NULL, '2026-05-11 10:23:06'),
(8, 8, 'William', 'Davis', 'adult', 'P67890123', 'US', NULL, '3A', NULL, '2026-05-11 10:23:06'),
(9, 9, 'Amanda', 'Wilson', 'adult', 'P78901234', 'US', NULL, NULL, NULL, '2026-05-11 10:23:06'),
(10, 10, 'Lisa', 'Wang', 'adult', 'P34567890', 'US', NULL, '4D', NULL, '2026-05-11 10:23:06'),
(11, 23, 'Elham', 'Mukhtari', 'adult', NULL, NULL, NULL, NULL, NULL, '2026-05-13 10:49:08'),
(12, 48, 'test', 'test1', 'adult', NULL, NULL, NULL, NULL, NULL, '2026-05-17 06:30:40'),
(13, 50, 'test', 'test1', 'adult', NULL, NULL, NULL, NULL, NULL, '2026-05-17 07:29:34'),
(14, 51, 'zz', 'aa', 'adult', NULL, NULL, NULL, NULL, NULL, '2026-05-17 07:37:56'),
(15, 53, 'Elham', 'Mukhtari', 'adult', NULL, NULL, NULL, NULL, NULL, '2026-05-17 08:04:59'),
(16, 54, 'test', 'test123', 'adult', NULL, NULL, NULL, NULL, NULL, '2026-05-18 10:12:59'),
(17, 55, 'test22', 'test2333', 'adult', NULL, NULL, NULL, NULL, NULL, '2026-05-22 13:34:33'),
(18, 56, 'john', 'doe', 'adult', NULL, NULL, NULL, NULL, NULL, '2026-05-22 16:43:06'),
(19, 57, 'dd', 'ff', 'adult', NULL, NULL, NULL, NULL, NULL, '2026-05-22 17:23:57'),
(20, 58, 'test00', 'test00', 'adult', NULL, NULL, NULL, NULL, NULL, '2026-05-23 15:25:19'),
(21, 59, 'lklk', 'lklkll', 'adult', NULL, NULL, NULL, NULL, NULL, '2026-05-23 15:29:26'),
(22, 60, 'john doe', 'doe', 'adult', NULL, NULL, NULL, NULL, NULL, '2026-05-23 15:36:47'),
(23, 61, 'tt', 'yy', 'adult', NULL, NULL, NULL, NULL, NULL, '2026-05-23 15:39:25'),
(24, 62, 'elham', 'mukhtari', 'adult', NULL, NULL, NULL, NULL, NULL, '2026-05-24 07:43:16');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `unionId` varchar(255) NOT NULL,
  `password_hash` text DEFAULT NULL,
  `tenant_id` bigint(20) UNSIGNED DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `email` varchar(320) DEFAULT NULL,
  `avatar` text DEFAULT NULL,
  `role` enum('super_admin','admin','manager','accountant','agent','viewer') NOT NULL DEFAULT 'agent',
  `status` enum('active','inactive','suspended') NOT NULL DEFAULT 'active',
  `department` varchar(100) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `last_sign_in_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `unionId`, `password_hash`, `tenant_id`, `name`, `email`, `avatar`, `role`, `status`, `department`, `phone`, `last_sign_in_at`, `created_at`, `updated_at`) VALUES
(1, 'admin-001', NULL, 1, 'Alexandra Chen', 'alex.chen@pioneer-travel.com', NULL, 'admin', 'active', 'Management', '+1-555-0101', '2026-05-11 10:23:06', '2026-05-11 10:23:06', '2026-05-11 10:23:06'),
(2, 'manager-001', NULL, 1, 'Marcus Johnson', 'marcus.j@pioneer-travel.com', NULL, 'manager', 'active', 'Operations', '+1-555-0102', '2026-05-11 10:23:06', '2026-05-11 10:23:06', '2026-05-11 10:23:06'),
(3, 'accountant-001', NULL, 1, 'Sarah Williams', 'sarah.w@pioneer-travel.com', NULL, 'accountant', 'active', 'Finance', '+1-555-0103', '2026-05-11 10:23:06', '2026-05-11 10:23:06', '2026-05-11 10:23:06'),
(4, 'agent-001', NULL, 1, 'David Kim', 'david.kim@pioneer-travel.com', NULL, 'agent', 'active', 'Sales', '+1-555-0104', '2026-05-11 10:23:06', '2026-05-11 10:23:06', '2026-05-11 10:23:06'),
(5, 'agent-002', NULL, 1, 'Emily Rodriguez', 'emily.r@pioneer-travel.com', NULL, 'agent', 'active', 'Sales', '+1-555-0105', '2026-05-11 10:23:06', '2026-05-11 10:23:06', '2026-05-11 10:23:06'),
(6, 'viewer-001', NULL, 1, 'James Taylor', 'james.t@pioneer-travel.com', NULL, 'viewer', 'active', 'Support', '+1-555-0106', '2026-05-11 10:23:06', '2026-05-11 10:23:06', '2026-05-11 10:23:06'),
(8, 'admin-002', NULL, NULL, 'Local Admin', 'admin@local.dev', NULL, 'admin', 'active', NULL, NULL, '2026-05-12 09:42:12', '2026-05-12 09:42:12', '2026-05-12 09:42:12'),
(11, 'smoke-user-1778955027148', 'd9a3d8bae7708acb75e5ff247a0072280937000026ffe0705f53b23f318b363c:a03f388e8fd99644edad1a99eda4434dc168006b2e57a477657d4cfd35b7fbec5862af4c750ae5e458c2770d5dbbd10ac32486c1bd98a2d044e1f8bfaf0b700b', 6, 'Smoke Tester', 'smoke@test.com', NULL, 'admin', 'active', NULL, NULL, '2026-05-16 18:10:27', '2026-05-16 18:10:27', '2026-05-16 18:10:27'),
(12, 'smoke-user-1778956055207', '51fd6505984992b8f7ac40d05e9cb5a2ee8963e517f250faf12e82f35fddf00f:fe13368df901fb1a6355039638f63448a886a7e501369a6430d625baea97293d10fd252f0b6c9fbe9d6eb15106e57303741a65a5aa43f2cdb340ad208d1b101b', 7, 'Smoke Tester', 'smoke@test.com', NULL, 'admin', 'active', NULL, NULL, '2026-05-16 18:27:35', '2026-05-16 18:27:35', '2026-05-16 18:27:35'),
(22, 'super-admin-001', 'a2071af474bd20a0e223df9b70581efacd9845b2706bc875b5abbb7ff65f6c58:bd069cced63c7129f4ae95b657bb3a25a05ed5d2a2d5aaf43532f0c381031a03895e566b750d6750ecfee85c769c44e95a200bc51cc56ef964f3a1d79b13e5ae', 1, 'PSB Super Admin', 'superadmin@psb.local', NULL, 'super_admin', 'active', NULL, NULL, '2026-05-18 09:39:20', '2026-05-16 22:38:25', '2026-05-16 22:38:25'),
(40, 'local-1779006127610-z9ghgn', '882299d7d2735a64b29f6923054e31f2969c8bc9a083f59aab1ad256cbda1541:e1c692df2514f98dba05a3f8f38cf60735894949d5e4baaabe43649a038d81547c91f72c96621da05f75d7ab42b74b8060b43e7a71440b62521e2b9a0cc87d83', 33, 'Roheen', 'pouyanshahrbalkh.travel@gmail.com', NULL, 'admin', 'active', NULL, '0711340970', '2026-05-17 08:22:07', '2026-05-17 08:22:07', '2026-05-17 08:22:07'),
(41, 'local-1779090390969-o1eua2', 'a8a73a2ad3427e12ba186dfbdc64b82292ce4064f4530e2e3aab37caabae239e:05201fc844ae55102551816c38de6df19708fc0c5b911ba5036560eacb63a9034ab61ba0e7b3203a128d520a1dd694bbb4a25cbdcc361163218db7a4b22dcf10', 34, 'test1', 'test@test.com', NULL, 'admin', 'active', NULL, '0789123456', '2026-05-18 07:46:30', '2026-05-18 07:46:30', '2026-05-18 07:46:30'),
(42, 'local-1779091610377-4fg3fn', '56a65aef3378f191fbf99c15b94f3ce83de79585e71f73256023df5bbb79f814:ca5393843192fa26c6d3c622a38eeae76ddbf1a9668990326ae5702e1d7d7ce6c8b5ecff5278dd25c79afdf075f0d94e09c1db3b1244b176c228db0d68bbd522', 35, 'test1', 'gbbb@bjjnjn.com', NULL, 'admin', 'active', NULL, 'lkkkjjb', '2026-05-18 08:06:50', '2026-05-18 08:06:50', '2026-05-18 08:06:50'),
(43, 'local-1779097671977-kf45uf', '2536e741b2608fd01088ed95d0f00139901d2a07bc6c46148612b8d51dc814cd:0419bc909037910f558f644f900cd675b41f4fa41d293c7cddc27559c73f4f24d1c8fc5d8ec1fac73d00faaea09c249159940369dce79674533fa488a4dc555e', 36, 'Roheen', 'pouyan.shahrbalkh.travel@gmail.com', NULL, 'admin', 'active', NULL, '0711340970', '2026-05-18 09:47:51', '2026-05-18 09:47:51', '2026-05-18 09:47:51'),
(44, 'local-1779117413421-779196', '8b72668beb8043af0c0a11e61008fb76479156f2316fdc08ea3f9adc5c553233:7326ba644569a08a5ca8011ea6210b9da261aed0f7bac39e1077c6b29e1d1656c49d2ece6e8e1546d49da3e860a4fb57deb86139d881cd30cb0cfeb07b6bd528', 37, 'Elhamuddin', 'elhammukhtari12345@gmail.com', NULL, 'admin', 'active', NULL, '0782636327', '2026-05-18 15:16:53', '2026-05-18 15:16:53', '2026-05-18 15:16:53'),
(45, 'local-1779183782895-etwo9p', '2cba186f021aa3d61e6a4a4acc3177057f9af410316d566d7a9e734505ca6820:04433df2c0b0556fefdc1094a0ac5edcdcd2a333154008ac966eec1b66abdfdab42903f5b468c00257bf6a45378c33ca77c49ccfb8a307a88847206ddcd0cb16', 38, 'test12', 'super.admin@psb.local', NULL, 'admin', 'active', NULL, '000000000000000', '2026-05-19 09:43:02', '2026-05-19 09:43:02', '2026-05-19 09:43:02'),
(46, 'local-1779185975393-jq5158', 'a8d41303006a7540cdd5bc51b75b48159e486f6817d5bc1260e5c8f775af05a5:625f8da70cf1086bf55b97d3c554a2b6a10d3e4faca65bdb87da47207bf837149277410e9aa0c08dea4234350fabee0f002d5dbd23aecdfd12794154083b9290', 40, 'final', 'superadmin@psb.locall', NULL, 'admin', 'active', NULL, '0987654321', '2026-05-19 10:19:35', '2026-05-19 10:19:35', '2026-05-19 10:19:35'),
(47, 'local-1779190873074-4ku9dh', '7cf52ba2fa4efb267d0ba7021efd9e4d384666fb35f06008067174daad4236e6:55b9559cad8a280d3f1c17e0c07a45e2df2a183a696db1ff3c0bc948b6625e9cd783ecaad2f0774f6893644042d1486080e08f8f58186b55a2f94a4ecf2b4af9', 41, 'behrooz 1', 'behrooz.haidari@psb-erp.com', NULL, 'admin', 'active', NULL, '0782121202', '2026-05-19 11:41:13', '2026-05-19 11:41:13', '2026-05-19 11:41:13'),
(48, 'local-1779470795945-b39hz9', '093a3a88c49a5f7c25ec17828a6d2eb90ee245c53804a524d5923a416801470d:8a3379f1243ffd09f69740ff9c81a0562390b96ba1fdf5166feba16f39f9f5069cf8867af331a4d1a1ec469f8b4b2c8a1c042d1137c237da0e73355ea448f3af', 42, 'test20', 'test20@psb-erp.com', NULL, 'admin', 'active', NULL, '07818398969', '2026-05-22 17:26:35', '2026-05-22 17:26:35', '2026-05-22 17:26:35'),
(49, 'local-1779549729142-f5da5y', '56b2e1f88276b46bb3c2f50f53b55fcb8a883b67376c953d28fc23e27ed24f7e:37e6fcfc6e1312092b1f1e6bdeef88510bb95d2cab2aa12f1da2dfc3997d49eba5432828bf64a43150af41358ecd48e4f4e0cc9a42ddf4c2cb75115800946814', 43, 'Elhamuddin', 'elham.mukhtari@psb-erp.com', NULL, 'admin', 'active', NULL, '0792119298', '2026-05-23 15:22:09', '2026-05-23 15:22:09', '2026-05-23 15:22:09'),
(50, 'local-1779608409221-7mguim', 'efaf17f85361a14aced07d6baa858e04e298ae0563b0c2d6545c46e4e56cc2c8:8e07c5f8d5baace7fe72a9bb7aa373c9dd7f8d43fc22248b60f65b35a5d99c9d5c291e0cf3cc2cc17e61ee0cc048cf7e4f6ce088645d7ec8e1e264d3fe3e7d67', 44, 'Elhamuddin', 'elhammukhtari123456@gmail.com', NULL, 'admin', 'active', NULL, '0782636327', '2026-05-24 07:40:09', '2026-05-24 07:40:09', '2026-05-24 07:40:09');

-- --------------------------------------------------------

--
-- Table structure for table `wallets`
--

CREATE TABLE `wallets` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `customer_id` bigint(20) UNSIGNED DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `currency` varchar(3) NOT NULL DEFAULT 'USD',
  `balance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `reserved_balance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `credit_limit` decimal(15,2) NOT NULL DEFAULT 0.00,
  `due_balance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `status` enum('active','frozen','closed') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `wallets`
--

INSERT INTO `wallets` (`id`, `tenant_id`, `user_id`, `customer_id`, `name`, `currency`, `balance`, `reserved_balance`, `credit_limit`, `due_balance`, `status`, `created_at`, `updated_at`) VALUES
(1, 1, NULL, NULL, 'Main Operating Account', 'USD', 125000.00, 5000.00, 0.00, 0.00, 'active', '2026-05-11 10:23:06', '2026-05-11 10:23:06'),
(2, 1, NULL, NULL, 'Sales Commission Pool', 'USD', 45000.00, 2000.00, 0.00, 0.00, 'active', '2026-05-11 10:23:06', '2026-05-11 10:23:06'),
(3, 1, NULL, NULL, 'Petty Cash', 'USD', 5000.00, 0.00, 0.00, 0.00, 'active', '2026-05-11 10:23:06', '2026-05-11 10:23:06'),
(4, 1, NULL, NULL, 'Client Deposits', 'USD', 78000.00, 15000.00, 0.00, 0.00, 'active', '2026-05-11 10:23:06', '2026-05-11 10:23:06'),
(5, 1, NULL, NULL, 'Refund Reserve', 'USD', 25000.00, 25000.00, 0.00, 0.00, 'active', '2026-05-11 10:23:06', '2026-05-11 10:23:06'),
(6, 1, NULL, NULL, 'Elham', 'USD', 0.00, 0.00, 0.00, 0.00, 'active', '2026-05-11 12:39:43', '2026-05-11 12:39:43'),
(7, 1, 1, NULL, 'dd', 'EUR', 4996.00, 0.00, 0.00, 0.00, 'active', '2026-05-12 09:43:58', '2026-05-12 07:34:16'),
(8, 1, 1, NULL, 'Elham', 'USD', 1000.00, 0.00, 0.00, 0.00, 'active', '2026-05-12 09:48:35', '2026-05-13 03:19:08'),
(9, 1, 1, NULL, 'Elham1', 'USD', 500.00, 0.00, 0.00, 0.00, 'active', '2026-05-12 10:42:44', '2026-05-17 02:00:45'),
(10, 1, NULL, NULL, 'Kam Air', 'USD', 54100.00, 0.00, 0.00, 0.00, 'active', '2026-05-12 11:53:34', '2026-05-23 10:55:22'),
(11, 1, NULL, NULL, 'Ariana ', 'USD', 65920.00, 0.00, 0.00, 0.00, 'active', '2026-05-12 11:54:26', '2026-05-18 05:43:42'),
(49, 1, 4, NULL, 'test', 'USD', 5000.00, 0.00, 0.00, 0.00, 'active', '2026-05-17 02:33:55', '2026-05-17 02:33:55'),
(68, 1, NULL, NULL, 'mahan', 'USD', 750.00, 0.00, 0.00, 0.00, 'active', '2026-05-17 07:34:45', '2026-05-17 03:46:08'),
(71, 1, 22, NULL, 'test', 'GBP', 9200.00, 0.00, 0.00, 0.00, 'active', '2026-05-22 13:32:57', '2026-05-23 10:54:06'),
(72, 41, 47, NULL, 'Company wallet', 'USD', 10000.00, 0.00, 0.00, 0.00, 'active', '2026-05-22 13:35:39', '2026-05-22 13:35:39'),
(73, 42, 48, NULL, 'test20', 'USD', 1000.00, 0.00, 0.00, 0.00, 'active', '2026-05-22 17:28:50', '2026-05-22 17:28:50'),
(74, 43, NULL, NULL, 'Main Operating Account', 'USD', 0.00, 0.00, 0.00, 0.00, 'active', '2026-05-23 15:23:56', '2026-05-23 15:23:56'),
(75, 43, NULL, NULL, 'Petty Cash', 'USD', 0.00, 0.00, 0.00, 0.00, 'active', '2026-05-23 15:23:56', '2026-05-23 15:23:56'),
(76, 43, NULL, NULL, 'Client Deposits', 'USD', 0.00, 0.00, 0.00, 0.00, 'active', '2026-05-23 15:23:56', '2026-05-23 15:23:56'),
(77, 43, NULL, NULL, 'petty cash', 'USD', 100.00, 0.00, 0.00, 0.00, 'active', '2026-05-23 15:29:59', '2026-05-23 11:09:27'),
(78, 44, NULL, NULL, 'Main Operating Account', 'USD', 0.00, 0.00, 0.00, 0.00, 'active', '2026-05-24 07:40:32', '2026-05-24 07:40:32'),
(79, 44, NULL, NULL, 'Petty Cash', 'USD', 0.00, 0.00, 0.00, 0.00, 'active', '2026-05-24 07:40:32', '2026-05-24 07:40:32'),
(80, 44, NULL, NULL, 'Client Deposits', 'USD', 0.00, 0.00, 0.00, 0.00, 'active', '2026-05-24 07:40:32', '2026-05-24 07:40:32'),
(81, 44, NULL, NULL, 'Kam Air', 'USD', 9000.00, 0.00, 0.00, 0.00, 'active', '2026-05-24 07:41:33', '2026-05-24 03:15:22');

-- --------------------------------------------------------

--
-- Table structure for table `wallet_transactions`
--

CREATE TABLE `wallet_transactions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `wallet_id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `type` enum('credit','debit','refund','transfer','fee','commission','lock','unlock') NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `balance_after` decimal(15,2) NOT NULL,
  `description` text DEFAULT NULL,
  `reference_type` varchar(50) DEFAULT NULL,
  `reference_id` bigint(20) UNSIGNED DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `wallet_transactions`
--

INSERT INTO `wallet_transactions` (`id`, `wallet_id`, `tenant_id`, `type`, `amount`, `balance_after`, `description`, `reference_type`, `reference_id`, `metadata`, `created_by`, `created_at`) VALUES
(1, 1, 1, 'credit', 50000.00, 50000.00, 'Initial funding', 'deposit', NULL, NULL, 1, '2026-05-11 10:23:07'),
(2, 1, 1, 'credit', 45000.00, 95000.00, 'Customer deposits', 'deposit', NULL, NULL, 3, '2026-05-11 10:23:07'),
(3, 1, 1, 'debit', 15000.00, 80000.00, 'Airline payment batch', 'payment', NULL, NULL, 1, '2026-05-11 10:23:07'),
(4, 1, 1, 'credit', 35000.00, 115000.00, 'Weekly receipts', 'deposit', NULL, NULL, 3, '2026-05-11 10:23:07'),
(5, 1, 1, 'credit', 10000.00, 125000.00, 'Additional capital', 'deposit', NULL, NULL, 1, '2026-05-11 10:23:07'),
(6, 2, 1, 'credit', 20000.00, 20000.00, 'Commission allocation', NULL, NULL, NULL, 1, '2026-05-11 10:23:07'),
(7, 2, 1, 'credit', 25000.00, 45000.00, 'Q1 commissions', NULL, NULL, NULL, 3, '2026-05-11 10:23:07'),
(8, 3, 1, 'credit', 5000.00, 5000.00, 'Petty cash setup', NULL, NULL, NULL, 1, '2026-05-11 10:23:07'),
(9, 4, 1, 'credit', 30000.00, 30000.00, 'Client advance deposits', NULL, NULL, NULL, 4, '2026-05-11 10:23:07'),
(10, 4, 1, 'credit', 48000.00, 78000.00, 'New client deposits', NULL, NULL, NULL, 5, '2026-05-11 10:23:07'),
(11, 5, 1, 'credit', 25000.00, 25000.00, 'Refund reserve setup', NULL, NULL, NULL, 1, '2026-05-11 10:23:07'),
(12, 5, 1, 'debit', 820.00, 24180.00, 'Refund - TKT-2026-009', 'refund', NULL, NULL, 3, '2026-05-11 10:23:07'),
(13, 7, 1, 'credit', 5000.00, 5000.00, 'Initial wallet funding', NULL, NULL, NULL, 1, '2026-05-12 09:43:58'),
(14, 8, 1, 'credit', 10000.00, 10000.00, 'Initial wallet funding', NULL, NULL, NULL, 1, '2026-05-12 09:48:35'),
(15, 9, 1, 'credit', 5000.00, 5000.00, 'Initial wallet funding', NULL, NULL, NULL, 1, '2026-05-12 10:42:44'),
(16, 9, 1, 'debit', 2000.00, 3000.00, 'transfer (outgoing)', NULL, NULL, NULL, 1, '2026-05-12 10:46:57'),
(17, 8, 1, 'credit', 2000.00, 12000.00, 'transfer (incoming)', NULL, NULL, NULL, 1, '2026-05-12 10:46:57'),
(18, 10, 1, 'credit', 100000.00, 100000.00, 'Initial wallet funding', NULL, NULL, NULL, 1, '2026-05-12 11:53:34'),
(19, 11, 1, 'credit', 100000.00, 100000.00, 'Initial wallet funding', NULL, NULL, NULL, 1, '2026-05-12 11:54:26'),
(20, 7, 1, 'debit', 4.00, 4996.00, 'Ticket booking: test1', 'ticket', 13, NULL, 1, '2026-05-12 12:04:16'),
(21, 10, 1, 'debit', 10.00, 99990.00, 'Ticket booking: test1', 'ticket', 14, NULL, 1, '2026-05-12 12:33:55'),
(22, 11, 1, 'debit', 10000.00, 90000.00, 'Ticket booking: test2', 'ticket', 15, NULL, 1, '2026-05-12 12:36:33'),
(23, 11, 1, 'debit', 20000.00, 70000.00, 'Ticket booking: test3', 'ticket', 16, NULL, 1, '2026-05-12 13:13:25'),
(24, 10, 1, 'debit', 9990.00, 90000.00, 'Ticket booking: test4', 'ticket', 17, NULL, 1, '2026-05-13 07:01:25'),
(25, 8, 1, 'debit', 11000.00, 1000.00, 'Ticket booking: tkt-5', 'ticket', 18, NULL, 1, '2026-05-13 07:49:08'),
(26, 9, 1, 'debit', 2000.00, 1000.00, 'Ticket booking: 2525', 'ticket', 19, NULL, 1, '2026-05-13 08:35:15'),
(27, 10, 1, 'debit', 10000.00, 80000.00, 'Ticket booking: rr', 'ticket', 20, NULL, 1, '2026-05-13 08:38:18'),
(28, 10, 1, 'debit', 15000.00, 65000.00, 'Ticket booking: tkt-121', 'ticket', 21, NULL, 1, '2026-05-13 08:56:59'),
(29, 10, 1, 'debit', 10000.00, 55000.00, 'Ticket booking: ww', 'ticket', 22, NULL, 1, '2026-05-13 09:07:38'),
(30, 11, 1, 'debit', 5000.00, 65000.00, 'Ticket booking: tt1', 'ticket', 23, NULL, 1, '2026-05-13 10:49:08'),
(77, 49, 1, 'credit', 5000.00, 5000.00, 'Initial wallet funding', NULL, NULL, NULL, 22, '2026-05-17 02:33:55'),
(96, 9, 1, 'debit', 500.00, 500.00, 'Ticket booking: 12', 'ticket', 48, NULL, 1, '2026-05-17 06:30:45'),
(104, 11, 1, 'debit', 0.00, 65000.00, 'Ticket booking: 2020', 'ticket', 50, NULL, 1, '2026-05-17 07:30:20'),
(105, 11, 1, 'credit', 1000.00, 66000.00, 'Deposit approved: MZR-2026-000004', 'deposit', 1, NULL, 1, '2026-05-17 07:31:36'),
(106, 68, 1, 'credit', 3000.00, 3000.00, 'Initial wallet funding', NULL, NULL, NULL, 1, '2026-05-17 07:34:45'),
(107, 11, 1, 'debit', 0.00, 66000.00, 'Ticket booking: 333', 'ticket', 51, NULL, 1, '2026-05-17 07:38:00'),
(111, 68, 1, 'debit', 250.00, 2750.00, 'Ticket booking: tt-tt', 'ticket', 53, NULL, 1, '2026-05-17 08:05:13'),
(112, 68, 1, 'debit', 2000.00, 750.00, 'Ticket booking: 2525', 'ticket', 19, NULL, 1, '2026-05-17 08:16:08'),
(113, 11, 1, 'debit', 380.00, 65620.00, 'Ticket booking: no2233', 'ticket', 54, NULL, 22, '2026-05-18 10:13:04'),
(114, 11, 1, 'refund', 300.00, 65920.00, 'Ticket refund: no2233', 'ticket', 54, NULL, 22, '2026-05-18 10:13:42'),
(115, 71, 1, 'credit', 10000.00, 10000.00, 'Initial wallet funding', NULL, NULL, NULL, 22, '2026-05-22 13:32:57'),
(116, 72, 41, 'credit', 10000.00, 10000.00, 'Initial wallet funding', NULL, NULL, NULL, 47, '2026-05-22 13:35:39'),
(119, 73, 42, 'credit', 1000.00, 1000.00, 'Initial wallet funding', NULL, NULL, NULL, 48, '2026-05-22 17:28:50'),
(120, 71, 1, 'debit', 800.00, 9200.00, 'Ticket booking: tkt-2026-test', 'ticket', 55, NULL, 22, '2026-05-23 15:24:06'),
(121, 10, 1, 'debit', 900.00, 54100.00, 'Ticket booking: jj-123', 'ticket', 58, NULL, 22, '2026-05-23 15:25:22'),
(122, 77, 43, 'credit', 1000.00, 1000.00, 'Initial wallet funding', NULL, NULL, NULL, 49, '2026-05-23 15:29:59'),
(123, 77, 43, 'debit', 100.00, 900.00, 'Ticket booking: tt', 'ticket', 60, NULL, 49, '2026-05-23 15:36:49'),
(124, 77, 43, 'debit', 800.00, 100.00, 'Ticket booking: kjk', 'ticket', 61, NULL, 49, '2026-05-23 15:39:27'),
(125, 81, 44, 'credit', 10000.00, 10000.00, 'Initial wallet funding', NULL, NULL, NULL, 50, '2026-05-24 07:41:33'),
(126, 81, 44, 'debit', 1500.00, 8500.00, 'Ticket booking: jfk-123', 'ticket', 62, NULL, 50, '2026-05-24 07:43:19'),
(127, 81, 44, 'credit', 500.00, 9000.00, 'Deposit approved: MZR-2026-000001', 'deposit', 3, NULL, 50, '2026-05-24 07:45:22');

-- --------------------------------------------------------

--
-- Table structure for table `__drizzle_migrations`
--

CREATE TABLE `__drizzle_migrations` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `hash` text NOT NULL,
  `created_at` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `accounting_periods`
--
ALTER TABLE `accounting_periods`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `airlines`
--
ALTER TABLE `airlines`
  ADD PRIMARY KEY (`id`),
  ADD KEY `airlines_tenant_id_tenants_id_fk` (`tenant_id`);

--
-- Indexes for table `ai_conversations`
--
ALTER TABLE `ai_conversations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ai_conversations_tenant_id_tenants_id_fk` (`tenant_id`),
  ADD KEY `ai_conversations_user_id_users_id_fk` (`user_id`);

--
-- Indexes for table `ai_messages`
--
ALTER TABLE `ai_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ai_messages_conversation_id_ai_conversations_id_fk` (`conversation_id`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `audit_tenant_idx` (`tenant_id`),
  ADD KEY `audit_user_idx` (`user_id`),
  ADD KEY `audit_action_idx` (`action`);

--
-- Indexes for table `bank_statements`
--
ALTER TABLE `bank_statements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `bs_tenant_idx` (`tenant_id`),
  ADD KEY `bs_account_idx` (`account_id`),
  ADD KEY `bs_status_idx` (`status`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `bank_statement_lines`
--
ALTER TABLE `bank_statement_lines`
  ADD PRIMARY KEY (`id`),
  ADD KEY `bsl_tenant_idx` (`tenant_id`),
  ADD KEY `bsl_statement_idx` (`statement_id`),
  ADD KEY `bsl_status_idx` (`status`),
  ADD KEY `matched_journal_entry_id` (`matched_journal_entry_id`),
  ADD KEY `matched_ledger_entry_id` (`matched_ledger_entry_id`);

--
-- Indexes for table `bills`
--
ALTER TABLE `bills`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `bills_number_unique` (`tenant_id`,`bill_number`),
  ADD KEY `bills_tenant_idx` (`tenant_id`),
  ADD KEY `bills_supplier_idx` (`supplier_id`),
  ADD KEY `bills_number_idx` (`bill_number`),
  ADD KEY `bills_status_idx` (`status`),
  ADD KEY `bills_due_date_idx` (`due_date`),
  ADD KEY `journal_entry_id` (`journal_entry_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `deleted_by` (`deleted_by`);

--
-- Indexes for table `bill_items`
--
ALTER TABLE `bill_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `bi_bill_idx` (`bill_id`),
  ADD KEY `tenant_id` (`tenant_id`),
  ADD KEY `account_id` (`account_id`);

--
-- Indexes for table `chart_of_accounts`
--
ALTER TABLE `chart_of_accounts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `chart_of_accounts_tenant_id_tenants_id_fk` (`tenant_id`);

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `customers_tenant_id_tenants_id_fk` (`tenant_id`),
  ADD KEY `customers_assigned_to_users_id_fk` (`assigned_to`);

--
-- Indexes for table `customer_transactions`
--
ALTER TABLE `customer_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ct_tenant` (`tenant_id`),
  ADD KEY `idx_ct_customer` (`customer_id`),
  ADD KEY `idx_ct_ticket` (`ticket_id`),
  ADD KEY `idx_ct_invoice` (`invoice_id`),
  ADD KEY `idx_ct_type` (`type`);

--
-- Indexes for table `deposits`
--
ALTER TABLE `deposits`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_deposits_tenant` (`tenant_id`),
  ADD KEY `idx_deposits_code` (`deposit_code`),
  ADD KEY `idx_deposits_status` (`status`);

--
-- Indexes for table `documents`
--
ALTER TABLE `documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `docs_tenant_idx` (`tenant_id`),
  ADD KEY `docs_entity_idx` (`entity_type`,`entity_id`),
  ADD KEY `docs_type_idx` (`document_type`),
  ADD KEY `generated_by` (`generated_by`),
  ADD KEY `deleted_by` (`deleted_by`);

--
-- Indexes for table `document_sequences`
--
ALTER TABLE `document_sequences`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ds_tenant_prefix_year_unique` (`tenant_id`,`prefix`,`year`),
  ADD KEY `ds_tenant_idx` (`tenant_id`);

--
-- Indexes for table `exchange_rates`
--
ALTER TABLE `exchange_rates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `er_tenant_idx` (`tenant_id`),
  ADD KEY `er_currency_idx` (`from_currency`,`to_currency`),
  ADD KEY `er_date_idx` (`effective_date`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `expenses`
--
ALTER TABLE `expenses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `expenses_tenant_id_tenants_id_fk` (`tenant_id`),
  ADD KEY `expenses_category_id_expense_categories_id_fk` (`category_id`),
  ADD KEY `expenses_approved_by_users_id_fk` (`approved_by`),
  ADD KEY `expenses_submitted_by_users_id_fk` (`submitted_by`),
  ADD KEY `expenses_deleted_by_users_id_fk` (`deleted_by`);

--
-- Indexes for table `expense_categories`
--
ALTER TABLE `expense_categories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `expense_categories_tenant_id_tenants_id_fk` (`tenant_id`);

--
-- Indexes for table `interactions`
--
ALTER TABLE `interactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `interactions_tenant_id_tenants_id_fk` (`tenant_id`),
  ADD KEY `interactions_customer_id_customers_id_fk` (`customer_id`),
  ADD KEY `interactions_lead_id_leads_id_fk` (`lead_id`),
  ADD KEY `interactions_created_by_users_id_fk` (`created_by`);

--
-- Indexes for table `invoices`
--
ALTER TABLE `invoices`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_invoices_tenant` (`tenant_id`),
  ADD KEY `idx_invoices_customer` (`customer_id`),
  ADD KEY `idx_invoices_ticket` (`ticket_id`),
  ADD KEY `idx_invoices_status` (`status`),
  ADD KEY `idx_invoices_number` (`invoice_number`);

--
-- Indexes for table `invoice_items`
--
ALTER TABLE `invoice_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_items_invoice` (`invoice_id`);

--
-- Indexes for table `journal_entries`
--
ALTER TABLE `journal_entries`
  ADD PRIMARY KEY (`id`),
  ADD KEY `journal_entries_tenant_id_tenants_id_fk` (`tenant_id`),
  ADD KEY `journal_entries_posted_by_users_id_fk` (`posted_by`);

--
-- Indexes for table `journal_entry_lines`
--
ALTER TABLE `journal_entry_lines`
  ADD PRIMARY KEY (`id`),
  ADD KEY `journal_entry_lines_journal_entry_id_journal_entries_id_fk` (`journal_entry_id`),
  ADD KEY `journal_entry_lines_account_id_chart_of_accounts_id_fk` (`account_id`);

--
-- Indexes for table `leads`
--
ALTER TABLE `leads`
  ADD PRIMARY KEY (`id`),
  ADD KEY `leads_tenant_id_tenants_id_fk` (`tenant_id`),
  ADD KEY `leads_assigned_to_users_id_fk` (`assigned_to`);

--
-- Indexes for table `ledger_entries`
--
ALTER TABLE `ledger_entries`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ledger_entries_tenant_id_tenants_id_fk` (`tenant_id`),
  ADD KEY `ledger_entries_journal_entry_id_journal_entries_id_fk` (`journal_entry_id`),
  ADD KEY `ledger_entries_account_id_chart_of_accounts_id_fk` (`account_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `notifications_tenant_id_tenants_id_fk` (`tenant_id`),
  ADD KEY `notifications_user_id_users_id_fk` (`user_id`);

--
-- Indexes for table `payment_locations`
--
ALTER TABLE `payment_locations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_pl_tenant` (`tenant_id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD KEY `roles_tenant_id_tenants_id_fk` (`tenant_id`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_sessions_token` (`token`),
  ADD KEY `idx_sessions_user` (`user_id`);

--
-- Indexes for table `subscriptions`
--
ALTER TABLE `subscriptions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_subscription_tenant` (`tenant_id`);

--
-- Indexes for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `suppliers_code_unique` (`tenant_id`,`supplier_code`),
  ADD KEY `suppliers_tenant_idx` (`tenant_id`),
  ADD KEY `suppliers_code_idx` (`supplier_code`),
  ADD KEY `suppliers_status_idx` (`status`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `supplier_contacts`
--
ALTER TABLE `supplier_contacts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sc_supplier_idx` (`supplier_id`),
  ADD KEY `tenant_id` (`tenant_id`);

--
-- Indexes for table `supplier_payments`
--
ALTER TABLE `supplier_payments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `sp_number_unique` (`tenant_id`,`payment_number`),
  ADD KEY `sp_tenant_idx` (`tenant_id`),
  ADD KEY `sp_supplier_idx` (`supplier_id`),
  ADD KEY `sp_bill_idx` (`bill_id`),
  ADD KEY `sp_number_idx` (`payment_number`),
  ADD KEY `journal_entry_id` (`journal_entry_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `deleted_by` (`deleted_by`);

--
-- Indexes for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ss_tenant_key_idx` (`tenant_id`,`key`),
  ADD KEY `ss_category_idx` (`category`),
  ADD KEY `fk_ss_updated_by` (`updated_by`);

--
-- Indexes for table `tenants`
--
ALTER TABLE `tenants`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `tenants_slug_unique` (`slug`);

--
-- Indexes for table `tickets`
--
ALTER TABLE `tickets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tickets_tenant_id_tenants_id_fk` (`tenant_id`),
  ADD KEY `tickets_airline_id_airlines_id_fk` (`airline_id`),
  ADD KEY `tickets_issued_by_users_id_fk` (`issued_by`);

--
-- Indexes for table `ticket_passengers`
--
ALTER TABLE `ticket_passengers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ticket_passengers_ticket_id_tickets_id_fk` (`ticket_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_unionId_unique` (`unionId`),
  ADD KEY `users_tenant_id_tenants_id_fk` (`tenant_id`);

--
-- Indexes for table `wallets`
--
ALTER TABLE `wallets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `wallets_tenant_id_tenants_id_fk` (`tenant_id`),
  ADD KEY `wallets_user_id_users_id_fk` (`user_id`);

--
-- Indexes for table `wallet_transactions`
--
ALTER TABLE `wallet_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `wallet_transactions_created_by_users_id_fk` (`created_by`),
  ADD KEY `wallet_id_idx` (`wallet_id`),
  ADD KEY `tenant_id_idx` (`tenant_id`);

--
-- Indexes for table `__drizzle_migrations`
--
ALTER TABLE `__drizzle_migrations`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `accounting_periods`
--
ALTER TABLE `accounting_periods`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `airlines`
--
ALTER TABLE `airlines`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT for table `ai_conversations`
--
ALTER TABLE `ai_conversations`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `ai_messages`
--
ALTER TABLE `ai_messages`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=95;

--
-- AUTO_INCREMENT for table `bank_statements`
--
ALTER TABLE `bank_statements`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `bank_statement_lines`
--
ALTER TABLE `bank_statement_lines`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bills`
--
ALTER TABLE `bills`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `bill_items`
--
ALTER TABLE `bill_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `chart_of_accounts`
--
ALTER TABLE `chart_of_accounts`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=204;

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=42;

--
-- AUTO_INCREMENT for table `customer_transactions`
--
ALTER TABLE `customer_transactions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=51;

--
-- AUTO_INCREMENT for table `deposits`
--
ALTER TABLE `deposits`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `documents`
--
ALTER TABLE `documents`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `document_sequences`
--
ALTER TABLE `document_sequences`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `exchange_rates`
--
ALTER TABLE `exchange_rates`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `expenses`
--
ALTER TABLE `expenses`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `expense_categories`
--
ALTER TABLE `expense_categories`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `interactions`
--
ALTER TABLE `interactions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `invoices`
--
ALTER TABLE `invoices`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;

--
-- AUTO_INCREMENT for table `invoice_items`
--
ALTER TABLE `invoice_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `journal_entries`
--
ALTER TABLE `journal_entries`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=78;

--
-- AUTO_INCREMENT for table `journal_entry_lines`
--
ALTER TABLE `journal_entry_lines`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=198;

--
-- AUTO_INCREMENT for table `leads`
--
ALTER TABLE `leads`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `ledger_entries`
--
ALTER TABLE `ledger_entries`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=185;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=137;

--
-- AUTO_INCREMENT for table `payment_locations`
--
ALTER TABLE `payment_locations`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `sessions`
--
ALTER TABLE `sessions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `subscriptions`
--
ALTER TABLE `subscriptions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `supplier_contacts`
--
ALTER TABLE `supplier_contacts`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `supplier_payments`
--
ALTER TABLE `supplier_payments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `system_settings`
--
ALTER TABLE `system_settings`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=53;

--
-- AUTO_INCREMENT for table `tenants`
--
ALTER TABLE `tenants`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=45;

--
-- AUTO_INCREMENT for table `tickets`
--
ALTER TABLE `tickets`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=63;

--
-- AUTO_INCREMENT for table `ticket_passengers`
--
ALTER TABLE `ticket_passengers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=51;

--
-- AUTO_INCREMENT for table `wallets`
--
ALTER TABLE `wallets`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=82;

--
-- AUTO_INCREMENT for table `wallet_transactions`
--
ALTER TABLE `wallet_transactions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=128;

--
-- AUTO_INCREMENT for table `__drizzle_migrations`
--
ALTER TABLE `__drizzle_migrations`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `airlines`
--
ALTER TABLE `airlines`
  ADD CONSTRAINT `airlines_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `ai_conversations`
--
ALTER TABLE `ai_conversations`
  ADD CONSTRAINT `ai_conversations_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `ai_conversations_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `ai_messages`
--
ALTER TABLE `ai_messages`
  ADD CONSTRAINT `ai_messages_conversation_id_ai_conversations_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `ai_conversations` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `audit_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `bank_statements`
--
ALTER TABLE `bank_statements`
  ADD CONSTRAINT `bank_statements_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `bank_statements_ibfk_2` FOREIGN KEY (`account_id`) REFERENCES `chart_of_accounts` (`id`),
  ADD CONSTRAINT `bank_statements_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `bank_statement_lines`
--
ALTER TABLE `bank_statement_lines`
  ADD CONSTRAINT `bank_statement_lines_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `bank_statement_lines_ibfk_2` FOREIGN KEY (`statement_id`) REFERENCES `bank_statements` (`id`),
  ADD CONSTRAINT `bank_statement_lines_ibfk_3` FOREIGN KEY (`matched_journal_entry_id`) REFERENCES `journal_entries` (`id`),
  ADD CONSTRAINT `bank_statement_lines_ibfk_4` FOREIGN KEY (`matched_ledger_entry_id`) REFERENCES `ledger_entries` (`id`);

--
-- Constraints for table `bills`
--
ALTER TABLE `bills`
  ADD CONSTRAINT `bills_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `bills_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  ADD CONSTRAINT `bills_ibfk_3` FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries` (`id`),
  ADD CONSTRAINT `bills_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `bills_ibfk_5` FOREIGN KEY (`deleted_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `bill_items`
--
ALTER TABLE `bill_items`
  ADD CONSTRAINT `bill_items_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `bill_items_ibfk_2` FOREIGN KEY (`bill_id`) REFERENCES `bills` (`id`),
  ADD CONSTRAINT `bill_items_ibfk_3` FOREIGN KEY (`account_id`) REFERENCES `chart_of_accounts` (`id`);

--
-- Constraints for table `chart_of_accounts`
--
ALTER TABLE `chart_of_accounts`
  ADD CONSTRAINT `chart_of_accounts_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `customers`
--
ALTER TABLE `customers`
  ADD CONSTRAINT `customers_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `customers_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `documents`
--
ALTER TABLE `documents`
  ADD CONSTRAINT `documents_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `documents_ibfk_2` FOREIGN KEY (`generated_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `documents_ibfk_3` FOREIGN KEY (`deleted_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `document_sequences`
--
ALTER TABLE `document_sequences`
  ADD CONSTRAINT `document_sequences_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `exchange_rates`
--
ALTER TABLE `exchange_rates`
  ADD CONSTRAINT `exchange_rates_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `exchange_rates_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `expenses`
--
ALTER TABLE `expenses`
  ADD CONSTRAINT `expenses_approved_by_users_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `expenses_category_id_expense_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `expense_categories` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `expenses_deleted_by_users_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `expenses_submitted_by_users_id_fk` FOREIGN KEY (`submitted_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `expenses_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `expense_categories`
--
ALTER TABLE `expense_categories`
  ADD CONSTRAINT `expense_categories_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `interactions`
--
ALTER TABLE `interactions`
  ADD CONSTRAINT `interactions_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `interactions_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `interactions_lead_id_leads_id_fk` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `interactions_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `journal_entries`
--
ALTER TABLE `journal_entries`
  ADD CONSTRAINT `journal_entries_posted_by_users_id_fk` FOREIGN KEY (`posted_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `journal_entries_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `journal_entry_lines`
--
ALTER TABLE `journal_entry_lines`
  ADD CONSTRAINT `journal_entry_lines_account_id_chart_of_accounts_id_fk` FOREIGN KEY (`account_id`) REFERENCES `chart_of_accounts` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `journal_entry_lines_journal_entry_id_journal_entries_id_fk` FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `leads`
--
ALTER TABLE `leads`
  ADD CONSTRAINT `leads_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `leads_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `ledger_entries`
--
ALTER TABLE `ledger_entries`
  ADD CONSTRAINT `ledger_entries_account_id_chart_of_accounts_id_fk` FOREIGN KEY (`account_id`) REFERENCES `chart_of_accounts` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `ledger_entries_journal_entry_id_journal_entries_id_fk` FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `ledger_entries_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `roles`
--
ALTER TABLE `roles`
  ADD CONSTRAINT `roles_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `subscriptions`
--
ALTER TABLE `subscriptions`
  ADD CONSTRAINT `fk_subscription_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD CONSTRAINT `suppliers_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `suppliers_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `supplier_contacts`
--
ALTER TABLE `supplier_contacts`
  ADD CONSTRAINT `supplier_contacts_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `supplier_contacts_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`);

--
-- Constraints for table `supplier_payments`
--
ALTER TABLE `supplier_payments`
  ADD CONSTRAINT `supplier_payments_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `supplier_payments_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  ADD CONSTRAINT `supplier_payments_ibfk_3` FOREIGN KEY (`bill_id`) REFERENCES `bills` (`id`),
  ADD CONSTRAINT `supplier_payments_ibfk_4` FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries` (`id`),
  ADD CONSTRAINT `supplier_payments_ibfk_5` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `supplier_payments_ibfk_6` FOREIGN KEY (`deleted_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD CONSTRAINT `fk_ss_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `fk_ss_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `tickets`
--
ALTER TABLE `tickets`
  ADD CONSTRAINT `tickets_airline_id_airlines_id_fk` FOREIGN KEY (`airline_id`) REFERENCES `airlines` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `tickets_issued_by_users_id_fk` FOREIGN KEY (`issued_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `tickets_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `ticket_passengers`
--
ALTER TABLE `ticket_passengers`
  ADD CONSTRAINT `ticket_passengers_ticket_id_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `wallets`
--
ALTER TABLE `wallets`
  ADD CONSTRAINT `wallets_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `wallets_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `wallet_transactions`
--
ALTER TABLE `wallet_transactions`
  ADD CONSTRAINT `wallet_transactions_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `wallet_transactions_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `wallet_transactions_wallet_id_wallets_id_fk` FOREIGN KEY (`wallet_id`) REFERENCES `wallets` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
