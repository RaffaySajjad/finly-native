import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useTheme } from '../../contexts/ThemeContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { typography, spacing, borderRadius } from '../../theme';

const { width } = Dimensions.get('window');

interface SpendingChartProps {
  data: Array<{ date: string; amount: number }>;
  timeRange: 'week' | 'month';
  onTimeRangeChange: (range: 'week' | 'month') => void;
}

export const SpendingChart: React.FC<SpendingChartProps> = ({ 
  data, 
  timeRange,
  onTimeRangeChange 
}) => {
  const { theme } = useTheme();
  const { formatCurrency, convertFromUSD } = useCurrency();

  const chartData = data.map((item, index) => ({
    value: convertFromUSD(item.amount),
    originalValue: item.amount,
    // Show label only for every 2nd item if in month view to reduce clutter
    label: timeRange === 'month' && index % 2 !== 0 ? '' : new Date(item.date).getDate().toString(),
    dataPointText: '',
    date: item.date,
  }));

  const formatYLabel = (val: string) => {
      const num = parseFloat(val);
      if (isNaN(num)) return val;
      const absNum = Math.abs(num);
      
      if (absNum >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
      if (absNum >= 1000000) return (num / 1000000).toFixed(1) + 'M';
      if (absNum >= 1000) return (num / 1000).toFixed(0) + 'k';
      
      return Math.round(num).toString();
  };

  // Dynamic spacing: 'week' fits to screen, 'month' scrolls
  // Week has ~7 items. (Width - padding) / 6 spaces
  const screenWidth = width - 48; // Container width roughly
  const weekSpacing = (screenWidth - 40) / 6; 
  const monthSpacing = 45; // Fixed scrollable spacing

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Spending History</Text>
        <View style={styles.tabContainer}>
           {/* Simple custom tabs */}
           {['week', 'month'].map((range) => (
             <Text 
                key={range}
                onPress={() => onTimeRangeChange(range as 'week' | 'month')}
                style={[
                    styles.tabText, 
                    { 
                        color: timeRange === range ? theme.primary : theme.textSecondary,
                        fontWeight: timeRange === range ? '700' : '400'
                    }
                ]}
             >
                 {range.charAt(0).toUpperCase() + range.slice(1)}
             </Text>
           ))}
        </View>
      </View>

      <View style={{ marginLeft: -10 }}> 
        <LineChart
          key={timeRange} // Force re-render on range change
          data={chartData}
          areaChart
          curved
          height={180} // Reduced height like BalanceChart
          width={width - 50}
          
          // Spacing logic
          spacing={timeRange === 'week' ? weekSpacing : monthSpacing}
          initialSpacing={20}

          startFillColor={theme.primary}
          startOpacity={0.2}
          endFillColor={theme.primary}
          endOpacity={0.05}
          color={theme.primary}
          thickness={3}
          hideDataPoints={false}
          dataPointsColor={theme.primary}
          dataPointsRadius={4}
          yAxisColor="transparent"
          xAxisColor="transparent"
          xAxisLabelTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
          yAxisTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
          yAxisLabelWidth={45}
          
          formatYLabel={formatYLabel}
          scrollToEnd={timeRange === 'month'} // Only scroll to end for month view
          
          pointerConfig={{
            pointerStripUptoDataPoint: true,
            pointerStripColor: theme.border,
            pointerStripWidth: 2,
            strokeDashArray: [2, 5],
            pointerColor: theme.primary,
            radius: 4,
            pointerLabelWidth: 100,
            pointerLabelHeight: 120,
            activatePointersOnLongPress: true, // Allow scrolling
            autoAdjustPointerLabelPosition: true,
            pointerLabelComponent: (items: any) => {
              const item = items[0];
              return (
                <View style={{
                    height: 90, 
                    width: 100, 
                    backgroundColor: theme.card, 
                    borderRadius: 8, 
                    justifyContent:'center', 
                    alignItems:'center',
                    padding: 4,
                    borderWidth: 1,
                    borderColor: theme.border,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3
                }}>
                  <Text style={{color: theme.textSecondary, fontSize: 10, marginBottom: 4}}>
                      {new Date(item.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                  </Text>
                  <Text style={{color: theme.text, fontWeight: 'bold', fontSize: 14}}>
                    {formatCurrency(item.originalValue)} 
                  </Text>
                </View>
              );
            },
          }}
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
    overflow: 'hidden' // ensure tooltips don't clip weirdly if possible, though they might need Z-index
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.titleMedium,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  tabText: {
    ...typography.bodySmall,
  }
});
