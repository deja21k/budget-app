import { Request, Response } from 'express';
export declare class ReceiptController {
    private service;
    private transactionService;
    create: (req: Request, res: Response) => void;
    findAll: (req: Request, res: Response) => void;
    findById: (req: Request, res: Response) => void;
    update: (req: Request, res: Response) => void;
    delete: (req: Request, res: Response) => void;
    confirm: (req: Request, res: Response) => void;
    serveFile: (req: Request, res: Response) => void;
}
//# sourceMappingURL=receipt.controller.d.ts.map