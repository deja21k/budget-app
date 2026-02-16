"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ocr_controller_1 = require("../controllers/ocr.controller");
const upload_1 = require("../middleware/upload");
const express_validator_1 = require("express-validator");
const security_1 = require("../middleware/security");
const router = (0, express_1.Router)();
const controller = new ocr_controller_1.OCRController();
// OCR scan route with multiple security layers
router.post('/scan', upload_1.preventConcurrentOCR, // Prevent concurrent OCR from same client
upload_1.validateFileSize, // Validate request size
upload_1.uploadConfig.single('image'), // Secure multer config
upload_1.validateImageDimensions, // Validate image dimensions
(0, upload_1.ocrTimeout)(30000), // 30 second timeout for OCR
upload_1.handleUploadError, // Handle upload errors
controller.scanReceipt);
// Parse text route with validation
router.post('/parse', (0, express_validator_1.body)('text')
    .exists()
    .isString()
    .isLength({ min: 1, max: 50000 })
    .withMessage('Text must be between 1 and 50000 characters'), (0, express_validator_1.body)('merchant')
    .optional()
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Merchant must be between 1 and 200 characters'), security_1.handleValidationErrors, controller.parseText);
exports.default = router;
//# sourceMappingURL=ocr.routes.js.map