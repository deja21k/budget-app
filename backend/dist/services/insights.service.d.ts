export interface SpendingInsight {
    type: 'warning' | 'tip' | 'success' | 'info';
    category: string;
    title: string;
    message: string;
    severity: 'high' | 'medium' | 'low';
    actionable: boolean;
    suggestedAction?: string;
    data?: any;
}
export interface CategorySpending {
    category_id: number;
    category_name: string;
    category_color: string;
    total_amount: number;
    transaction_count: number;
    percentage_of_income: number;
    percentage_of_expenses: number;
    avg_transaction_amount: number;
    budget_limit?: number;
    is_over_budget: boolean;
}
export interface TimePattern {
    day_of_week: number;
    day_name: string;
    total_spent: number;
    transaction_count: number;
    avg_amount: number;
}
export interface RepeatedExpense {
    merchant: string;
    category_name: string;
    count: number;
    total_amount: number;
    avg_amount: number;
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'irregular';
    last_date: string;
    estimated_monthly_cost: number;
    is_small_repeat: boolean;
}
export interface RegretAnalysis {
    total_regretted: number;
    total_yes: number;
    total_neutral: number;
    percentage_regretted: number;
    top_regretted_categories: Array<{
        category_name: string;
        amount: number;
        count: number;
    }>;
    top_regretted_merchants: Array<{
        merchant: string;
        amount: number;
        count: number;
    }>;
}
export interface SpendingAnalysis {
    period_start: string;
    period_end: string;
    total_income: number;
    total_expenses: number;
    net_amount: number;
    category_spending: CategorySpending[];
    time_patterns: TimePattern[];
    repeated_expenses: RepeatedExpense[];
    regret_analysis: RegretAnalysis;
    insights: SpendingInsight[];
    summary_text: string;
}
export declare class InsightsService {
    private db;
    /**
     * Analyze spending patterns for a given date range
     */
    analyzeSpending(startDate?: string, endDate?: string): SpendingAnalysis;
    private getTransactionsInRange;
    private getIncomeInRange;
    private getExpensesInRange;
    /**
     * Analyze spending by category with budget tracking
     */
    private analyzeCategorySpending;
    /**
     * Analyze spending patterns by day of week
     */
    private analyzeTimePatterns;
    /**
     * Detect repeated expenses and subscriptions
     */
    private detectRepeatedExpenses;
    private calculateFrequency;
    private estimateMonthlyCost;
    /**
     * Analyze regret patterns from manual reflection
     */
    private analyzeRegret;
    /**
     * Generate actionable insights from all analyses
     */
    private generateInsights;
    /**
     * Generate human-readable summary text
     */
    private generateSummaryText;
}
//# sourceMappingURL=insights.service.d.ts.map