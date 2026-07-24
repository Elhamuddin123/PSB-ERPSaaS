# PSB-ERP

<div align="center">

### Airline Ticketing & Travel Agency ERP System

A modern multi-tenant ERP platform built for travel agencies to manage airline ticketing, accounting, wallets, customers, expenses, invoicing, and reporting from one centralized dashboard.

</div>

---

## Overview

PSB-ERP is a complete ERP solution designed specifically for travel agencies. It simplifies ticket booking, financial management, customer management, and business operations while supporting multiple agencies from a single platform.

The system is built with scalability, security, and performance in mind.

---

## Key Features

### Ticket Management
- Create airline tickets
- Approve and reject tickets
- Ticket refund management
- Passenger management
- PNR management
- Multi-passenger booking

### Customer Management
- Customer database
- Customer ledger
- Customer transactions
- Booking history
- Receivable management

### Wallet Management
- Agency wallets
- Wallet recharge
- Wallet deductions
- Wallet transactions
- Balance tracking

### Accounting
- Chart of Accounts
- Journal Entries
- General Ledger
- Expenses
- Customer Receivables
- Financial Reports
- Accounting Dashboard

### Invoice Management
- Automatic invoice generation
- Invoice items
- Payment tracking
- Invoice history

### User Management
- Multi-role authentication
- Super Admin
- Agency Admin
- Agent
- Accountant

### Notifications
- Real-time notifications
- Ticket approval alerts
- Refund notifications
- System messages

### Dashboard & Reports
- Sales reports
- Revenue reports
- Ticket statistics
- Financial overview
- Business analytics

---

## Technology Stack

### Frontend

- React
- TypeScript
- Tailwind CSS
- Vite
- TanStack Query
- React Router

### Backend

- Node.js
- tRPC
- Drizzle ORM
- Zod
- TypeScript

### Database

- MariaDB / MySQL

### Authentication

- Session Authentication
- Role Based Access Control

---

## Project Structure

```
client/
server/
db/
shared/
public/
```

---

## User Roles

### Super Admin

- Manage all agencies
- Approve agencies
- Manage subscriptions
- Manage system settings
- View analytics

### Agency Admin

- Manage users
- Approve tickets
- Manage accounting
- Manage customers
- Manage expenses

### Agent

- Create tickets
- Manage customers
- View reports

### Accountant

- Manage accounting
- Expenses
- Journal entries
- Ledger
- Financial reports

---

## Business Workflow

```
Agency Registration
        ↓
Admin Approval
        ↓
Agency Login
        ↓
Create Ticket
        ↓
Ticket Approval
        ↓
Wallet Deduction
        ↓
Accounting Entries
        ↓
Invoice Generation
        ↓
Reports & Dashboard
```

---

## Installation

Clone the repository

```bash
git clone https://github.com/yourusername/PSB-ERP.git
```

Go to project directory

```bash
cd PSB-ERP
```

Install dependencies

```bash
npm install
```

Configure environment variables

```env
DATABASE_URL=
SESSION_SECRET=
PORT=
```

Run database migrations

```bash
npm run db:push
```

Start development server

```bash
npm run dev
```

Build production

```bash
npm run build
```

---

## Security

- Authentication
- Authorization
- Role-based permissions
- Multi-tenant isolation
- Input validation
- Audit logging

---

## Current Development Status

Project is under active development.

Current modules include:

- Authentication
- Dashboard
- Airlines
- Customers
- Ticketing
- Wallets
- Accounting
- Expenses
- Reports
- Notifications
- Invoice Management

---

## Future Features

- Online Payment Gateway
- Flight API Integration
- Mobile Application
- Email Notifications
- SMS Notifications
- AI Assistant
- Document Management
- Inventory Module
- HR Module
- Payroll Module

---

## Author

**Elhamuddin Mukhtari**

Full Stack Developer

LinkedIn:
https://www.linkedin.com/in/elhamuddin-mukhtari-b290561b6

GitHub:
https://github.com/Elhamuddin123

Email:
elhammukhtari12345@gmail.com

---

## License

This project is licensed for demonstration and commercial development purposes.

© 2026 Elhamuddin Mukhtari. All Rights Reserved.