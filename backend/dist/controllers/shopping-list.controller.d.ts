import { Request, Response } from 'express';
export declare class ShoppingListController {
    getAll(req: Request, res: Response): Promise<void>;
    getById(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    create(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    update(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    delete(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    toggleComplete(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getSummary(req: Request, res: Response): Promise<void>;
    getPrediction(req: Request, res: Response): Promise<void>;
    clearCompleted(req: Request, res: Response): Promise<void>;
    predictPrice(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
export declare const shoppingListController: ShoppingListController;
//# sourceMappingURL=shopping-list.controller.d.ts.map