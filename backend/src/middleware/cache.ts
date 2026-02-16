import { Request, Response, NextFunction } from 'express';

interface CacheEntry {
  data: any;
  timestamp: number;
}

class Cache {
  private store = new Map<string, CacheEntry>();
  private readonly ttl: number;

  constructor(ttlMs: number = 60000) {
    this.ttl = ttlMs;
  }

  get(key: string): any | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.store.delete(key);
      return null;
    }
    
    return entry.data;
  }

  set(key: string, data: any): void {
    this.store.set(key, { data, timestamp: Date.now() });
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.store.clear();
      return;
    }
    
    for (const key of this.store.keys()) {
      if (key.includes(pattern)) {
        this.store.delete(key);
      }
    }
  }
}

// Create cache instances for different purposes
export const insightsCache = new Cache(300000); // 5 minutes
export const statsCache = new Cache(60000); // 1 minute
export const transactionCache = new Cache(30000); // 30 seconds

export function cacheMiddleware(cache: Cache, keyGenerator?: (req: Request) => string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator ? keyGenerator(req) : `${req.path}-${JSON.stringify(req.query)}`;
    const cached = cache.get(key);

    if (cached) {
      res.json(cached);
      return;
    }

    // Override res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = (data: any) => {
      cache.set(key, data);
      return originalJson(data);
    };

    next();
  };
}

export function invalidateCache(cache: Cache, pattern?: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    res.json = (data: any) => {
      cache.invalidate(pattern);
      return originalJson(data);
    };
    next();
  };
}
