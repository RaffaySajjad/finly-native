import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useTheme } from '../../contexts/ThemeContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { typography, spacing, borderRadius } from '../../theme';

const { width } = Dimensions.get('window');

interface CategoryBarChartProps {
  data: Array<{ category: string; amount: number; color: string }>;
}

export const CategoryBarChart: React.FC<CategoryBarChartProps> = ({ data }) => {
  const { theme } = useTheme();
  const { convertFromUSD, getCurrencySymbol, formatCurrency } = useCurrency();

  // Prepare data for BarChart
  // Show all categories, chart will scroll
  const chartData = data.map(item => ({
    value: convertFromUSD(item.amount),
    // Show full label, allow chart execution to handle x axis spacing
    label: item.category,
    frontColor: item.color || theme.primary,
    topLabelComponent: () => (
        <Text style={{color: theme.textSecondary, fontSize: 10, marginBottom: 4, width: 60, textAlign: 'center'}}>
            {formatCurrency(item.amount, { disableAbbreviations: false })}
        </Text>
    )
  })).sort((a, b) => b.value - a.value);

  const symbol = getCurrencySymbol();

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>Top Categories</Text>
      
      <View style={{ marginTop: spacing.md, overflow: 'hidden' }}>
        <BarChart
            data={chartData}
            barWidth={40}
            spacing={40}
            noOfSections={4}
            barBorderRadius={4}
            frontColor={theme.primary}
            yAxisThickness={0}
            xAxisThickness={1}
            xAxisColor={theme.border}
            yAxisTextStyle={{color: theme.textTertiary, fontSize: 10}}
            xAxisLabelTextStyle={{color: theme.textSecondary, fontSize: 10, width: 80, textAlign: 'center'}}
            // hideRules
            height={220}
            width={width - 80} // View width
            // Enable scrolling by not constraining content width to view width if not needed, 
            // but gifted-charts handles horizontal scroll if data * (barWidth+spacing) > width.
            // We set a min width to ensure scrolling for few items? No, scrolling happens auto.
            showYAxisIndices={false}
            yAxisLabelPrefix={symbol}
            yAxisLabelWidth={60}
            // Ensure Y axis scales correctly
            maxValue={Math.max(...chartData.map(d => d.value)) * 1.2} 
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.titleMedium,
    fontWeight: '600',
  },
});
