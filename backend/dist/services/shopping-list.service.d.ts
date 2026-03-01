import { ShoppingListItem, CreateShoppingListItemInput, UpdateShoppingListItemInput, ShoppingListSummary, SpendingPrediction } from '../models/shopping-list.model';
export declare class ShoppingListService {
    private db;
    getAll(): Promise<ShoppingListItem[]>;
    getById(id: number): Promise<ShoppingListItem | null>;
    create(input: CreateShoppingListItemInput): Promise<ShoppingListItem>;
    update(id: number, input: UpdateShoppingListItemInput): Promise<ShoppingListItem | null>;
    delete(id: number): Promise<boolean>;
    toggleComplete(id: number): Promise<ShoppingListItem | null>;
    getSummary(): Promise<ShoppingListSummary>;
    getSpendingPrediction(monthlyBudget?: number): Promise<SpendingPrediction>;
    clearCompleted(): Promise<number>;
}
export declare const shoppingListService: ShoppingListService;
//# sourceMappingURL=shopping-list.service.d.ts.map