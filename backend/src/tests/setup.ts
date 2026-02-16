import { beforeAll, afterAll, afterEach } from 'vitest';
import { initializeDatabase, closeDatabase, getDatabase } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DB_PATH = path.join(__dirname, '../../data/test.db');

beforeAll(() => {
  // Ensure we're using a test database
  process.env.NODE_ENV = 'test';
  
  // Clean up any existing test database
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  
  // Initialize fresh test database
  initializeDatabase();
});

afterEach(() => {
  // Clean up test data after each test
  try {
    const db = getDatabase();
    db.exec('DELETE FROM transactions');
    db.exec('DELETE FROM receipts');
    db.exec('DELETE FROM categories WHERE id > 12'); // Keep default categories
  } catch (error) {
    console.error('Error cleaning up test data:', error);
  }
});

afterAll(() => {
  // Close database and clean up
  closeDatabase();
  
  // Remove test database
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  
  // Clean up test receipts
  const testReceiptsDir = path.join(__dirname, '../../data/receipts');
  if (fs.existsSync(testReceiptsDir)) {
    const files = fs.readdirSync(testReceiptsDir);
    for (const file of files) {
      if (file.startsWith('test-')) {
        fs.unlinkSync(path.join(testReceiptsDir, file));
      }
    }
  }
});
