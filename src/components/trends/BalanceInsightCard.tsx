import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { typography, spacing, borderRadius } from '../../theme';
import { convertCurrencyAmountsInText } from '../../utils/currencyFormatter';
import { getValidIcon } from '../../utils/iconUtils';

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
                            <Icon name={getValidIcon(insight.icon) as any} size={24} color={iconColor} />
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
