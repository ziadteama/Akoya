# 🏊‍♂️ Akoya Water Park Management System

A comprehensive, bilingual ticket sales and management platform designed for water parks and entertainment venues.

![React](https://img.shields.io/badge/React-19.0-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-Express-green.svg)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-blue.svg)
![Material-UI](https://img.shields.io/badge/UI-Material--UI-purple.svg)

---

## 🌟 Overview

Akoya is a full-stack management system built for water parks and entertainment facilities. It provides comprehensive ticket sales, payment processing, meal management, and business analytics with full bilingual support (English/Arabic) and RTL text compatibility.

---

## ✨ Key Features

### 🎫 Advanced Ticket Management

- Multi-category ticket sales
- Real-time inventory tracking and validation
- QR code generation for digital tickets
- Receipt printing with thermal printer support (80mm)
- Bulk ticket scanning and processing with batch operations
- Ticket validation and verification system

### 💰 Flexible Payment Processing

- Multiple payment methods:
- Discount system
- Split payment support
- Automatic change calculation
- Analytics by payment method
- Dual receipt printing (Customer + Business)

### 👥 Role-Based Access Control

- **Cashier Dashboard** – Simplified interface
- **Accountant Dashboard** – Reports, scanning, sales access
- **Admin Dashboard** – Full system control, analytics

### 📊 Comprehensive Analytics & Reporting

- Daily/Weekly/Monthly reports with date filters
- Real-time dashboard with key metrics
- Payment method breakdowns
- CSV export (UTF-8 BOM for Excel)
- Print-ready reports with visual charts

### 🌐 Bilingual Interface

- English/Arabic support with RTL layout
- Arabic translations for categories and payments
- EGP currency and cultural formatting
- Extensible translation system

### 🍽️ Meal Management System

- Menu item management by age group
- Meal ordering linked with ticketing
- Food inventory tracking
- Seasonal item archiving
- Edit-in-place pricing

### 🔍 Advanced Ticket Scanning

- Bulk QR code scanning
- Range-based ticket ID (e.g., 1–1000)
- Status tracking and validation
- Real-time batch summary and error handling

### 🖨️ Professional Receipt System

- Thermal printer support (80mm)
- Customizable templates with branding
- QR code on receipts
- Dual printing and reprint history
- Auto-close print queues

---

## 🛠️ Tech Stack

### Frontend

- React 19 (Hooks + Strict Mode)
- Material-UI & MUI X (Charts, Date Pickers)
- React Router DOM
- Axios + timeout handling
- Day.js, file-saver, Toastify

### Backend

- Node.js + Express
- PostgreSQL with relational queries
- RESTful APIs with JWT auth
- Role-based access control
- CORS, input validation

### Development Tools

- Vite
- ESLint
- VS Code with debugger

---

## 📁 Project Structure

```
/client         → React frontend
/server         → Express backend
/db             → PostgreSQL schema + queries
/public         → Static assets
README.md       → Project documentation
.env            → Environment configuration
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js (v16+)
- PostgreSQL (v12+)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/akoya-waterpark.git
   ```

2. Install dependencies:
   ```bash
   cd client && npm install
   cd ../server && npm install
   ```

3. Set up PostgreSQL and .env files

4. Start the application:
   ```bash
   # In client
   npm run dev
   # In server
   npm run start
   ```

---

## 🎯 Use Cases

- Water Parks & Aquatic Centers
- Entertainment Venues
- Recreation Facilities
- Tourist Attractions
- Theme Parks

---

## 🌍 Internationalization Features

- RTL Arabic layout
- Arabic numerals, EGP currency
- Localized payment and category mappings
- Easy language extension

---

## 📊 Business Intelligence

- Real-time KPI dashboard
- Exportable reports
- Method-specific analytics
- Visual charts (MUI X)
- Audit trail with timestamps

---

## 🔐 Security Features

- JWT Auth + Role Middleware
- Secure API validation
- Input sanitization
- CORS control
- Session timeout & logout

---

## 🖨️ Printing Capabilities

- 80mm thermal printer support
- Branded dual receipts
- Print queue management
- Auto-close window
- Print preview & reprint

---

## 📱 Responsive Design

- Mobile-optimized
- Progressive Web App support
- Glassmorphism design
- WCAG accessibility standards

---

## 🔧 Advanced Features

- Batch operations
- Ticket ID range support
- Auto-save & keyboard shortcuts
- QR/barcode scanner support
- Backup & restore system

---

## 🤝 Contributing

This project showcases:

- Component-based React with Context API
- RESTful Node.js backend with PostgreSQL
- Responsive and RTL Material UI interface
- Real-time analytics and printing
- Internationalized business logic

---

