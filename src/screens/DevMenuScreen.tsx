/**
 * Developer Testing Menu
 * Purpose: Test all IAP scenarios without real purchases
 * Only visible in development mode
 * 
 * Features:
 * - Test all mock IAP scenarios
 * - View current subscription status
 * - View usage limits
 * - Quick access to all test cases
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Switch, Platform } from 'react-native';
import { iapService } from '../services/iap.service';
import { IAP_CONFIG } from '../config/iap.config';
import { useSubscription } from '../hooks/useSubscription';
import { useTheme } from '../contexts/ThemeContext';

const DevMenuScreen = () => {
  const { theme } = useTheme();
  const { subscribe, subscription, usageLimits } = useSubscription();

  const scenarios = [
    {
      title: '✅ Success Scenarios',
      items: [
        { name: 'Successful Purchase', key: 'SUCCESS', color: '#4CAF50' },
        { name: 'With Trial Period', key: 'SUCCESS_WITH_TRIAL', color: '#4CAF50' },
        { name: 'Yearly Subscription', key: 'SUCCESS_YEARLY', color: '#4CAF50' },
      ],
    },
    {
      title: '❌ Error Scenarios',
      items: [
        { name: 'Payment Failed', key: 'PAYMENT_FAILED', color: '#F44336' },
        { name: 'Payment Declined', key: 'PAYMENT_DECLINED', color: '#F44336' },
        { name: 'User Cancelled', key: 'USER_CANCELLED', color: '#FF9800' },
        { name: 'Already Owned', key: 'ALREADY_OWNED', color: '#FF9800' },
        { name: 'Network Error', key: 'NETWORK_ERROR', color: '#F44336' },
        { name: 'Store Unavailable', key: 'STORE_UNAVAILABLE', color: '#F44336' },
      ],
    },
    {
      title: '🔄 Edge Cases',
      items: [
        { name: 'Pending Payment', key: 'PENDING_PAYMENT', color: '#2196F3' },
        { name: 'Invalid Receipt', key: 'INVALID_RECEIPT', color: '#F44336' },
        { name: 'Expired Subscription', key: 'EXPIRED_SUBSCRIPTION', color: '#FF9800' },
        { name: 'About to Expire', key: 'ABOUT_TO_EXPIRE', color: '#FF9800' },
      ],
    },
    {
      title: '🧪 Backend Scenarios',
      items: [
        { name: 'Backend Validation Failed', key: 'BACKEND_VALIDATION_FAILED', color: '#F44336' },
        { name: 'Backend Timeout', key: 'BACKEND_TIMEOUT', color: '#F44336' },
      ],
    },
  ];

  const testScenario = async (scenarioKey: string, scenarioName: string) => {
    try {
      // Set the mock scenario
      iapService.setMockScenario(scenarioKey as any);
      
      // Trigger purchase
      await subscribe();
      
      // Reset to default
      iapService.setMockScenario(null);
      
      Alert.alert(
        '✅ Test Complete',
        `Scenario: ${scenarioName}\n\nCheck the subscription state!`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      // Reset to default
      iapService.setMockScenario(null);
      
      Alert.alert(
        '❌ Error Occurred',
        `Scenario: ${scenarioName}\n\nError: ${error.message}`,
        [{ text: 'OK' }]
      );
    }
  };

  const showTestingTips = () => {
    Alert.alert(
      '💡 IAP Testing Tips',
      '1. Test success flows first\n' +
      '2. Then test error handling\n' +
      '3. Check UI responses\n' +
      '4. Verify state updates\n' +
      '5. Test edge cases last\n' +
      '6. Check console logs\n' +
      '7. Verify backend calls in mock mode',
      [{ text: 'Got it!' }]
    );
  };

  const showSystemInfo = () => {
    Alert.alert(
      '📱 System Info',
      `Platform: ${Platform.OS}\n` +
      `Mock Mode: ${IAP_CONFIG.ENABLE_MOCKS ? 'ON' : 'OFF'}\n` +
      `Dev Mode: ${__DEV__ ? 'ON' : 'OFF'}\n` +
      `Subscription: ${subscription.tier}\n` +
      `Status: ${subscription.isActive ? 'Active' : 'Inactive'}`,
      [{ text: 'OK' }]
    );
  };

  if (!__DEV__) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.text }]}>
          Dev Menu Only Available in Development
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>
        🧪 IAP Testing Lab
      </Text>
      
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Test all in-app purchase scenarios locally
      </Text>
      
      {/* Current State */}
      <View style={[styles.statusCard, { backgroundColor: theme.surface }]}>
        <Text style={[styles.statusTitle, { color: theme.text }]}>
          Current Subscription Status
        </Text>
        <Text style={[styles.statusText, { color: theme.textSecondary }]}>
          Tier: <Text style={{ fontWeight: 'bold', color: subscription.tier === 'PREMIUM' ? '#4CAF50' : theme.text }}>
            {subscription.tier.toUpperCase()}
          </Text>
        </Text>
        <Text style={[styles.statusText, { color: theme.textSecondary }]}>
          Status: <Text style={{ fontWeight: 'bold' }}>
            {subscription.isActive ? '🟢 Active' : '🔴 Inactive'}
          </Text>
        </Text>
        <Text style={[styles.statusText, { color: theme.textSecondary }]}>
          Trial: {subscription.isTrial ? '✅ Yes' : '❌ No'}
        </Text>
        
        {subscription.startDate && (
          <Text style={[styles.statusText, { color: theme.textSecondary }]}>
            Start: {new Date(subscription.startDate).toLocaleDateString()}
          </Text>
        )}
        
        {subscription.endDate && (
          <Text style={[styles.statusText, { color: theme.textSecondary }]}>
            End: {new Date(subscription.endDate).toLocaleDateString()}
          </Text>
        )}
        
        {/* Usage Limits */}
        <Text style={[styles.statusTitle, { color: theme.text, marginTop: 12 }]}>
          Usage Limits
        </Text>
        <Text style={[styles.statusText, { color: theme.textSecondary }]}>
          Receipt Scans: {usageLimits.receiptScans.used}/{usageLimits.receiptScans.limit === Infinity ? '∞' : usageLimits.receiptScans.limit}
        </Text>
        <Text style={[styles.statusText, { color: theme.textSecondary }]}>
          AI Insights: {usageLimits.insights.used}/{usageLimits.insights.limit === Infinity ? '∞' : usageLimits.insights.limit}
        </Text>
        <Text style={[styles.statusText, { color: theme.textSecondary }]}>
          Categories: {usageLimits.categories.used}/{usageLimits.categories.limit === Infinity ? '∞' : usageLimits.categories.limit}
        </Text>
      </View>

      {/* Mock Mode Info */}
      <View style={[styles.toggleCard, { backgroundColor: theme.surface }]}>
        <View>
          <Text style={[styles.toggleText, { color: theme.text }]}>
            Mock Mode
          </Text>
          <Text style={[styles.toggleSubtext, { color: theme.textSecondary }]}>
            {IAP_CONFIG.ENABLE_MOCKS ? 'No real purchases will be made' : 'Using real IAP (Sandbox)'}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: IAP_CONFIG.ENABLE_MOCKS ? '#4CAF50' : '#FF9800' }]}>
          <Text style={styles.badgeText}>
            {IAP_CONFIG.ENABLE_MOCKS ? 'ON' : 'OFF'}
          </Text>
        </View>
      </View>

      {/* Test Scenarios */}
      {scenarios.map((section, idx) => (
        <View key={idx} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {section.title}
          </Text>
          {section.items.map((scenario) => (
            <TouchableOpacity
              key={scenario.key}
              style={[styles.button, { backgroundColor: scenario.color }]}
              onPress={() => testScenario(scenario.key, scenario.name)}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>{scenario.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          ⚡ Quick Actions
        </Text>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#9C27B0' }]}
          onPress={showTestingTips}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>💡 Testing Tips</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#00BCD4' }]}
          onPress={showSystemInfo}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>📱 System Info</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.footer, { color: theme.textSecondary }]}>
        {IAP_CONFIG.ENABLE_MOCKS 
          ? '🔒 Mock mode is enabled - No real purchases will be made' 
          : '⚠️ Mock mode is disabled - Using real IAP (Sandbox)'}
      </Text>
      
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20,
  },
  title: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  statusCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    marginBottom: 4,
  },
  toggleCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
  },
  toggleSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  button: { 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: { 
    color: '#fff', 
    fontSize: 15, 
    textAlign: 'center', 
    fontWeight: '600' 
  },
  footer: {
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
    fontSize: 14,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 40,
  },
});

export default DevMenuScreen;

