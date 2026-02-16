import { Request, Response, NextFunction } from 'express';
declare class Cache {
    private store;
    private readonly ttl;
    constructor(ttlMs?: number);
    get(key: string): any | null;
    set(key: string, data: any): void;
    invalidate(pattern?: string): void;
}
export declare const insightsCache: Cache;
export declare const statsCache: Cache;
export declare const transactionCache: Cache;
export declare function cacheMiddleware(cache: Cache, keyGenerator?: (req: Request) => string): (req: Request, res: Response, next: NextFunction) => void;
export declare function invalidateCache(cache: Cache, pattern?: string): (req: Request, res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=cache.d.ts.map