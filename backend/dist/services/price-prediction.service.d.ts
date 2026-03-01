export interface StorePrice {
    store: string;
    price: number | null;
    url?: string;
    inStock?: boolean;
}
export interface PricePrediction {
    itemName: string;
    prices: StorePrice[];
    suggestedPrice: number | null;
}
export declare function predictPrices(itemName: string): Promise<PricePrediction>;
//# sourceMappingURL=price-prediction.service.d.ts.map