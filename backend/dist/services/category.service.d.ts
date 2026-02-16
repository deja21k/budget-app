import { Category, CreateCategoryInput, UpdateCategoryInput } from '../models/category.model';
export declare class CategoryService {
    private db;
    create(input: CreateCategoryInput): Category;
    findById(id: number): Category | null;
    findAll(type?: 'income' | 'expense'): Category[];
    update(id: number, input: UpdateCategoryInput): Category | null;
    delete(id: number): boolean;
}
//# sourceMappingURL=category.service.d.ts.map