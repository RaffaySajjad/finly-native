
import { useState, useCallback } from 'react';
import { apiService } from '../services/api';
import { MonthlyStats, UnifiedTransaction } from '../types';

export interface BalanceHistoryData {
  dailyBalances: Array<{ date: string; balance: number }>;
  monthlyBalances: Array<{ month: string; balance: number; income: number; expenses: number }>;
  projection: {
    endOfMonth: number;
    daysRemaining: number;
    dailySpendingRate: number;
    isPositive: boolean;
  };
  insights: Array<{
    id: string;
    type: 'info' | 'warning' | 'success';
    title: string;
    description: string;
    icon: string;
  }>;
}

export const useBalanceHistory = () => {
    const [loading, setLoading] = useState(true);
    const [balanceData, setBalanceData] = useState<BalanceHistoryData | null>(null);
    const [stats, setStats] = useState<MonthlyStats | null>(null);

    const loadBalanceHistory = useCallback(async () => {
        try {
            setLoading(true);
            
            // 1. Get Current Stats (Truth)
            const currentStats = await apiService.getMonthlyStats();
            setStats(currentStats);

            // 2. Get Transaction History for last 31 days (to calculate 30 daily changes)
            const now = new Date();
            const pastDate = new Date(now);
            pastDate.setDate(pastDate.getDate() - 31);
            
            // Fetch ALL transactions (Income + Expenses) for this period
            // We use a high limit to ensure we get everything for accurate calculation
            const transactionsResponse = await apiService.getUnifiedTransactions({
                 startDate: pastDate.toISOString(),
                 endDate: now.toISOString(),
                 limit: 2000, 
                 type: 'all'
            });

            // Handle response type (array or paginated object)
            const transactions = Array.isArray(transactionsResponse) 
                ? transactionsResponse 
                : transactionsResponse.transactions;

            // Group transactions by date (YYYY-MM-DD)
            const transactionsByDate: Record<string, UnifiedTransaction[]> = {};
            transactions.forEach(t => {
                const dateKey = new Date(t.date).toISOString().split('T')[0];
                if (!transactionsByDate[dateKey]) {
                    transactionsByDate[dateKey] = [];
                }
                transactionsByDate[dateKey].push(t);
            });

            // 3. Backward Calculation
            // We know the balance at the end of "Today" is currentStats.balance
            // Balance(Day T-1) = Balance(Day T) - Income(Day T) + Expenses(Day T)
            
            const dailyBalances: Array<{ date: string; balance: number }> = [];
            let currentBalance = currentStats.balance;

            // Iterate 30 days back
            for (let i = 0; i < 30; i++) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dateKey = d.toISOString().split('T')[0];

                // Push current day's end balance
                // The chart will show this balance for this date
                dailyBalances.unshift({
                    date: dateKey,
                    balance: currentBalance
                });

                // Calculate previous day's balance for next iteration
                const daysTransactions = transactionsByDate[dateKey] || [];
                let daysIncome = 0;
                let daysExpense = 0;

                daysTransactions.forEach(t => {
                    if (t.type === 'income') {
                        daysIncome += t.amount;
                    } else {
                        daysExpense += t.amount;
                    }
                });

                // Formula: StartBal = EndBal - Income + Expense
                currentBalance = currentBalance - daysIncome + daysExpense;
            }


            // 4. Projection & Insights (Keep existing logic mostly)
             const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
             const today = now.getDate();
             const daysRemaining = daysInMonth - today;

             // Calculate spending rate from recent days in our new dailyBalances
             const recentBalances = dailyBalances.slice(-7);
             let totalSpending = 0;
             let daysWithSpending = 0;
             // Calculate spending based on drops in balance
             for (let i = 1; i < recentBalances.length; i++) {
                 const change = recentBalances[i-1].balance - recentBalances[i].balance;
                 if (change > 0) {
                     totalSpending += change;
                     daysWithSpending++;
                 }
             }
             const dailySpendingRate = daysWithSpending > 0 ? totalSpending / daysWithSpending : 0;
             const projectedEndOfMonth = currentStats.balance - (dailySpendingRate * daysRemaining);

            // Fetch Insights
             let insights: BalanceHistoryData['insights'] = [];
             try {
                // Try AI first
                const aiInsights = await apiService.getBalanceInsights({
                    dailyBalances,
                    monthlyBalances: [], 
                    projection: {
                        endOfMonth: projectedEndOfMonth,
                        daysRemaining,
                        dailySpendingRate,
                        isPositive: projectedEndOfMonth >= 0
                    }
                });
                 if (aiInsights && aiInsights.length > 0) insights = aiInsights;
                 else throw new Error("No AI Data");
             } catch (e) {
                 // Fallback insights logic
                 if (projectedEndOfMonth < 0) {
                     insights.push({
                         id: 'proj_warn', type: 'warning', title: 'Projected Negative', description: 'Reduce spending.', icon: 'alert-circle'
                     });
                 } else {
                     insights.push({
                         id: 'proj_ok', type: 'success', title: 'On Track', description: 'Current pace looks good.', icon: 'check-circle'
                     });
                 }
                 // Add simple fluctuation insight
                 const startBal = dailyBalances[0].balance;
                 const endBal = dailyBalances[dailyBalances.length - 1].balance;
                 const diff = endBal - startBal;
                 if (diff > 0) {
                      insights.push({
                         id: 'trend_up', type: 'success', title: 'Balance Up', description: `+${diff.toFixed(0)} in 30 days`, icon: 'trending-up'
                     });
                 } else {
                      insights.push({
                         id: 'trend_down', type: 'warning', title: 'Balance Down', description: `${diff.toFixed(0)} in 30 days`, icon: 'trending-down'
                     });
                 }
             }

             setBalanceData({
                 dailyBalances,
                 monthlyBalances: [], // Placeholder
                 projection: {
                     endOfMonth: projectedEndOfMonth,
                     daysRemaining,
                     dailySpendingRate,
                     isPositive: projectedEndOfMonth >= 0
                 },
                 insights
             });

        } catch (error) {
            console.error('[useBalanceHistory] Error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    return { balanceData, stats, loading, loadBalanceHistory };
};
