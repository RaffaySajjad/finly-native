
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { typography, spacing, borderRadius } from '../../theme';

/**
 * Convert USD amounts in text to user's active currency
 * @param text - Text containing USD amounts (e.g., "$150", "$1,234.56")
 * @param formatCurrency - Function to format currency amounts (already converts from USD internally)
 * @returns Text with converted amounts
 */
const convertCurrencyAmountsInText = (
    text: string,
    formatCurrency: (amount: number) => string
): string => {
    // Regex to match USD amounts: $123, $1,234.56, $123.45, etc.
    const usdAmountRegex = /\$([\d,]+(?:\.\d{1,2})?)/g;

    return text.replace(usdAmountRegex, (match, amountStr) => {
        try {
            const usdAmount = parseFloat(amountStr.replace(/,/g, ''));
            if (isNaN(usdAmount)) {
                return match;
            }
            // formatCurrency already converts from USD to user's currency internally
            // So we just pass the USD amount directly
            return formatCurrency(usdAmount);
        } catch (error) {
            console.warn('[BalanceInsightCard] Error converting currency amount:', error);
            return match;
        }
    });
};

interface Insight {
    id: string;
    type: 'info' | 'warning' | 'success';
    title: string;
    description: string;
    icon: string;
}

interface BalanceInsightCardProps {
    insights: Insight[];
}

export const BalanceInsightCard: React.FC<BalanceInsightCardProps> = ({ insights }) => {
    const { theme } = useTheme();
    const { formatCurrency } = useCurrency();

    if (!insights || insights.length === 0) return null;

    return (
        <View style={styles.container}>
            {insights.map((insight) => {
                let iconColor = theme.primary;
                let bgColor = theme.primary + '15'; // 15% opacity
                
                if (insight.type === 'warning') {
                    iconColor = theme.expense;
                    bgColor = theme.expense + '15';
                } else if (insight.type === 'success') {
                    iconColor = theme.success;
                    bgColor = theme.success + '15';
                }

                return (
                    <View 
                        key={insight.id} 
                        style={[
                            styles.card, 
                            { 
                                backgroundColor: theme.card, 
                                borderColor: theme.border,
                            }
                        ]}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
                            <Icon name={insight.icon as any} size={24} color={iconColor} />
                        </View>
                        <View style={styles.content}>
                            <Text style={[styles.title, { color: theme.text }]}>
                                {convertCurrencyAmountsInText(insight.title, formatCurrency)}
                            </Text>
                            <Text style={[styles.description, { color: theme.textSecondary }]}>
                                {convertCurrencyAmountsInText(insight.description, formatCurrency)}
                            </Text>
                        </View>
                    </View>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.md,
    },
    card: {
        flexDirection: 'row',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        marginHorizontal: spacing.md,
        marginBottom: spacing.sm,
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    content: {
        flex: 1,
    },
    title: {
        ...typography.body1,
        fontWeight: '600',
        marginBottom: 2,
    },
    description: {
        ...typography.caption,
        lineHeight: 18,
    },
});
