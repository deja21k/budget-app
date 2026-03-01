"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.predictPrices = predictPrices;
const STORES = [
    { name: 'Univerexport', baseUrl: 'https://univerexport.rs', searchPath: '/pretraga?q=' },
    { name: 'Idea', baseUrl: 'https://www.idea.rs', searchPath: '/search?query=' },
    { name: 'Lidl', baseUrl: 'https://www.lidl.rs', searchPath: '/search?query=' },
    { name: 'Maxi', baseUrl: 'https://www.maxi.rs', searchPath: '/search?search_term=' },
    { name: 'Supervero', baseUrl: 'https://www.supervero.rs', searchPath: '/search?q=' },
    { name: 'Mikromarket', baseUrl: 'https://www.mikromarket.rs', searchPath: '/search?search_query=' },
];
const COMMON_ITEMS = {
    'milk': { minPrice: 120, maxPrice: 250 },
    'mleko': { minPrice: 120, maxPrice: 250 },
    'bread': { minPrice: 80, maxPrice: 180 },
    'helb': { minPrice: 80, maxPrice: 180 },
    'lebac': { minPrice: 80, maxPrice: 180 },
    'eggs': { minPrice: 180, maxPrice: 450 },
    'jaja': { minPrice: 180, maxPrice: 450 },
    'butter': { minPrice: 250, maxPrice: 600 },
    'maslac': { minPrice: 250, maxPrice: 600 },
    'cheese': { minPrice: 400, maxPrice: 1500 },
    'sir': { minPrice: 400, maxPrice: 1500 },
    'yogurt': { minPrice: 80, maxPrice: 200 },
    'jogurt': { minPrice: 80, maxPrice: 200 },
    'sour cream': { minPrice: 100, maxPrice: 250 },
    'pavlaka': { minPrice: 100, maxPrice: 250 },
    'chicken': { minPrice: 350, maxPrice: 800 },
    'piletina': { minPrice: 350, maxPrice: 800 },
    'pork': { minPrice: 500, maxPrice: 1200 },
    'svinjsko': { minPrice: 500, maxPrice: 1200 },
    'beef': { minPrice: 600, maxPrice: 1500 },
    'govedina': { minPrice: 600, maxPrice: 1500 },
    'fish': { minPrice: 400, maxPrice: 1500 },
    'riba': { minPrice: 400, maxPrice: 1500 },
    'rice': { minPrice: 150, maxPrice: 400 },
    'pirinac': { minPrice: 150, maxPrice: 400 },
    'pasta': { minPrice: 80, maxPrice: 250 },
    'testenina': { minPrice: 80, maxPrice: 250 },
    'flour': { minPrice: 80, maxPrice: 200 },
    'brasno': { minPrice: 80, maxPrice: 200 },
    'sugar': { minPrice: 80, maxPrice: 180 },
    'secer': { minPrice: 80, maxPrice: 180 },
    'salt': { minPrice: 50, maxPrice: 120 },
    'so': { minPrice: 50, maxPrice: 120 },
    'oil': { minPrice: 150, maxPrice: 400 },
    'ulje': { minPrice: 150, maxPrice: 400 },
    'tomato sauce': { minPrice: 100, maxPrice: 250 },
    'paradajz sos': { minPrice: 100, maxPrice: 250 },
    'potatoes': { minPrice: 60, maxPrice: 150 },
    'krompir': { minPrice: 60, maxPrice: 150 },
    'onions': { minPrice: 50, maxPrice: 150 },
    'luk': { minPrice: 50, maxPrice: 150 },
    'garlic': { minPrice: 100, maxPrice: 300 },
    'beli luk': { minPrice: 100, maxPrice: 300 },
    'carrots': { minPrice: 50, maxPrice: 150 },
    'sargarepa': { minPrice: 50, maxPrice: 150 },
    'lettuce': { minPrice: 50, maxPrice: 150 },
    'zelena salata': { minPrice: 50, maxPrice: 150 },
    'tomatoes': { minPrice: 100, maxPrice: 350 },
    'paradajz': { minPrice: 100, maxPrice: 350 },
    'cucumbers': { minPrice: 80, maxPrice: 250 },
    'krastavac': { minPrice: 80, maxPrice: 250 },
    'peppers': { minPrice: 100, maxPrice: 350 },
    'paprika': { minPrice: 100, maxPrice: 350 },
    'apples': { minPrice: 80, maxPrice: 250 },
    'jabuke': { minPrice: 80, maxPrice: 250 },
    'bananas': { minPrice: 100, maxPrice: 250 },
    'banane': { minPrice: 100, maxPrice: 250 },
    'oranges': { minPrice: 80, maxPrice: 300 },
    'lemons': { minPrice: 100, maxPrice: 350 },
    'coffee': { minPrice: 400, maxPrice: 1500 },
    'tea': { minPrice: 150, maxPrice: 500 },
    'juice': { minPrice: 80, maxPrice: 350 },
    'water': { minPrice: 30, maxPrice: 100 },
    'beer': { minPrice: 80, maxPrice: 250 },
    'wine': { minPrice: 350, maxPrice: 2000 },
    'detergent': { minPrice: 150, maxPrice: 500 },
    'soap': { minPrice: 50, maxPrice: 250 },
    'shampoo': { minPrice: 200, maxPrice: 800 },
    'toothpaste': { minPrice: 100, maxPrice: 400 },
    'toilet paper': { minPrice: 50, maxPrice: 200 },
};
function normalizeItemName(name) {
    return name.toLowerCase().trim();
}
function findPriceRange(itemName) {
    const normalized = normalizeItemName(itemName);
    for (const [key, range] of Object.entries(COMMON_ITEMS)) {
        if (normalized.includes(key) || key.includes(normalized)) {
            return range;
        }
    }
    return null;
}
function estimatePrice(itemName, store) {
    const range = findPriceRange(itemName);
    if (!range)
        return null;
    const storeMultipliers = {
        'Lidl': 0.85,
        'Univerexport': 0.95,
        'Idea': 1.0,
        'Maxi': 0.98,
        'Supervero': 0.92,
        'Mikromarket': 1.05,
    };
    const multiplier = storeMultipliers[store] || 1.0;
    const avgPrice = (range.minPrice + range.maxPrice) / 2;
    return Math.round(avgPrice * multiplier);
}
async function predictPrices(itemName) {
    const prices = [];
    for (const store of STORES) {
        const estimatedPrice = estimatePrice(itemName, store.name);
        prices.push({
            store: store.name,
            price: estimatedPrice,
            url: `${store.baseUrl}${store.searchPath}${encodeURIComponent(itemName)}`,
            inStock: estimatedPrice !== null,
        });
    }
    const validPrices = prices.filter(p => p.price !== null).map(p => p.price);
    const suggestedPrice = validPrices.length > 0
        ? Math.round(validPrices.reduce((a, b) => a + b, 0) / validPrices.length)
        : null;
    return {
        itemName,
        prices,
        suggestedPrice,
    };
}
//# sourceMappingURL=price-prediction.service.js.map