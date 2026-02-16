"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsightsService = void 0;
const database_1 = require("../config/database");
class InsightsService {
    constructor() {
        this.db = (0, database_1.getDatabase)();
    }
    /**
     * Analyze spending patterns for a given date range
     */
    analyzeSpending(startDate, endDate) {
        const now = new Date();
        const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodStart = startDate || defaultStart.toISOString().split('T')[0];
        const periodEnd = endDate || now.toISOString().split('T')[0];
        const transactions = this.getTransactionsInRange(periodStart, periodEnd);
        const income = this.getIncomeInRange(periodStart, periodEnd);
        const expenses = this.getExpensesInRange(periodStart, periodEnd);
        const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
        const categorySpending = this.analyzeCategorySpending(expenses, totalIncome, totalExpenses);
        const timePatterns = this.analyzeTimePatterns(expenses);
        const repeatedExpenses = this.detectRepeatedExpenses(expenses);
        const regretAnalysis = this.analyzeRegret(expenses);
        const insights = this.generateInsights(categorySpending, timePatterns, repeatedExpenses, regretAnalysis, totalIncome, totalExpenses, transactions);
        const summaryText = this.generateSummaryText(periodStart, periodEnd, totalIncome, totalExpenses, categorySpending, insights);
        return {
            period_start: periodStart,
            period_end: periodEnd,
            total_income: totalIncome,
            total_expenses: totalExpenses,
            net_amount: totalIncome - totalExpenses,
            category_spending: categorySpending,
            time_patterns: timePatterns,
            repeated_expenses: repeatedExpenses,
            regret_analysis: regretAnalysis,
            insights,
            summary_text: summaryText,
        };
    }
    getTransactionsInRange(startDate, endDate) {
        const stmt = this.db.prepare(`
      SELECT 
        t.*,
        c.name as category_name,
        c.color as category_color,
        c.budget_limit
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.date >= ? AND t.date <= ?
      ORDER BY t.date DESC
    `);
        return stmt.all(startDate, endDate);
    }
    getIncomeInRange(startDate, endDate) {
        const stmt = this.db.prepare(`
      SELECT 
        t.*,
        c.name as category_name,
        c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.type = 'income' AND t.date >= ? AND t.date <= ?
      ORDER BY t.date DESC
    `);
        return stmt.all(startDate, endDate);
    }
    getExpensesInRange(startDate, endDate) {
        const stmt = this.db.prepare(`
      SELECT 
        t.*,
        c.name as category_name,
        c.color as category_color,
        c.budget_limit
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.type = 'expense' AND t.date >= ? AND t.date <= ?
      ORDER BY t.date DESC
    `);
        return stmt.all(startDate, endDate);
    }
    /**
     * Analyze spending by category with budget tracking
     */
    analyzeCategorySpending(expenses, totalIncome, totalExpenses) {
        const categoryMap = new Map();
        for (const expense of expenses) {
            const catId = expense.category_id || 0;
            const existing = categoryMap.get(catId);
            if (existing) {
                existing.total_amount += expense.amount;
                existing.transaction_count += 1;
            }
            else {
                categoryMap.set(catId, {
                    category_id: catId,
                    category_name: expense.category_name || 'Uncategorized',
                    category_color: expense.category_color || '#6B7280',
                    total_amount: expense.amount,
                    transaction_count: 1,
                    percentage_of_income: 0,
                    percentage_of_expenses: 0,
                    avg_transaction_amount: 0,
                    budget_limit: expense.budget_limit,
                    is_over_budget: false,
                });
            }
        }
        // Calculate percentages and averages
        const result = [];
        for (const spending of categoryMap.values()) {
            spending.percentage_of_income = totalIncome > 0
                ? (spending.total_amount / totalIncome) * 100
                : 0;
            spending.percentage_of_expenses = totalExpenses > 0
                ? (spending.total_amount / totalExpenses) * 100
                : 0;
            spending.avg_transaction_amount = spending.transaction_count > 0
                ? spending.total_amount / spending.transaction_count
                : 0;
            spending.is_over_budget = spending.budget_limit
                ? spending.total_amount > spending.budget_limit
                : false;
            result.push(spending);
        }
        return result.sort((a, b) => b.total_amount - a.total_amount);
    }
    /**
     * Analyze spending patterns by day of week
     */
    analyzeTimePatterns(expenses) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const patterns = new Map();
        for (let i = 0; i < 7; i++) {
            patterns.set(i, { total: 0, count: 0 });
        }
        for (const expense of expenses) {
            const date = new Date(expense.date);
            const dayOfWeek = date.getDay();
            const current = patterns.get(dayOfWeek);
            current.total += expense.amount;
            current.count += 1;
        }
        return Array.from(patterns.entries()).map(([day, data]) => ({
            day_of_week: day,
            day_name: dayNames[day],
            total_spent: data.total,
            transaction_count: data.count,
            avg_amount: data.count > 0 ? data.total / data.count : 0,
        }));
    }
    /**
     * Detect repeated expenses and subscriptions
     */
    detectRepeatedExpenses(expenses) {
        const merchantGroups = new Map();
        // Group by merchant
        for (const expense of expenses) {
            if (!expense.merchant)
                continue;
            const merchant = expense.merchant.toLowerCase().trim();
            if (!merchantGroups.has(merchant)) {
                merchantGroups.set(merchant, []);
            }
            merchantGroups.get(merchant).push(expense);
        }
        const repeated = [];
        for (const [merchant, transactions] of merchantGroups) {
            if (transactions.length < 2)
                continue;
            const sorted = transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
            const avgAmount = totalAmount / transactions.length;
            // Calculate frequency based on date gaps
            const frequency = this.calculateFrequency(sorted);
            // Detect small repeated expenses (subscriptions, habits)
            const isSmallRepeat = avgAmount < 50 && transactions.length >= 3;
            // Estimate monthly cost
            const estimatedMonthly = this.estimateMonthlyCost(frequency, avgAmount);
            repeated.push({
                merchant: transactions[0].merchant,
                category_name: transactions[0].category_name || 'Uncategorized',
                count: transactions.length,
                total_amount: totalAmount,
                avg_amount: avgAmount,
                frequency,
                last_date: sorted[sorted.length - 1].date,
                estimated_monthly_cost: estimatedMonthly,
                is_small_repeat: isSmallRepeat,
            });
        }
        return repeated.sort((a, b) => b.estimated_monthly_cost - a.estimated_monthly_cost);
    }
    calculateFrequency(transactions) {
        if (transactions.length < 2)
            return 'irregular';
        const gaps = [];
        for (let i = 1; i < transactions.length; i++) {
            const days = (new Date(transactions[i].date).getTime() -
                new Date(transactions[i - 1].date).getTime()) / (1000 * 60 * 60 * 24);
            gaps.push(days);
        }
        const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
        if (avgGap <= 2)
            return 'daily';
        if (avgGap <= 10)
            return 'weekly';
        if (avgGap <= 20)
            return 'biweekly';
        if (avgGap <= 40)
            return 'monthly';
        return 'irregular';
    }
    estimateMonthlyCost(frequency, avgAmount) {
        switch (frequency) {
            case 'daily': return avgAmount * 30;
            case 'weekly': return avgAmount * 4.3;
            case 'biweekly': return avgAmount * 2.15;
            case 'monthly': return avgAmount;
            default: return avgAmount * 2; // Rough estimate for irregular
        }
    }
    /**
     * Analyze regret patterns from manual reflection
     */
    analyzeRegret(expenses) {
        const regretted = expenses.filter(e => e.regret_flag === 'regret');
        const yes = expenses.filter(e => e.regret_flag === 'yes');
        const neutral = expenses.filter(e => e.regret_flag === 'neutral');
        const totalRegretted = regretted.reduce((sum, e) => sum + e.amount, 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        // Group by category
        const categoryMap = new Map();
        for (const expense of regretted) {
            const catName = expense.category_name || 'Uncategorized';
            const existing = categoryMap.get(catName) || { amount: 0, count: 0 };
            existing.amount += expense.amount;
            existing.count += 1;
            categoryMap.set(catName, existing);
        }
        // Group by merchant
        const merchantMap = new Map();
        for (const expense of regretted) {
            if (!expense.merchant)
                continue;
            const existing = merchantMap.get(expense.merchant) || { amount: 0, count: 0 };
            existing.amount += expense.amount;
            existing.count += 1;
            merchantMap.set(expense.merchant, existing);
        }
        return {
            total_regretted: totalRegretted,
            total_yes: yes.reduce((sum, e) => sum + e.amount, 0),
            total_neutral: neutral.reduce((sum, e) => sum + e.amount, 0),
            percentage_regretted: totalExpenses > 0 ? (totalRegretted / totalExpenses) * 100 : 0,
            top_regretted_categories: Array.from(categoryMap.entries())
                .map(([name, data]) => ({ category_name: name, ...data }))
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 5),
            top_regretted_merchants: Array.from(merchantMap.entries())
                .map(([name, data]) => ({ merchant: name, ...data }))
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 5),
        };
    }
    /**
     * Generate actionable insights from all analyses
     */
    generateInsights(categorySpending, timePatterns, repeatedExpenses, regretAnalysis, totalIncome, totalExpenses, allTransactions) {
        const insights = [];
        // 1. Category percentage of income analysis
        for (const cat of categorySpending) {
            if (cat.percentage_of_income > 30) {
                insights.push({
                    type: 'warning',
                    category: 'spending_ratio',
                    title: 'High Spending Alert',
                    message: `${cat.category_name} is taking up ${cat.percentage_of_income.toFixed(1)}% of your income. This is significantly high and may impact your ability to save or cover other essential expenses.`,
                    severity: 'high',
                    actionable: true,
                    suggestedAction: `Try to reduce ${cat.category_name.toLowerCase()} spending by setting a stricter budget limit.`,
                    data: { category: cat.category_name, percentage: cat.percentage_of_income },
                });
            }
            else if (cat.percentage_of_income > 20) {
                insights.push({
                    type: 'info',
                    category: 'spending_ratio',
                    title: 'Spending Note',
                    message: `${cat.category_name} represents ${cat.percentage_of_income.toFixed(1)}% of your income. Keep an eye on this category to ensure it doesn't grow.`,
                    severity: 'medium',
                    actionable: false,
                    data: { category: cat.category_name, percentage: cat.percentage_of_income },
                });
            }
        }
        // 2. Budget overruns
        for (const cat of categorySpending.filter(c => c.is_over_budget)) {
            const overBy = cat.total_amount - (cat.budget_limit || 0);
            insights.push({
                type: 'warning',
                category: 'budget',
                title: 'Over Budget',
                message: `You've exceeded your ${cat.category_name} budget by $${overBy.toFixed(2)}. You're spending ${cat.total_amount.toFixed(2)} against a budget of $${cat.budget_limit?.toFixed(2)}.`,
                severity: 'high',
                actionable: true,
                suggestedAction: `Pause ${cat.category_name.toLowerCase()} spending for the rest of the month or adjust your budget limit.`,
                data: { category: cat.category_name, over_by: overBy },
            });
        }
        // 3. Small repeated expenses (subscriptions, habits)
        const smallRepeats = repeatedExpenses.filter(r => r.is_small_repeat);
        if (smallRepeats.length > 0) {
            const totalMonthly = smallRepeats.reduce((sum, r) => sum + r.estimated_monthly_cost, 0);
            if (totalMonthly > 100) {
                insights.push({
                    type: 'tip',
                    category: 'subscriptions',
                    title: 'Subscription Creep Detected',
                    message: `You have ${smallRepeats.length} small recurring expenses totaling about $${totalMonthly.toFixed(2)} per month. These small charges add up!`,
                    severity: 'medium',
                    actionable: true,
                    suggestedAction: 'Review these subscriptions and cancel any you no longer use or need.',
                    data: { count: smallRepeats.length, monthly_total: totalMonthly },
                });
            }
        }
        // 4. Time-based patterns - Weekend spending
        const weekendSpending = timePatterns
            .filter(t => t.day_of_week === 0 || t.day_of_week === 6)
            .reduce((sum, t) => sum + t.total_spent, 0);
        const weekdaySpending = timePatterns
            .filter(t => t.day_of_week >= 1 && t.day_of_week <= 5)
            .reduce((sum, t) => sum + t.total_spent, 0) / 5;
        if (weekendSpending / 2 > weekdaySpending * 1.5) {
            insights.push({
                type: 'info',
                category: 'time_pattern',
                title: 'Weekend Spending Spike',
                message: `Your weekend spending ($${(weekendSpending / 2).toFixed(2)}/day) is significantly higher than weekdays ($${weekdaySpending.toFixed(2)}/day).`,
                severity: 'low',
                actionable: true,
                suggestedAction: 'Plan weekend activities in advance and set a weekend spending limit.',
                data: { weekend_avg: weekendSpending / 2, weekday_avg: weekdaySpending },
            });
        }
        // 5. High frequency merchants
        const highFreq = repeatedExpenses.filter(r => r.count >= 5 && r.frequency === 'weekly');
        for (const freq of highFreq) {
            insights.push({
                type: 'info',
                category: 'frequency',
                title: 'Frequent Spending Pattern',
                message: `You visited ${freq.merchant} ${freq.count} times this period (${freq.frequency}). That's about $${freq.estimated_monthly_cost.toFixed(2)} per month.`,
                severity: 'low',
                actionable: true,
                suggestedAction: `Consider if you can reduce visits to ${freq.merchant} or find cheaper alternatives.`,
                data: { merchant: freq.merchant, count: freq.count, monthly_cost: freq.estimated_monthly_cost },
            });
        }
        // 6. Regret analysis
        if (regretAnalysis.percentage_regretted > 10) {
            insights.push({
                type: 'warning',
                category: 'regret',
                title: 'High Regret Spending',
                message: `${regretAnalysis.percentage_regretted.toFixed(1)}% of your spending ($${regretAnalysis.total_regretted.toFixed(2)}) was marked as regretted. This indicates impulsive or unnecessary purchases.`,
                severity: 'high',
                actionable: true,
                suggestedAction: 'Before making purchases, especially in your top regretted categories, take 24 hours to consider if you really need it.',
                data: { percentage: regretAnalysis.percentage_regretted, amount: regretAnalysis.total_regretted },
            });
        }
        else if (regretAnalysis.percentage_regretted > 5) {
            insights.push({
                type: 'tip',
                category: 'regret',
                title: 'Some Regret Spending',
                message: `${regretAnalysis.percentage_regretted.toFixed(1)}% of your spending ($${regretAnalysis.total_regretted.toFixed(2)}) was marked as regretted.`,
                severity: 'medium',
                actionable: true,
                suggestedAction: 'Review your regretted purchases to identify patterns and avoid similar situations.',
                data: { percentage: regretAnalysis.percentage_regretted, amount: regretAnalysis.total_regretted },
            });
        }
        // 7. Top regretted merchant insight
        if (regretAnalysis.top_regretted_merchants.length > 0) {
            const topMerchant = regretAnalysis.top_regretted_merchants[0];
            if (topMerchant.count >= 2) {
                insights.push({
                    type: 'tip',
                    category: 'regret',
                    title: 'Regret Pattern Detected',
                    message: `You marked ${topMerchant.count} purchases at ${topMerchant.merchant} as regretted, totaling $${topMerchant.amount.toFixed(2)}.`,
                    severity: 'medium',
                    actionable: true,
                    suggestedAction: `Be extra cautious when spending at ${topMerchant.merchant}. Consider setting a specific budget for this merchant.`,
                    data: { merchant: topMerchant.merchant, count: topMerchant.count, amount: topMerchant.amount },
                });
            }
        }
        // 8. Income vs Expenses
        if (totalExpenses > totalIncome) {
            const deficit = totalExpenses - totalIncome;
            insights.push({
                type: 'warning',
                category: 'cashflow',
                title: 'Deficit Spending',
                message: `You're spending $${deficit.toFixed(2)} more than you earned this period. This creates a deficit that must be covered by savings or debt.`,
                severity: 'high',
                actionable: true,
                suggestedAction: 'Immediately review your expenses and cut non-essential spending. Focus on needs vs wants.',
                data: { deficit, expenses: totalExpenses, income: totalIncome },
            });
        }
        else if (totalIncome > 0) {
            const savingsRate = ((totalIncome - totalExpenses) / totalIncome) * 100;
            if (savingsRate > 20) {
                insights.push({
                    type: 'success',
                    category: 'savings',
                    title: 'Great Savings Rate!',
                    message: `You're saving ${savingsRate.toFixed(1)}% of your income ($${(totalIncome - totalExpenses).toFixed(2)}). This is excellent financial discipline!`,
                    severity: 'low',
                    actionable: false,
                    data: { savings_rate: savingsRate, amount: totalIncome - totalExpenses },
                });
            }
            else if (savingsRate < 5) {
                insights.push({
                    type: 'tip',
                    category: 'savings',
                    title: 'Low Savings Rate',
                    message: `You're only saving ${savingsRate.toFixed(1)}% of your income. Financial experts recommend saving at least 20%.`,
                    severity: 'medium',
                    actionable: true,
                    suggestedAction: 'Try to increase your savings by 5% each month until you reach 20%. Automate transfers to savings.',
                    data: { savings_rate: savingsRate, recommended: 20 },
                });
            }
        }
        // 9. Transaction frequency anomaly
        const transactionCount = allTransactions.filter(t => t.type === 'expense').length;
        if (transactionCount > 50) {
            insights.push({
                type: 'info',
                category: 'frequency',
                title: 'High Transaction Volume',
                message: `You made ${transactionCount} expense transactions this period. Frequent small purchases can make budgeting harder.`,
                severity: 'low',
                actionable: true,
                suggestedAction: 'Consider consolidating purchases and planning them in advance to reduce impulse buying.',
                data: { transaction_count: transactionCount },
            });
        }
        // Sort by severity
        const severityOrder = { high: 0, medium: 1, low: 2 };
        return insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    }
    /**
     * Generate human-readable summary text
     */
    generateSummaryText(periodStart, periodEnd, totalIncome, totalExpenses, categorySpending, insights) {
        const lines = [];
        // Period overview
        lines.push(`Spending Analysis for ${periodStart} to ${periodEnd}`);
        lines.push('');
        // Financial overview
        lines.push(`📊 Financial Overview`);
        lines.push(`   Income: $${totalIncome.toFixed(2)}`);
        lines.push(`   Expenses: $${totalExpenses.toFixed(2)}`);
        const net = totalIncome - totalExpenses;
        lines.push(`   Net: ${net >= 0 ? '+' : ''}$${net.toFixed(2)}`);
        lines.push('');
        // Top spending categories
        lines.push(`📈 Top Spending Categories`);
        const top3 = categorySpending.slice(0, 3);
        for (const cat of top3) {
            lines.push(`   ${cat.category_name}: $${cat.total_amount.toFixed(2)} (${cat.percentage_of_expenses.toFixed(1)}% of expenses)`);
        }
        lines.push('');
        // Key insights
        if (insights.length > 0) {
            lines.push(`💡 Key Insights`);
            const highPriority = insights.filter(i => i.severity === 'high');
            if (highPriority.length > 0) {
                lines.push(`   ⚠️  High Priority (${highPriority.length}):`);
                for (const insight of highPriority.slice(0, 3)) {
                    lines.push(`      • ${insight.title}: ${insight.message.substring(0, 80)}${insight.message.length > 80 ? '...' : ''}`);
                }
                lines.push('');
            }
            const tips = insights.filter(i => i.type === 'tip');
            if (tips.length > 0) {
                lines.push(`   💰 Savings Opportunities (${tips.length}):`);
                for (const tip of tips.slice(0, 2)) {
                    lines.push(`      • ${tip.title}: ${tip.message.substring(0, 80)}${tip.message.length > 80 ? '...' : ''}`);
                }
                lines.push('');
            }
            const successes = insights.filter(i => i.type === 'success');
            if (successes.length > 0) {
                lines.push(`   ✅ Wins (${successes.length}):`);
                for (const success of successes.slice(0, 2)) {
                    lines.push(`      • ${success.message.substring(0, 80)}${success.message.length > 80 ? '...' : ''}`);
                }
            }
        }
        return lines.join('\n');
    }
}
exports.InsightsService = InsightsService;
//# sourceMappingURL=insights.service.js.map