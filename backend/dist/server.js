"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const database_1 = require("./config/database");
const transaction_routes_1 = __importDefault(require("./routes/transaction.routes"));
const receipt_routes_1 = __importDefault(require("./routes/receipt.routes"));
const category_routes_1 = __importDefault(require("./routes/category.routes"));
const ocr_routes_1 = __importDefault(require("./routes/ocr.routes"));
const insights_routes_1 = __importDefault(require("./routes/insights.routes"));
const export_routes_1 = __importDefault(require("./routes/export.routes"));
const shopping_list_routes_1 = __importDefault(require("./routes/shopping-list.routes"));
const security_1 = require("./middleware/security");
const upload_1 = require("./middleware/upload");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Apply security headers
app.use(security_1.securityHeaders);
// Configure CORS with specific origin (update for production)
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type'],
}));
// Apply rate limiting to all requests
app.use(security_1.rateLimiter);
// JSON parsing with size limits and error handling
app.use(express_1.default.json({
    limit: '1mb',
    strict: true, // Only parse objects and arrays
}));
app.use(express_1.default.urlencoded({ extended: true, limit: '1mb' }));
// Sanitize request body to prevent injection
app.use(security_1.sanitizeBody);
// Global request size validation
app.use((0, security_1.validateRequestSize)(1024 * 1024)); // 1MB
(0, database_1.initializeDatabase)();
app.use('/api/transactions', transaction_routes_1.default);
app.use('/api/receipts', receipt_routes_1.default);
app.use('/api/categories', category_routes_1.default);
app.use('/api/ocr', ocr_routes_1.default);
app.use('/api/insights', insights_routes_1.default);
app.use('/api/export', export_routes_1.default);
app.use('/api/shopping-list', shopping_list_routes_1.default);
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
    });
});
// JSON parsing error handler
app.use(security_1.jsonErrorHandler);
// Upload error handler
app.use(upload_1.handleUploadError);
// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    // Don't leak stack traces in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    // Handle specific error types
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    if (err.name === 'ForbiddenError') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    if (err.code === 'ENOENT') {
        return res.status(404).json({ error: 'Resource not found' });
    }
    // Default server error
    res.status(500).json({
        error: 'Internal server error',
        message: isDevelopment ? err.message : undefined,
        ...(isDevelopment && { stack: err.stack }),
    });
});
const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        (0, database_1.closeDatabase)();
        console.log('Server closed');
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        (0, database_1.closeDatabase)();
        console.log('Server closed');
        process.exit(0);
    });
});
exports.default = app;
//# sourceMappingURL=server.js.map