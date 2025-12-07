
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useTheme } from '../../contexts/ThemeContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { typography, spacing, borderRadius } from '../../theme';

const { width } = Dimensions.get('window');

interface BalanceDataPoint {
  date: string;
  balance: number;
}

interface BalanceChartProps {
  data: BalanceDataPoint[];
}

export const BalanceChart: React.FC<BalanceChartProps> = ({ data }) => {
  const { theme } = useTheme();
  const { formatCurrency, convertFromUSD } = useCurrency();

  if (!data || data.length === 0) return null;

  const chartData = data.map((d, index) => ({
    value: convertFromUSD(d.balance),
    originalValue: d.balance,
    // Show label only for every 2nd item to reduce clutter
    label: index % 2 === 0 ? new Date(d.date).getDate().toString() : '',
    date: d.date,
    dataPointText: ''
  }));

  // Calculate range for smart scaling
  const values = chartData.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  
  // padding
  const padding = range * 0.1 || (Math.abs(max) * 0.1) || 100;
  const yAxisMin = min - padding; 
  const yAxisMax = max + padding;

  const formatYLabel = (val: string) => {
      const num = parseFloat(val);
      if(isNaN(num)) return val;
      const absNum = Math.abs(num);
      
      if (absNum >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
      if (absNum >= 1000000) return (num / 1000000).toFixed(1) + 'M';
      if (absNum >= 1000) return (num / 1000).toFixed(1) + 'k';
      
      return Math.round(num).toString();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>Balance Trend (30 Days)</Text>
      <View style={{ marginLeft: -10 }}>
        <LineChart
          data={chartData}
          width={width - 50}
          height={180}
          spacing={45}
          initialSpacing={20}
          color={theme.primary}
          thickness={3}
          startFillColor={theme.primary}
          endFillColor={theme.primary}
          startOpacity={0.2}
          endOpacity={0.05}
          areaChart
          curved
          hideRules={false}
          rulesType='solid'
          rulesColor={theme.border}
          yAxisColor="transparent"
          xAxisColor="transparent"
          yAxisTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
          xAxisLabelTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
          yAxisLabelWidth={45}
          maxValue={yAxisMax}
          minValue={yAxisMin}
          noOfSections={4}
          formatYLabel={formatYLabel}
          scrollToEnd
          pointerConfig={{
            pointerStripUptoDataPoint: true,
            pointerStripColor: theme.border,
            pointerStripWidth: 2,
            strokeDashArray: [2, 5],
            pointerColor: theme.primary,
            radius: 4,
            pointerLabelWidth: 100,
            pointerLabelHeight: 120,
            activatePointersOnLongPress: true,
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
                        {new Date(item.date).toLocaleDateString('en-US', {month:'short', day:'numeric'})}
                    </Text>
                    <Text style={{color: theme.text, fontSize: 14, fontWeight:'bold'}}>
                        {formatCurrency(item.originalValue)}
                    </Text>
                 </View>
               );
            }
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden'
  },
  title: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
});
