"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const receipt_controller_1 = require("../controllers/receipt.controller");
const router = (0, express_1.Router)();
const controller = new receipt_controller_1.ReceiptController();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
router.post('/upload', upload.single('image'), controller.create);
router.get('/', controller.findAll);
router.get('/file/:filename', controller.serveFile);
router.get('/:id', controller.findById);
router.put('/:id', controller.update);
router.post('/:id/confirm', controller.confirm);
router.delete('/:id', controller.delete);
exports.default = router;
//# sourceMappingURL=receipt.routes.js.map