/**
 * AI Assistant Service
 * Purpose: Handle AI queries for transaction questions, feature explanations, and financial insights
 * Features: Rate limiting, premium gating, context-aware responses
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './api';
import { Expense, CategoryType } from '../types';
import { getCurrentUserId } from './userService';
import { calculateIncomeForPeriod } from './incomeService';

const QUERIES_STORAGE_KEY = '@finly_ai_queries';
const QUERY_HISTORY_KEY = '@finly_ai_query_history';

const FREE_QUERY_LIMIT = 5; // Free tier: 5 queries per day
const PREMIUM_QUERY_LIMIT = Infinity; // Premium: unlimited

export interface AIQuery {
  id: string;
  query: string;
  response: string;
  timestamp: string;
  context?: {
    transactionId?: string;
    categoryId?: CategoryType;
    screen?: string;
  };
}

export interface QueryLimits {
  used: number;
  limit: number;
  resetDate: string;
}

/**
 * Get user's query limits
 */
export const getQueryLimits = async (isPremium: boolean): Promise<QueryLimits> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return {
        used: 0,
        limit: FREE_QUERY_LIMIT,
        resetDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
    }

    const key = `${QUERIES_STORAGE_KEY}_${userId}`;
    const limitsData = await AsyncStorage.getItem(key);
    
    if (limitsData) {
      const limits: QueryLimits = JSON.parse(limitsData);
      const resetDate = new Date(limits.resetDate);
      const now = new Date();

      // Reset if date has passed
      if (resetDate < now) {
        const newLimits: QueryLimits = {
          used: 0,
          limit: isPremium ? PREMIUM_QUERY_LIMIT : FREE_QUERY_LIMIT,
          resetDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };
        await AsyncStorage.setItem(key, JSON.stringify(newLimits));
        return newLimits;
      }

      return {
        ...limits,
        limit: isPremium ? PREMIUM_QUERY_LIMIT : FREE_QUERY_LIMIT,
      };
    }

    // Create new limits
    const newLimits: QueryLimits = {
      used: 0,
      limit: isPremium ? PREMIUM_QUERY_LIMIT : FREE_QUERY_LIMIT,
      resetDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(newLimits));
    return newLimits;
  } catch (error) {
    console.error('Error getting query limits:', error);
    return {
      used: 0,
      limit: isPremium ? PREMIUM_QUERY_LIMIT : FREE_QUERY_LIMIT,
      resetDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }
};

/**
 * Increment query usage
 */
export const incrementQueryUsage = async (isPremium: boolean): Promise<void> => {
  if (isPremium) return; // No limits for premium

  try {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const key = `${QUERIES_STORAGE_KEY}_${userId}`;
    const limits = await getQueryLimits(isPremium);
    
    limits.used += 1;
    await AsyncStorage.setItem(key, JSON.stringify(limits));
  } catch (error) {
    console.error('Error incrementing query usage:', error);
  }
};

/**
 * Get query history
 */
export const getQueryHistory = async (): Promise<AIQuery[]> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const key = `${QUERY_HISTORY_KEY}_${userId}`;
    const historyData = await AsyncStorage.getItem(key);
    
    if (historyData) {
      return JSON.parse(historyData);
    }
    
    return [];
  } catch (error) {
    console.error('Error getting query history:', error);
    return [];
  }
};

/**
 * Save query to history
 */
export const saveQueryToHistory = async (query: AIQuery): Promise<void> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const key = `${QUERY_HISTORY_KEY}_${userId}`;
    const history = await getQueryHistory();
    
    // Add new query at the beginning
    const updatedHistory = [query, ...history].slice(0, 50); // Keep last 50 queries
    
    await AsyncStorage.setItem(key, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Error saving query to history:', error);
  }
};

/**
 * Analyze user's financial data for context
 */
const getFinancialContext = async (formatCurrency: (amount: number) => string): Promise<string> => {
  try {
    const expenses = await apiService.getExpenses();
    const stats = await apiService.getMonthlyStats();
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const monthlyIncome = await calculateIncomeForPeriod(startOfMonth, endOfMonth);
    const monthlyExpenses = expenses.filter(e => {
      const expenseDate = new Date(e.date);
      return expenseDate >= startOfMonth && expenseDate <= endOfMonth;
    }).reduce((sum, e) => sum + e.amount, 0);

    // Category breakdown
    const categoryBreakdown: Record<string, number> = {};
    expenses.forEach(expense => {
      categoryBreakdown[expense.category] = (categoryBreakdown[expense.category] || 0) + expense.amount;
    });

    const topCategory = Object.entries(categoryBreakdown)
      .sort(([, a], [, b]) => b - a)[0];

    return `
User's Financial Summary:
- Current Balance: ${formatCurrency(stats.balance)}
- Monthly Income: ${formatCurrency(monthlyIncome)}
- Monthly Expenses: ${formatCurrency(monthlyExpenses)}
- Total Expenses This Month: ${expenses.filter(e => {
      const expenseDate = new Date(e.date);
      return expenseDate >= startOfMonth && expenseDate <= endOfMonth;
    }).length} transactions
- Top Spending Category: ${topCategory ? `${topCategory[0]}: ${formatCurrency(topCategory[1])}` : 'N/A'}
- Recent Transactions: ${expenses.slice(0, 5).map(e => `${e.description}: ${formatCurrency(e.amount)}`).join(', ')}
    `.trim();
  } catch (error) {
    console.error('Error getting financial context:', error);
    return '';
  }
};

/**
 * Process basic transaction queries (Phase 1)
 */
const processBasicQuery = async (
  query: string,
  formatCurrency: (amount: number) => string,
  context?: AIQuery['context']
): Promise<string> => {
  const lowerQuery = query.toLowerCase();
  
  try {
    const expenses = await apiService.getExpenses();
    const stats = await apiService.getMonthlyStats();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Calculate monthly income
    const monthlyIncome = await calculateIncomeForPeriod(startOfMonth, endOfMonth);

    // "How much did I spend on X?"
    const spendMatch = lowerQuery.match(/how much.*spend.*on (.+?)(\?|$)/i);
    if (spendMatch) {
      const category = spendMatch[1].trim();
      const categoryMap: Record<string, CategoryType> = {
        'food': 'food',
        'restaurant': 'food',
        'groceries': 'food',
        'transport': 'transport',
        'travel': 'transport',
        'car': 'transport',
        'shopping': 'shopping',
        'entertainment': 'entertainment',
        'health': 'health',
        'medical': 'health',
        'utilities': 'utilities',
        'bills': 'utilities',
      };

      const matchedCategory = Object.entries(categoryMap).find(([key]) => 
        category.includes(key)
      )?.[1];

      if (matchedCategory) {
        const categoryExpenses = expenses.filter(e => {
          const expenseDate = new Date(e.date);
          return e.category === matchedCategory && 
                 expenseDate >= startOfMonth && 
                 expenseDate <= endOfMonth;
        });
        const total = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);
        return `You've spent ${formatCurrency(total)} on ${matchedCategory} this month across ${categoryExpenses.length} transactions.`;
      }
    }

    // "What's my total spending?"
    if (lowerQuery.includes('total spending') || lowerQuery.includes('total expenses')) {
      return `Your total spending this month is ${formatCurrency(stats.totalExpenses)} across ${expenses.filter(e => {
        const expenseDate = new Date(e.date);
        return expenseDate >= startOfMonth && expenseDate <= endOfMonth;
      }).length} transactions.`;
    }

    // "What's my balance?"
    if (lowerQuery.includes('balance') || lowerQuery.includes('how much money')) {
      return `Your current balance is ${formatCurrency(stats.balance)}. This month you've earned ${formatCurrency(monthlyIncome)} and spent ${formatCurrency(stats.totalExpenses)}.`;
    }

    // "How much did I spend last week?"
    if (lowerQuery.includes('last week') || lowerQuery.includes('past week')) {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekExpenses = expenses.filter(e => {
        const expenseDate = new Date(e.date);
        return expenseDate >= weekAgo && expenseDate <= now;
      });
      const total = weekExpenses.reduce((sum, e) => sum + e.amount, 0);
      return `You spent ${formatCurrency(total)} in the past week across ${weekExpenses.length} transactions.`;
    }

    // "What's my biggest expense?"
    if (lowerQuery.includes('biggest expense') || lowerQuery.includes('largest expense')) {
      const sortedExpenses = [...expenses].sort((a, b) => b.amount - a.amount);
      const biggest = sortedExpenses[0];
      if (biggest) {
        const date = new Date(biggest.date).toLocaleDateString();
        return `Your biggest expense was ${formatCurrency(biggest.amount)} for "${biggest.description}" on ${date}.`;
      }
      return `You don't have any expenses recorded yet.`;
    }

    // Feature explanations
    if (lowerQuery.includes('how do i') || lowerQuery.includes('how to') || lowerQuery.includes('explain')) {
      if (lowerQuery.includes('import') || lowerQuery.includes('csv')) {
        return `To import transactions:\n1. Export your data from Wallet by BudgetBakers as CSV\n2. Go to Profile → Import Transactions\n3. Select your CSV file\n4. We'll automatically import and skip duplicates`;
      }
      if (lowerQuery.includes('receipt') || lowerQuery.includes('scan')) {
        return `To scan a receipt:\n1. Tap the + button on the Dashboard\n2. Select "Scan Receipt"\n3. Take a photo of your receipt\n4. AI will extract all details automatically\n5. Review and save`;
      }
      if (lowerQuery.includes('income') || lowerQuery.includes('salary')) {
        return `To set up income:\n1. Go to Profile → Income Management\n2. Tap "Add Income Source"\n3. Enter name, amount, and frequency\n4. Enable auto-add to automatically track income on schedule`;
      }
      if (lowerQuery.includes('category') || lowerQuery.includes('categorize')) {
        return `To manage categories:\n1. Go to Categories tab\n2. Tap a category to see details\n3. Set budget limits for each category\n4. Categories help organize your spending`;
      }
    }

    // Context-aware queries
    if (context?.transactionId) {
      const transaction = expenses.find(e => e.id === context.transactionId);
      if (transaction) {
        if (lowerQuery.includes('tell me about') || lowerQuery.includes('what is this')) {
          const date = new Date(transaction.date).toLocaleDateString();
          return `This transaction is:\n- Amount: ${formatCurrency(transaction.amount)}\n- Category: ${transaction.category}\n- Date: ${date}\n- Description: ${transaction.description}${transaction.paymentMethod ? `\n- Payment Method: ${transaction.paymentMethod}` : ''}`;
        }
      }
    }

    // Default response
    return `I can help you with:\n- Transaction questions ("How much did I spend on food?")\n- Balance inquiries\n- Feature explanations\n- Spending insights\n\nTry asking: "How much did I spend this month?" or "What's my balance?"`;
  } catch (error) {
    console.error('Error processing basic query:', error);
    return 'Sorry, I encountered an error processing your question. Please try again.';
  }
};

/**
 * Process advanced insights (Phase 2 - Premium only)
 */
const processAdvancedQuery = async (
  query: string,
  formatCurrency: (amount: number) => string,
  context?: AIQuery['context']
): Promise<string> => {
  const lowerQuery = query.toLowerCase();
  
  try {
    const expenses = await apiService.getExpenses();
    const stats = await apiService.getMonthlyStats();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const monthlyIncome = await calculateIncomeForPeriod(startOfMonth, new Date(now.getFullYear(), now.getMonth() + 1, 0));
    const lastMonthIncome = await calculateIncomeForPeriod(lastMonth, lastMonthEnd);
    
    const thisMonthExpenses = expenses.filter(e => {
      const expenseDate = new Date(e.date);
      return expenseDate >= startOfMonth && expenseDate <= now;
    }).reduce((sum, e) => sum + e.amount, 0);

    const lastMonthExpenses = expenses.filter(e => {
      const expenseDate = new Date(e.date);
      return expenseDate >= lastMonth && expenseDate <= lastMonthEnd;
    }).reduce((sum, e) => sum + e.amount, 0);

    // Spending trends
    if (lowerQuery.includes('trend') || lowerQuery.includes('compare') || lowerQuery.includes('change')) {
      const change = thisMonthExpenses - lastMonthExpenses;
      const percentChange = lastMonthExpenses > 0 ? (change / lastMonthExpenses) * 100 : 0;
      
      if (Math.abs(percentChange) < 5) {
        return `Your spending is relatively stable. This month you've spent ${formatCurrency(thisMonthExpenses)}, which is very similar to last month's ${formatCurrency(lastMonthExpenses)}.`;
      } else if (change > 0) {
        return `⚠️ Your spending increased by ${percentChange.toFixed(1)}% this month. You spent ${formatCurrency(thisMonthExpenses)} compared to ${formatCurrency(lastMonthExpenses)} last month. Consider reviewing your recent expenses to identify areas where you can cut back.`;
      } else {
        return `✅ Great job! Your spending decreased by ${Math.abs(percentChange).toFixed(1)}% this month. You spent ${formatCurrency(thisMonthExpenses)} compared to ${formatCurrency(lastMonthExpenses)} last month.`;
      }
    }

    // Budget recommendations
    if (lowerQuery.includes('budget') || lowerQuery.includes('recommend') || lowerQuery.includes('save')) {
      const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - thisMonthExpenses) / monthlyIncome) * 100 : 0;
      
      if (savingsRate < 10) {
        return `💡 Recommendation: Your savings rate is ${savingsRate.toFixed(1)}%. Financial experts recommend saving at least 20% of your income. Consider:\n- Reducing discretionary spending\n- Setting up automatic savings\n- Reviewing recurring subscriptions\n\nYour current monthly income: ${formatCurrency(monthlyIncome)}\nSuggested monthly savings: ${formatCurrency(monthlyIncome * 0.2)}`;
      } else if (savingsRate < 20) {
        return `👍 Good progress! Your savings rate is ${savingsRate.toFixed(1)}%. To reach the recommended 20%:\n- You're saving ${formatCurrency(monthlyIncome - thisMonthExpenses)} per month\n- Target: ${formatCurrency(monthlyIncome * 0.2)} per month\n- Need to save an additional ${formatCurrency(monthlyIncome * 0.2 - (monthlyIncome - thisMonthExpenses))}`;
      } else {
        return `🎉 Excellent! Your savings rate is ${savingsRate.toFixed(1)}%, which exceeds the recommended 20%. You're saving ${formatCurrency(monthlyIncome - thisMonthExpenses)} per month. Keep up the great work!`;
      }
    }

    // Spending patterns
    if (lowerQuery.includes('pattern') || lowerQuery.includes('usually') || lowerQuery.includes('typical')) {
      const categoryBreakdown: Record<string, number> = {};
      expenses.forEach(expense => {
        categoryBreakdown[expense.category] = (categoryBreakdown[expense.category] || 0) + expense.amount;
      });

      const sortedCategories = Object.entries(categoryBreakdown)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);

      if (sortedCategories.length > 0) {
        const pattern = sortedCategories.map(([cat, amount], idx) => 
          `${idx + 1}. ${cat}: ${formatCurrency(amount)}`
        ).join('\n');

        return `Your spending patterns:\n${pattern}\n\nThese are your top ${sortedCategories.length} spending categories. Consider setting budget limits for categories where you want to reduce spending.`;
      }
    }

    // Weekend vs weekday spending
    if (lowerQuery.includes('weekend') || lowerQuery.includes('weekday')) {
      let weekendSpending = 0;
      let weekdaySpending = 0;
      
      expenses.forEach(expense => {
        const day = new Date(expense.date).getDay();
        if (day === 0 || day === 6) {
          weekendSpending += expense.amount;
        } else {
          weekdaySpending += expense.amount;
        }
      });

      const avgWeekend = weekendSpending / (expenses.filter(e => {
        const day = new Date(e.date).getDay();
        return day === 0 || day === 6;
      }).length || 1);

      const avgWeekday = weekdaySpending / (expenses.filter(e => {
        const day = new Date(e.date).getDay();
        return day !== 0 && day !== 6;
      }).length || 1);

      if (avgWeekend > avgWeekday * 1.5) {
        return `📊 You spend significantly more on weekends (${formatCurrency(avgWeekend)} per transaction) compared to weekdays (${formatCurrency(avgWeekday)}). This suggests you might be overspending on leisure activities. Consider planning weekend activities with a budget in mind.`;
      } else {
        return `📊 Your spending is relatively balanced: ${formatCurrency(avgWeekend)} per weekend transaction vs ${formatCurrency(avgWeekday)} per weekday transaction.`;
      }
    }

    // Fallback to basic query
    return await processBasicQuery(query, formatCurrency, context);
  } catch (error) {
    console.error('Error processing advanced query:', error);
    return await processBasicQuery(query, formatCurrency, context);
  }
};

/**
 * Process AI query
 */
export const processAIQuery = async (
  query: string,
  isPremium: boolean,
  formatCurrency: (amount: number) => string,
  context?: AIQuery['context']
): Promise<{ response: string; query: AIQuery }> => {
  // Check rate limits
  const limits = await getQueryLimits(isPremium);
  
  if (!isPremium && limits.used >= limits.limit) {
    throw new Error(`You've reached your daily limit of ${limits.limit} queries. Upgrade to Premium for unlimited queries.`);
  }

  // Process query
  let response: string;
  if (isPremium) {
    // Premium: Advanced insights
    response = await processAdvancedQuery(query, formatCurrency, context);
  } else {
    // Free: Basic queries only
    response = await processBasicQuery(query, formatCurrency, context);
  }

  // Increment usage
  await incrementQueryUsage(isPremium);

  // Create query object
  const aiQuery: AIQuery = {
    id: `query_${Date.now()}_${Math.random()}`,
    query,
    response,
    timestamp: new Date().toISOString(),
    context,
  };

  // Save to history
  await saveQueryToHistory(aiQuery);

  return { response, query: aiQuery };
};

