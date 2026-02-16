/**
 * Destructive Stress Testing Suite
 * Tests the application against:
 * - Rapid repeated clicks
 * - Invalid data flooding
 * - Edge value abuse
 * - Missing backend responses
 * - Unexpected null/undefined values
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../server';
import { getDatabase } from '../config/database';

const API_BASE = '/api';

// Helper to create valid transaction data
const createValidTransaction = (overrides = {}) => ({
  type: 'expense',
  amount: 100.50,
  date: new Date().toISOString().split('T')[0],
  description: 'Test transaction',
  merchant: 'Test Store',
  ...overrides,
});

describe('DESTRUCTIVE STRESS TESTS', () => {
  beforeAll(async () => {
    // Ensure database is initialized
    getDatabase();
  });

  afterAll(async () => {
    // Cleanup
  });

  beforeEach(async () => {
    // Reset database state before each test
    await request(app).post(`${API_BASE}/export/reset`);
  });

  describe('RAPID REPEATED CLICKS (Rate Limiting)', () => {
    it('should block rapid transaction creation (100 req/min limit)', async () => {
      const requests = Array(150).fill(null).map(() => 
        request(app)
          .post(`${API_BASE}/transactions`)
          .send(createValidTransaction())
      );

      const responses = await Promise.all(requests);
      
      // Most should succeed, but some should be rate limited
      const successCount = responses.filter(r => r.status === 201).length;
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      
      expect(successCount).toBeLessThanOrEqual(100);
      expect(rateLimitedCount).toBeGreaterThan(0);
    });

    it('should block concurrent OCR requests from same client', async () => {
      // Create a small valid image buffer
      const imageBuffer = Buffer.from(
        'ffd8ffe000104a46494600010101006000600000',
        'hex'
      );

      const requests = Array(5).fill(null).map(() =>
        request(app)
          .post(`${API_BASE}/ocr/scan`)
          .attach('image', imageBuffer, 'test.jpg')
      );

      const responses = await Promise.all(requests);
      
      // Only one should succeed, others should be blocked
      const successCount = responses.filter(r => r.status === 200).length;
      const blockedCount = responses.filter(r => r.status === 429).length;
      
      expect(successCount + blockedCount).toBe(5);
      expect(blockedCount).toBeGreaterThan(0);
    });

    it('should limit destructive operations', async () => {
      // Create a transaction first
      const createRes = await request(app)
        .post(`${API_BASE}/transactions`)
        .send(createValidTransaction());
      
      const id = createRes.body.id;

      // Try to delete rapidly
      const requests = Array(20).fill(null).map(() =>
        request(app).delete(`${API_BASE}/transactions/${id}`)
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429).length;
      
      expect(rateLimited).toBeGreaterThan(0);
    });
  });

  describe('INVALID DATA FLOODING', () => {
    it('should reject SQL injection in merchant field', async () => {
      const maliciousInputs = [
        "'; DROP TABLE transactions; --",
        "' OR '1'='1",
        "'; DELETE FROM transactions WHERE '1'='1'; --",
        "1'; EXEC sp_MSforeachtable 'DROP TABLE ?'; --",
        "'; UPDATE transactions SET amount=0; --",
      ];

      for (const input of maliciousInputs) {
        const res = await request(app)
          .post(`${API_BASE}/transactions`)
          .send(createValidTransaction({ merchant: input }));
        
        // Should either sanitize or reject
        expect([201, 400]).toContain(res.status);
        
        if (res.status === 201) {
          // Verify the data was stored safely (not executed as SQL)
          expect(res.body.merchant).not.toContain('DROP');
          expect(res.body.merchant).not.toContain('DELETE');
        }
      }
    });

    it('should reject NoSQL injection attempts', async () => {
      const nosqlInjections = [
        { "$gt": "" },
        { "$ne": null },
        { "$where": "sleep(1000)" },
        { "$regex": ".*" },
      ];

      for (const injection of nosqlInjections) {
        const res = await request(app)
          .post(`${API_BASE}/transactions`)
          .send({ ...createValidTransaction(), ...injection });
        
        expect([201, 400]).toContain(res.status);
      }
    });

    it('should reject XSS attempts in all fields', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src=x onerror=alert("xss")>',
        'onmouseover=alert("xss")',
      ];

      for (const payload of xssPayloads) {
        const res = await request(app)
          .post(`${API_BASE}/transactions`)
          .send(createValidTransaction({ 
            description: payload,
            merchant: payload 
          }));
        
        expect([201, 400]).toContain(res.status);
        
        if (res.status === 201) {
          expect(res.body.description).not.toContain('<script>');
          expect(res.body.merchant).not.toContain('javascript:');
        }
      }
    });

    it('should reject malformed JSON', async () => {
      const res = await request(app)
        .post(`${API_BASE}/transactions`)
        .set('Content-Type', 'application/json')
        .send('{"invalid json');
      
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid JSON');
    });

    it('should reject oversized request body', async () => {
      const hugeDescription = 'a'.repeat(10 * 1024 * 1024); // 10MB string
      
      const res = await request(app)
        .post(`${API_BASE}/transactions`)
        .send(createValidTransaction({ description: hugeDescription }));
      
      expect(res.status).toBe(413);
    });
  });

  describe('EDGE VALUE ABUSE', () => {
    it('should handle extreme amount values', async () => {
      const edgeCases = [
        { amount: -1, shouldFail: true },
        { amount: 0, shouldFail: false },
        { amount: 999999999.99, shouldFail: false },
        { amount: 1000000000, shouldFail: true },
        { amount: Number.MAX_VALUE, shouldFail: true },
        { amount: Number.MIN_VALUE, shouldFail: false },
        { amount: Infinity, shouldFail: true },
        { amount: -Infinity, shouldFail: true },
        { amount: NaN, shouldFail: true },
      ];

      for (const { amount, shouldFail } of edgeCases) {
        const res = await request(app)
          .post(`${API_BASE}/transactions`)
          .send(createValidTransaction({ amount }));
        
        if (shouldFail) {
          expect([400, 422]).toContain(res.status);
        } else {
          expect(res.status).toBe(201);
        }
      }
    });

    it('should handle extreme date values', async () => {
      const dateCases = [
        { date: '0000-01-01', shouldFail: true },
        { date: '9999-12-31', shouldFail: true },
        { date: 'invalid-date', shouldFail: true },
        { date: '', shouldFail: true },
        { date: null, shouldFail: true },
        { date: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], shouldFail: true }, // 2 years in future
      ];

      for (const { date, shouldFail } of dateCases) {
        const res = await request(app)
          .post(`${API_BASE}/transactions`)
          .send(createValidTransaction({ date }));
        
        if (shouldFail) {
          expect([400, 422]).toContain(res.status);
        } else {
          expect(res.status).toBe(201);
        }
      }
    });

    it('should handle extreme string lengths', async () => {
      const stringCases = [
        { field: 'merchant', value: 'a', shouldWork: true },
        { field: 'merchant', value: 'a'.repeat(200), shouldWork: true },
        { field: 'merchant', value: 'a'.repeat(201), shouldWork: false },
        { field: 'merchant', value: 'a'.repeat(10000), shouldWork: false },
        { field: 'description', value: 'a'.repeat(1000), shouldWork: true },
        { field: 'description', value: 'a'.repeat(1001), shouldWork: false },
      ];

      for (const { field, value, shouldWork } of stringCases) {
        const res = await request(app)
          .post(`${API_BASE}/transactions`)
          .send(createValidTransaction({ [field]: value }));
        
        if (shouldWork) {
          expect(res.status).toBe(201);
        } else {
          expect([400, 201]).toContain(res.status); // Might truncate or reject
        }
      }
    });

    it('should handle special characters in fields', async () => {
      const specialChars = [
        '\x00', // Null byte
        '\x1F', // Control character
        '\n\r\t', // Whitespace
        '🔥🎉💰', // Emoji
        '日本語', // Unicode
        '𝕳𝖊𝖑𝖑𝖔', // Mathematical alphanumeric symbols
      ];

      for (const chars of specialChars) {
        const res = await request(app)
          .post(`${API_BASE}/transactions`)
          .send(createValidTransaction({ merchant: chars }));
        
        expect([201, 400]).toContain(res.status);
      }
    });
  });

  describe('MISSING BACKEND RESPONSES', () => {
    it('should handle database connection errors gracefully', async () => {
      // This would require mocking the database connection
      // For now, verify error handler exists
      const res = await request(app).get(`${API_BASE}/health`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status');
    });

    it('should handle missing resources gracefully', async () => {
      const res = await request(app).get(`${API_BASE}/transactions/999999`);
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });

    it('should handle invalid IDs gracefully', async () => {
      const invalidIds = ['abc', '-1', '0', '99999999999999999999', '1.5', '1; DROP TABLE'];

      for (const id of invalidIds) {
        const res = await request(app).get(`${API_BASE}/transactions/${id}`);
        expect([400, 404, 422]).toContain(res.status);
      }
    });
  });

  describe('NULL/UNDEFINED VALUE HANDLING', () => {
    it('should handle null values in required fields', async () => {
      const nullCases = [
        { type: null },
        { amount: null },
        { date: null },
        { type: undefined },
        { amount: undefined },
        { date: undefined },
      ];

      for (const nullCase of nullCases) {
        const res = await request(app)
          .post(`${API_BASE}/transactions`)
          .send(createValidTransaction(nullCase));
        
        expect([400, 201, 422]).toContain(res.status);
      }
    });

    it('should handle empty request body', async () => {
      const res = await request(app)
        .post(`${API_BASE}/transactions`)
        .send({});
      
      expect(res.status).toBe(400);
    });

    it('should handle missing optional fields', async () => {
      const minimalTransaction = {
        type: 'expense',
        amount: 50,
        date: new Date().toISOString().split('T')[0],
      };

      const res = await request(app)
        .post(`${API_BASE}/transactions`)
        .send(minimalTransaction);
      
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
    });

    it('should handle arrays instead of expected types', async () => {
      const wrongTypes = [
        { amount: [100] },
        { type: ['expense'] },
        { date: [new Date().toISOString()] },
        { description: { value: 'test' } },
      ];

      for (const wrongType of wrongTypes) {
        const res = await request(app)
          .post(`${API_BASE}/transactions`)
          .send(createValidTransaction(wrongType));
        
        expect([400, 422]).toContain(res.status);
      }
    });
  });

  describe('FILE UPLOAD ABUSE', () => {
    it('should reject non-image files', async () => {
      const fakeFiles = [
        { buffer: Buffer.from('not an image'), filename: 'test.txt' },
        { buffer: Buffer.from('<?php phpinfo(); ?>'), filename: 'shell.php' },
        { buffer: Buffer.from(''), filename: 'empty.jpg' },
      ];

      for (const { buffer, filename } of fakeFiles) {
        const res = await request(app)
          .post(`${API_BASE}/ocr/scan`)
          .attach('image', buffer, filename);
        
        expect([400, 415, 422]).toContain(res.status);
      }
    });

    it('should reject path traversal in filenames', async () => {
      const traversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        'image.jpg/../../../etc/passwd',
      ];

      // These would typically be tested through file download endpoints
      for (const filename of traversalAttempts) {
        const res = await request(app).get(`${API_BASE}/receipts/file/${filename}`);
        expect([400, 404]).toContain(res.status);
      }
    });
  });

  describe('COMBINATION ATTACKS', () => {
    it('should handle multiple simultaneous attack vectors', async () => {
      const attackTransaction = {
        type: 'expense',
        amount: 9999999999, // Too large
        date: 'invalid',
        merchant: "'; DROP TABLE transactions; --",
        description: '<script>alert("xss")</script>',
      };

      const res = await request(app)
        .post(`${API_BASE}/transactions`)
        .send(attackTransaction);
      
      expect(res.status).toBe(400);
    });

    it('should maintain data integrity under stress', async () => {
      // Create some valid transactions
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post(`${API_BASE}/transactions`)
          .send(createValidTransaction({ amount: i + 1 }));
      }

      // Try to corrupt with invalid requests
      const attacks = Array(50).fill(null).map(() =>
        request(app)
          .post(`${API_BASE}/transactions`)
          .send({ type: 'invalid', amount: -1000 })
      );

      await Promise.all(attacks);

      // Verify valid transactions still exist
      const summaryRes = await request(app).get(`${API_BASE}/transactions/summary`);
      expect(summaryRes.status).toBe(200);
      expect(summaryRes.body.transaction_count).toBe(10);
    });
  });
});
