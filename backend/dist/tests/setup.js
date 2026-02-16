"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const database_1 = require("../config/database");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const TEST_DB_PATH = path.join(__dirname, '../../data/test.db');
(0, vitest_1.beforeAll)(() => {
    // Ensure we're using a test database
    process.env.NODE_ENV = 'test';
    // Clean up any existing test database
    if (fs.existsSync(TEST_DB_PATH)) {
        fs.unlinkSync(TEST_DB_PATH);
    }
    // Initialize fresh test database
    (0, database_1.initializeDatabase)();
});
(0, vitest_1.afterEach)(() => {
    // Clean up test data after each test
    try {
        const db = (0, database_1.getDatabase)();
        db.exec('DELETE FROM transactions');
        db.exec('DELETE FROM receipts');
        db.exec('DELETE FROM categories WHERE id > 12'); // Keep default categories
    }
    catch (error) {
        console.error('Error cleaning up test data:', error);
    }
});
(0, vitest_1.afterAll)(() => {
    // Close database and clean up
    (0, database_1.closeDatabase)();
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
//# sourceMappingURL=setup.js.map