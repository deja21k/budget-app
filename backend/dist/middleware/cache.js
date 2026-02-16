"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionCache = exports.statsCache = exports.insightsCache = void 0;
exports.cacheMiddleware = cacheMiddleware;
exports.invalidateCache = invalidateCache;
class Cache {
    constructor(ttlMs = 60000) {
        this.store = new Map();
        this.ttl = ttlMs;
    }
    get(key) {
        const entry = this.store.get(key);
        if (!entry)
            return null;
        if (Date.now() - entry.timestamp > this.ttl) {
            this.store.delete(key);
            return null;
        }
        return entry.data;
    }
    set(key, data) {
        this.store.set(key, { data, timestamp: Date.now() });
    }
    invalidate(pattern) {
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
exports.insightsCache = new Cache(300000); // 5 minutes
exports.statsCache = new Cache(60000); // 1 minute
exports.transactionCache = new Cache(30000); // 30 seconds
function cacheMiddleware(cache, keyGenerator) {
    return (req, res, next) => {
        const key = keyGenerator ? keyGenerator(req) : `${req.path}-${JSON.stringify(req.query)}`;
        const cached = cache.get(key);
        if (cached) {
            res.json(cached);
            return;
        }
        // Override res.json to cache the response
        const originalJson = res.json.bind(res);
        res.json = (data) => {
            cache.set(key, data);
            return originalJson(data);
        };
        next();
    };
}
function invalidateCache(cache, pattern) {
    return (req, res, next) => {
        const originalJson = res.json.bind(res);
        res.json = (data) => {
            cache.invalidate(pattern);
            return originalJson(data);
        };
        next();
    };
}
//# sourceMappingURL=cache.js.map