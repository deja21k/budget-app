import { Request, Response } from 'express';
export declare class OCRController {
    private ocrService;
    private receiptParser;
    private receiptService;
    scanReceipt: (req: Request, res: Response) => Promise<void>;
    parseText: (req: Request, res: Response) => Promise<void>;
}
//# sourceMappingURL=ocr.controller.d.ts.map