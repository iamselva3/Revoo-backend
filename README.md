# REVOO - Smartphone Buyback Platform Backend

Production-ready backend API service for the REVOO Smartphone Buyback & Refurbished Marketplace platform. Built with Node.js, TypeScript, Express, and MongoDB.

---

## 🛠 Features

- **Authentication & Authorization**:
  - Customer OTP sign-in / verification (mock dev mode & SMS integration)
  - Customer Email & Password login / registration with password hashing (bcrypt)
  - Google OAuth 2.0 customer sign-in with Google token verification
  - Role-Based Access Control (Admin, Pricing Manager, Operations Executive, Customer)
  - JWT access and refresh token management with secure rotation

- **Dynamic Device Valuation Engine**:
  - Base price calculations based on brand, model, storage, and RAM variants
  - Functional physical flaw deductions (screen scratches, body dents, camera issues, touch/face ID defects)
  - Comprehensive buyback estimate generator

- **Buyback Request & Lifecycle Management**:
  - Request submission with doorstep address and pickup slot selection
  - Executive diagnostic inspection and dynamic counter-offers
  - Real-time customer decision handling (Accept & Paid / Counter / Reject)

- **Storage & File Uploads**:
  - Dual storage engine: Cloudflare R2 Object Storage & local storage fallback
  - Secure image upload pipeline for device condition proofs

- **Comprehensive Automated Test Suite**:
  - Jest unit & integration tests covering valuation rules, auth routes, and error handlers

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- MongoDB Atlas URI or local MongoDB instance

### Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Setup environment variables:
   ```bash
   cp .env.example .env
   ```
   Fill in your MongoDB URI, JWT secrets, and Google OAuth credentials in `.env`.

4. Start development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   npm start
   ```

6. Run automated test suite:
   ```bash
   npm test
   ```

---

## 📁 Architecture Overview

```
src/
├── application/     # DTOs, use cases, interfaces
├── config/          # Environment configuration & DB connection
├── domain/          # Entities, repositories, Valuation Engine
├── infrastructure/  # MongoDB models, Cloudflare R2, notifications
├── presentation/    # Express controllers, routes, middlewares, validators
└── shared/          # Utility types & helpers
```

---

## 🔒 Security Best Practices

- `.env` is excluded via `.gitignore` to prevent credential leakage.
- Passwords hashed with `bcryptjs`.
- HTTP cleartext traffic policies and CORS headers enforced.
