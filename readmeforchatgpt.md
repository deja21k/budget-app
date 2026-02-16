# Budget App - Quick Reference for AI Assistant

## What This App Is
A **local-only personal finance application** with receipt scanning (OCR), transaction tracking, categories, insights/analytics, and multi-account support. Data is stored locally in SQLite - no cloud.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js + Express + TypeScript |
| Database | SQLite (better-sqlite3) |
| OCR | Tesseract.js (offline, 100% local) |
| Frontend | React 19 + Vite + TypeScript |
| Styling | Tailwind CSS |
| Animations | GSAP |
| Icons | Lucide React |

---

## Project Structure
```
budget-app/
├── backend/           # Express API server (:3000)
│   ├── src/
│   │   ├── controllers/   # API endpoints
│   │   ├── services/      # Business logic (OCR, parsing, etc.)
│   │   ├── models/        # Database models
│   │   ├── routes/        # Route definitions
│   │   ├── middleware/    # Cache middleware
│   │   ├── utils/         # Helpers (file storage, seeding)
│   │   └── server.ts      # Express app entry
│   ├── data/              # SQLite DB + receipt images
│   └── tessdata/          # Tesseract language files (.gz)
│
└── frontend/         # React SPA (:5173)
    └── src/
        ├── components/    # UI components
        ├── pages/         # Dashboard, Transactions, Insights, Receipts, Settings
        ├── contexts/      # AccountContext (multi-account)
        ├── services/      # API client
        ├── hooks/         # Custom React hooks
        └── types/         # TypeScript interfaces
```

---

## Key Features (All Working)

1. **Receipt Scanning** - Upload image → Tesseract.js OCR → Auto-parse store, date, items, total → Create transaction
2. **Transactions** - CRUD, filtering, sorting, search, regret tracking
3. **Categories** - Custom income/expense categories with budgets
4. **Insights** - Spending analysis, category breakdown, day-of-week patterns, regret analysis, money leak detection
5. **Multi-Account** - Switch between accounts (e.g., personal/spouse), each with unique color
6. **Export/Import** - JSON backup, CSV export, data reset
7. **Settings** - Theme (light/dark/system), currency (RSD/USD/EUR/etc.), date format

---

## How to Run

```bash
# Install dependencies
npm run install:all

# Seed database with sample data
npm run seed

# Run both servers (backend :3000, frontend :5173)
npm run dev
```

---

## Important Implementation Details

### OCR / Receipt Scanning
- Language files: `backend/tessdata/srp.traineddata.gz` + `eng.traineddata.gz` (must be gzipped)
- Parser: `receipt-parser.service.ts` - extracts merchant, date, line items, totals
- Confidence scoring shows OCR quality

### Currency
- Stored in localStorage as `budget_app_settings`
- Use `getCurrentCurrency()` from `frontend/src/utils/defensive.ts`
- Format with `Intl.NumberFormat` - NOT hardcoded `$`

### Multi-Account
- Accounts stored in localStorage key: `budget_app_accounts`
- Context: `AccountContext.tsx`
- Switching accounts reloads page to refresh data
- Currently accounts are **frontend-only** - backend doesn't filter by account yet

### API Base
- URL: `http://localhost:3000/api`
- No authentication (single-user local app)

### Database
- SQLite at `backend/data/database.sqlite`
- Tables: `categories`, `transactions`, `receipts`
- Indexes on date, category, type, merchant, regret_flag

---

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| Port 3000 in use | `lsof -ti:3000 \| xargs kill -9` |
| OCR language error | Ensure `.gz` files in tessdata/ |
| CSS nesting warning | Put `postcss-nesting` BEFORE `tailwindcss` in postcss.config.js |
| Database locked | Delete `database.sqlite-wal` and `-shm` files |

---

## Recent Changes (2026-02-14)
- Added multi-account support
- Fixed currency display (dynamic, not hardcoded `$`)
- Fixed UI layout (sidebar margin, avatar sizing)
- Gzipped Tesseract language files

---

## Files to NOT Modify (Generated/Installed)
- `node_modules/` - Dependencies
- `frontend/node_modules/` - Dependencies
- `backend/node_modules/` - Dependencies

---

## Commands
```bash
npm run dev          # Run both
npm run seed         # Seed DB
npm run build        # Build both
npm run typecheck   # Type-check both
```
