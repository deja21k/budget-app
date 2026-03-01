import express from 'express';
import cors from 'cors';
import * as path from 'path';
import { initializeDatabase, closeDatabase } from './config/database';
import transactionRoutes from './routes/transaction.routes';
import receiptRoutes from './routes/receipt.routes';
import categoryRoutes from './routes/category.routes';
import ocrRoutes from './routes/ocr.routes';
import insightsRoutes from './routes/insights.routes';
import exportRoutes from './routes/export.routes';
import shoppingListRoutes from './routes/shopping-list.routes';
import {
  rateLimiter,
  jsonErrorHandler,
  securityHeaders,
  validateRequestSize,
  sanitizeBody,
} from './middleware/security';
import { handleUploadError } from './middleware/upload';

const app = express();
const PORT = process.env.PORT || 3000;

// Apply security headers
app.use(securityHeaders);

// Configure CORS with specific origin (update for production)
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));

// Apply rate limiting to all requests
app.use(rateLimiter);

// JSON parsing with size limits and error handling
app.use(express.json({ 
  limit: '1mb',
  strict: true, // Only parse objects and arrays
}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Sanitize request body to prevent injection
app.use(sanitizeBody);

// Global request size validation
app.use(validateRequestSize(1024 * 1024)); // 1MB

initializeDatabase();

app.use('/api/transactions', transactionRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/shopping-list', shoppingListRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// JSON parsing error handler
app.use(jsonErrorHandler);

// Upload error handler
app.use(handleUploadError);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
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
    closeDatabase();
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    closeDatabase();
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;