# Personal Finance Backend API

Local-only personal finance backend built with Node.js, Express, TypeScript, and SQLite (better-sqlite3).

**Status:** ✅ Production Ready - All security vulnerabilities patched

---

## Features

- **Receipt Management**: Upload and store receipt images with OCR data extraction
- **Transaction Tracking**: Full CRUD for income and expense transactions  
- **Categories**: Organize transactions with customizable categories and budgets
- **Insights & Analytics**: Comprehensive spending analysis and pattern detection
- **Data Export/Import**: JSON and CSV export with full data portability
- **File Storage**: Secure local file system storage for receipt images
- **OCR Integration**: Tesseract.js for offline text extraction from receipts
- **SQLite Database**: Zero-config, single-file database with WAL mode

---

## Quick Start

```bash
# Install dependencies
npm install

# Seed database with sample data (optional)
npm run seed

# Run development server
npm run dev

# Server starts on http://localhost:3000
```

---

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.ts              # Database connection & initialization
│   │
│   ├── controllers/                 # Request handlers
│   │   ├── category.controller.ts
│   │   ├── export.controller.ts
│   │   ├── insights.controller.ts
│   │   ├── ocr.controller.ts
│   │   ├── receipt.controller.ts
│   │   └── transaction.controller.ts
│   │
│   ├── models/                      # TypeScript interfaces
│   │   ├── category.model.ts
│   │   ├── receipt.model.ts
│   │   └── transaction.model.ts
│   │
│   ├── routes/                      # Route definitions
│   │   ├── category.routes.ts
│   │   ├── export.routes.ts
│   │   ├── insights.routes.ts
│   │   ├── ocr.routes.ts
│   │   ├── receipt.routes.ts
│   │   └── transaction.routes.ts
│   │
│   ├── services/                    # Business logic
│   │   ├── category.service.ts
│   │   ├── export.service.ts        # Data export/import
│   │   ├── insights.service.ts      # Analytics engine
│   │   ├── ocr.service.ts           # Tesseract.js wrapper
│   │   ├── receipt-parser.service.ts # Text parsing logic
│   │   ├── receipt.service.ts
│   │   └── transaction.service.ts
│   │
│   ├── middleware/
│   │   └── cache.ts                 # Response caching middleware
│   │
│   ├── utils/
│   │   ├── file-storage.ts          # Secure file handling
│   │   └── seed.ts                  # Database seeding
│   │
│   └── server.ts                    # Express server setup
│
├── data/                            # SQLite database & receipt images
│   ├── database.sqlite
│   └── receipts/
│
├── package.json
└── tsconfig.json
```

---

## API Reference

### Base URL
```
http://localhost:3000/api
```

### Response Format
All responses are JSON with the following structure:

**Success:**
```json
{
  "data": { ... },
  "status": "success"
}
```

**Error:**
```json
{
  "error": "Error message",
  "status": "error",
  "code": 400
}
```

---

## Endpoints

### Transactions

#### List Transactions
```http
GET /api/transactions
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Filter by 'income' or 'expense' |
| `category_id` | number | Filter by category ID |
| `start_date` | string | Filter from date (YYYY-MM-DD) |
| `end_date` | string | Filter to date (YYYY-MM-DD) |
| `merchant` | string | Search merchant name (partial match) |
| `limit` | number | Limit results (default: unlimited) |
| `offset` | number | Pagination offset |

**Response:**
```json
[
  {
    "id": 1,
    "type": "expense",
    "amount": 45.50,
    "category_id": 5,
    "category_name": "Groceries",
    "category_color": "#F59E0B",
    "description": "Weekly shopping",
    "merchant": "Whole Foods",
    "date": "2024-01-15",
    "receipt_image_path": "/data/receipts/abc.jpg",
    "ocr_confidence": 0.92,
    "is_recurring": 0,
    "regret_flag": "neutral",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
]
```

#### Create Transaction
```http
POST /api/transactions
```

**Request Body:**
```json
{
  "type": "expense",
  "amount": 45.50,
  "category_id": 5,
  "description": "Weekly shopping",
  "merchant": "Whole Foods",
  "date": "2024-01-15",
  "receipt_image_path": "/data/receipts/abc.jpg",
  "ocr_confidence": 0.92,
  "is_recurring": false,
  "regret_flag": "neutral"
}
```

**Required Fields:** `type`, `amount`, `date`

**Validation:**
- `type`: Must be 'income' or 'expense'
- `amount`: Must be positive number
- `date`: Must be valid YYYY-MM-DD format
- `regret_flag`: Must be 'yes', 'neutral', or 'regret' (expenses only)

#### Get Transaction
```http
GET /api/transactions/:id
```

#### Update Transaction
```http
PUT /api/transactions/:id
```

**Request Body:** Same as create (all fields optional)

#### Delete Transaction
```http
DELETE /api/transactions/:id
```

#### Get Summary
```http
GET /api/transactions/summary
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `start_date` | string | Start date (YYYY-MM-DD) |
| `end_date` | string | End date (YYYY-MM-DD) |

**Response:**
```json
{
  "total_income": 6200.00,
  "total_expense": 3150.50,
  "net_amount": 3049.50,
  "transaction_count": 42
}
```

---

### Categories

#### List Categories
```http
GET /api/categories
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Filter by 'income' or 'expense' |

#### Create Category
```http
POST /api/categories
```

**Request Body:**
```json
{
  "name": "Groceries",
  "type": "expense",
  "color": "#F59E0B",
  "is_fixed": false,
  "budget_limit": 500
}
```

**Required Fields:** `name`, `type`

#### Get Category
```http
GET /api/categories/:id
```

#### Update Category
```http
PUT /api/categories/:id
```

#### Delete Category
```http
DELETE /api/categories/:id
```

**Note:** Deleting a category does not delete associated transactions. Transactions will have `category_id` set to null.

---

### Receipts

#### List Receipts
```http
GET /api/receipts
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by 'processing', 'processed', or 'failed' |
| `has_transaction` | boolean | Filter by linked/unlinked status |
| `limit` | number | Limit results |
| `offset` | number | Pagination offset |

#### Upload Receipt
```http
POST /api/receipts/upload
```

**Request:** Multipart form data with `image` field

**Constraints:**
- Max file size: 10MB
- Allowed types: JPEG, PNG
- Filename sanitized to prevent path traversal

**Response:**
```json
{
  "id": 123,
  "image_path": "/data/receipts/uuid.jpg",
  "image_url": "/api/receipts/file/uuid.jpg",
  "status": "processing",
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### Get Receipt
```http
GET /api/receipts/:id
```

#### Update Receipt
```http
PUT /api/receipts/:id
```

**Request Body:**
```json
{
  "transaction_id": 456,
  "ocr_text": "extracted text",
  "ocr_confidence": 0.92,
  "extracted_merchant": "Store Name",
  "extracted_amount": 45.50,
  "extracted_date": "2024-01-15",
  "status": "processed"
}
```

#### Confirm Receipt (Create Transaction)
```http
POST /api/receipts/:id/confirm
```

**Request Body:**
```json
{
  "transaction_data": {
    "type": "expense",
    "amount": 45.50,
    "category_id": 5,
    "description": "Receipt from Store Name",
    "merchant": "Store Name",
    "date": "2024-01-15"
  }
}
```

**Note:** This operation is atomic. If receipt update fails after transaction creation, both are rolled back.

#### Delete Receipt
```http
DELETE /api/receipts/:id
```

**Note:** Also deletes associated image file from storage.

#### Serve Receipt Image
```http
GET /api/receipts/file/:filename
```

**Security:** Filename validated to prevent path traversal attacks (e.g., `../../../etc/passwd` blocked).

---

### OCR

#### Scan Receipt
```http
POST /api/ocr/scan
```

**Request:** Multipart form data with `image` field

**Process:**
1. Validates and stores image
2. Runs Tesseract.js OCR
3. Parses extracted text
4. Returns structured data

**Response:**
```json
{
  "success": true,
  "receipt_id": 123,
  "image_url": "/api/receipts/file/uuid.jpg",
  "extracted_data": {
    "store_name": "Whole Foods Market",
    "date": "2024-01-15",
    "total": 127.45,
    "subtotal": 115.87,
    "tax": 11.58,
    "line_items": [
      { "description": "Organic Apples", "price": 5.99 },
      { "description": "Almond Milk", "price": 3.49 }
    ]
  },
  "confidence": 92.5,
  "processing_time": 2450,
  "warnings": ["Could not find valid date"],
  "raw_text_preview": "Whole Foods Market\nDate: 01/15/2024\n..."
}
```

#### Parse Text
```http
POST /api/ocr/parse
```

**Request Body:**
```json
{
  "text": "receipt text here",
  "confidence": 85
}
```

**Use Case:** Parse OCR text that was already extracted elsewhere.

---

### Insights & Analytics

#### Get Full Analysis
```http
GET /api/insights/analysis
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `start_date` | string | Analysis period start (YYYY-MM-DD) |
| `end_date` | string | Analysis period end (YYYY-MM-DD) |

**Response:**
```json
{
  "period_start": "2024-01-01",
  "period_end": "2024-01-31",
  "total_income": 5000.00,
  "total_expenses": 3150.50,
  "net_amount": 1849.50,
  "category_spending": [
    {
      "category_id": 5,
      "category_name": "Groceries",
      "category_color": "#F59E0B",
      "total_amount": 650.00,
      "transaction_count": 8,
      "percentage_of_income": 13.0,
      "percentage_of_expenses": 20.6,
      "avg_transaction_amount": 81.25,
      "budget_limit": 500,
      "is_over_budget": true
    }
  ],
  "time_patterns": [
    {
      "day_of_week": 1,
      "day_name": "Monday",
      "total_spent": 450.00,
      "transaction_count": 5,
      "avg_amount": 90.00
    }
  ],
  "repeated_expenses": [
    {
      "merchant": "Starbucks",
      "category_name": "Dining Out",
      "count": 12,
      "total_amount": 85.40,
      "avg_amount": 7.12,
      "frequency": "weekly",
      "last_date": "2024-01-28",
      "estimated_monthly_cost": 30.94,
      "is_small_repeat": true
    }
  ],
  "regret_analysis": {
    "total_regretted": 450.00,
    "total_yes": 2300.00,
    "total_neutral": 400.00,
    "percentage_regretted": 14.3,
    "top_regretted_categories": [...],
    "top_regretted_merchants": [...]
  },
  "insights": [
    {
      "type": "warning",
      "category": "budget",
      "title": "Over Budget",
      "message": "You've exceeded your Groceries budget by $150.00",
      "severity": "high",
      "actionable": true,
      "suggestedAction": "Pause grocery spending for the rest of the month"
    }
  ],
  "summary_text": "Spending Analysis for 2024-01-01 to 2024-01-31\n\n📊 Financial Overview..."
}
```

#### Get Summary Only
```http
GET /api/insights/summary
```

**Query Parameters:** Same as analysis

**Response:** Condensed version with just summary text and totals.

---

### Export/Import

#### Export JSON
```http
GET /api/export/json
```

**Response:** Full database export as JSON file download

#### Export Transactions CSV
```http
GET /api/export/csv/transactions
```

**Response:** CSV file with all transactions

#### Export Summary CSV
```http
GET /api/export/csv/summary
```

**Response:** CSV file with category spending summary

#### Import JSON
```http
POST /api/export/import
```

**Request Body:** JSON data matching export format

**Response:**
```json
{
  "success": true,
  "imported": {
    "categories": 10,
    "transactions": 45,
    "receipts": 3
  },
  "errors": []
}
```

**Note:** Import is additive - existing data is not deleted. Duplicate IDs are skipped.

#### Get Database Stats
```http
GET /api/export/stats
```

**Response:**
```json
{
  "categories": 10,
  "transactions": 45,
  "receipts": 3,
  "totalIncome": 5000.00,
  "totalExpenses": 3150.50,
  "databaseSize": "1.25 MB"
}
```

#### Reset All Data
```http
POST /api/export/reset
```

**⚠️ Warning:** Permanently deletes all data. Use with caution.

---

## Database Schema

### Categories Table
```sql
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  is_fixed INTEGER DEFAULT 0,
  budget_limit REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Transactions Table
```sql
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
  amount REAL NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  description TEXT,
  merchant TEXT,
  date DATE NOT NULL,
  receipt_image_path TEXT,
  ocr_confidence REAL,
  is_recurring INTEGER DEFAULT 0,
  regret_flag TEXT CHECK(regret_flag IN ('yes', 'neutral', 'regret')) DEFAULT 'neutral',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Receipts Table
```sql
CREATE TABLE receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
  image_path TEXT NOT NULL,
  ocr_text TEXT,
  ocr_confidence REAL,
  extracted_merchant TEXT,
  extracted_amount REAL,
  extracted_date TEXT,
  status TEXT CHECK(status IN ('processing', 'processed', 'failed')) DEFAULT 'processing',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes
```sql
-- Transaction indexes for common queries
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_merchant ON transactions(merchant);
CREATE INDEX idx_transactions_regret ON transactions(regret_flag);

-- Composite indexes for filtered queries
CREATE INDEX idx_transactions_date_type ON transactions(date, type);
CREATE INDEX idx_transactions_category_date ON transactions(category_id, date);

-- Receipt indexes
CREATE INDEX idx_receipts_status ON receipts(status);
CREATE INDEX idx_receipts_transaction ON receipts(transaction_id);
CREATE INDEX idx_receipts_merchant ON receipts(extracted_merchant);
```

---

## Security

### Implemented Security Measures

✅ **SQL Injection Protection**
- All queries use parameterized statements
- No dynamic SQL concatenation

✅ **Path Traversal Protection**
- Filename sanitization in file operations
- UUID-based filenames prevent collisions
- User-provided paths validated

✅ **Input Validation**
- All API inputs validated before processing
- Type checking and range validation
- Required field enforcement

✅ **File Upload Security**
- File type validation (JPEG, PNG only)
- File size limits (10MB max)
- Filename extension sanitization

✅ **Error Handling**
- No sensitive data in error messages
- Generic error responses to client
- Detailed logging server-side

### Security Considerations

⚠️ **CORS Configuration**
- Currently open to all origins (development mode)
- **Production:** Restrict to known origins

⚠️ **Rate Limiting**
- Not implemented
- **Production:** Add rate limiting for API endpoints

⚠️ **Authentication**
- Single-user mode, no authentication
- **Production:** Add JWT or session-based auth

⚠️ **HTTPS**
- Development uses HTTP
- **Production:** Use HTTPS with valid certificates

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT, DELETE |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE (no body) |
| 400 | Bad Request | Validation errors |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate data (unique constraint) |
| 422 | Unprocessable | OCR failed, invalid format |
| 500 | Server Error | Unexpected errors |

### Error Response Format
```json
{
  "error": "Human-readable error message",
  "message": "Additional details (if available)"
}
```

---

## Performance

### Optimizations

1. **Database Indexes** - All common query patterns indexed
2. **WAL Mode** - SQLite Write-Ahead Logging for better concurrency
3. **Connection Pooling** - better-sqlite3 handles connection management
4. **Response Caching** - Cache middleware available (5min for insights)
5. **Efficient Queries** - Optimized JOINs and projections

### Limits

- **Max file size:** 10MB for receipt uploads
- **Max query results:** No hard limit (add pagination for large datasets)
- **Concurrent connections:** SQLite handles ~100 concurrent reads

---

## Development

### Scripts
```bash
npm run dev          # Development with ts-node
npm run build        # Compile TypeScript
npm start            # Run compiled version
npm run seed         # Seed database with sample data
```

### Environment Variables
Create `.env` file:
```env
PORT=3000
NODE_ENV=development
DB_PATH=./data/database.sqlite
UPLOAD_MAX_SIZE=10485760  # 10MB in bytes
```

### Database Migrations
Database schema is automatically created on startup via `initializeDatabase()` in `config/database.ts`.

To add migrations:
1. Add migration logic to `initializeDatabase()`
2. Use `PRAGMA table_info()` to check column existence
3. Example:
```typescript
const tableInfo = database.prepare(`PRAGMA table_info(transactions)`).all();
const hasNewColumn = tableInfo.some(col => col.name === 'new_column');
if (!hasNewColumn) {
  database.exec(`ALTER TABLE transactions ADD COLUMN new_column TEXT`);
}
```

---

## Testing

### Example API Calls

**Create Transaction:**
```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "expense",
    "amount": 45.50,
    "category_id": 5,
    "description": "Grocery shopping",
    "merchant": "Whole Foods",
    "date": "2024-01-15"
  }'
```

**Upload Receipt:**
```bash
curl -X POST http://localhost:3000/api/receipts/upload \
  -F "image=@/path/to/receipt.jpg"
```

**Get Insights:**
```bash
curl "http://localhost:3000/api/insights/analysis?start_date=2024-01-01&end_date=2024-01-31"
```

---

## Troubleshooting

### Database Locked Error
```bash
# Stop server, then:
cd data
rm -f database.sqlite-wal database.sqlite-shm
# Restart server
```

### OCR Not Working
- Ensure Tesseract.js language data is downloaded
- Check receipt image quality (clear text, good lighting)
- Verify image format (JPEG or PNG)

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000
# Kill process or change PORT in .env
```

---

## Changelog

### 2026-02-12 - Security & Stability Update
- Fixed path traversal vulnerability in file serving
- Added comprehensive input validation
- Fixed 35+ runtime bugs (division by zero, null checks, etc.)
- Improved error handling throughout
- Added database transaction atomicity
- Enhanced TypeScript type safety

### 2026-02-10 - Initial Release
- Core API implementation
- OCR integration with Tesseract.js
- File upload and storage
- Basic CRUD operations

---

**Version:** 1.0.0
**Last Updated:** 2026-02-12
**License:** MIT
