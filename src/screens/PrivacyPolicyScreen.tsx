/**
 * PrivacyPolicyScreen Component
 * Purpose: Display the privacy policy in a structured, readable format
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { typography, spacing, borderRadius, elevation } from '../theme';

const PrivacyPolicyScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();

  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  const Paragraph: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
      {children}
    </Text>
  );

  const BulletPoint: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <View style={styles.bulletPoint}>
      <View style={[styles.bullet, { backgroundColor: theme.primary }]} />
      <Text style={[styles.bulletText, { color: theme.textSecondary }]}>
        {children}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar barStyle={theme.text === '#1A1A1A' ? 'dark-content' : 'light-content'} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.content}
      >
        <View style={[styles.lastUpdated, { backgroundColor: theme.surface }]}>
          <Icon name="clock-outline" size={16} color={theme.textSecondary} />
          <Text style={[styles.lastUpdatedText, { color: theme.textSecondary }]}>
            Last Updated: November 2025
          </Text>
        </View>

        <Section title="1. Introduction">
          <Paragraph>
            Welcome to Finly ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal financial information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our mobile application.
          </Paragraph>
        </Section>

        <Section title="2. Data Collection & Storage">
          <Paragraph>
            Finly is designed with a "privacy-first" approach. We believe your financial data belongs to you.
          </Paragraph>
          <BulletPoint>
            <Text style={{ fontWeight: '600' }}>Secure Storage:</Text> Your financial transactions, budgets, and categories are securely stored and encrypted.
          </BulletPoint>
          <BulletPoint>
            <Text style={{ fontWeight: '600' }}>Privacy First:</Text> We never share or sell your financial data to third parties.
          </BulletPoint>
          <BulletPoint>
            <Text style={{ fontWeight: '600' }}>Account Info:</Text> We only collect basic account information (name, email) for authentication and subscription management purposes.
          </BulletPoint>
        </Section>

        <Section title="3. How We Use Your Data">
          <Paragraph>
            The app uses your data solely to:
          </Paragraph>
          <BulletPoint>Provide expense tracking and budgeting features</BulletPoint>
          <BulletPoint>Generate local insights and charts</BulletPoint>
          <BulletPoint>Process voice commands and AI queries (processed ephemerally)</BulletPoint>
        </Section>

        <Section title="4. AI Features">
          <Paragraph>
            When you use our AI features (Voice Entry, AI Assistant):
          </Paragraph>
          <BulletPoint>
            The text or audio you provide is sent to our secure processing servers solely for the purpose of interpreting your request.
          </BulletPoint>
          <BulletPoint>
            We do not store your financial data on our AI servers. The data is processed and immediately returned to your device.
          </BulletPoint>
        </Section>

        <Section title="5. Data Security">
          <Paragraph>
            We implement industry-standard security measures to protect your information:
          </Paragraph>
          <BulletPoint>Secure authentication for app access</BulletPoint>
          <BulletPoint>Biometric lock support (FaceID/TouchID)</BulletPoint>
          <BulletPoint>Encrypted local storage</BulletPoint>
        </Section>

        <Section title="6. Your Rights">
          <Paragraph>
            You have full control over your data:
          </Paragraph>
          <BulletPoint>
            <Text style={{ fontWeight: '600' }}>Access:</Text> You can view all your data within the app.
          </BulletPoint>
          <BulletPoint>
            <Text style={{ fontWeight: '600' }}>Export:</Text> You can export your data to CSV or JSON formats at any time.
          </BulletPoint>
          <BulletPoint>
            <Text style={{ fontWeight: '600' }}>Delete:</Text> You can delete your account and all local data through the Settings menu.
          </BulletPoint>
        </Section>

        <Section title="7. Contact Us">
          <Paragraph>
            If you have any questions about this Privacy Policy, please contact us at:
          </Paragraph>
          <TouchableOpacity 
            onPress={() => Linking.openURL('mailto:privacy@finly.app')}
            style={[styles.contactButton, { backgroundColor: theme.primary + '10' }]}
          >
            <Icon name="email-outline" size={20} color={theme.primary} />
            <Text style={[styles.contactButtonText, { color: theme.primary }]}>
              privacy@finly.app
            </Text>
          </TouchableOpacity>
        </Section>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
  },
  headerTitle: {
    ...typography.titleLarge,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: spacing.lg,
  },
  lastUpdated: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
    marginBottom: spacing.xl,
    gap: spacing.xs,
  },
  lastUpdatedText: {
    ...typography.bodySmall,
    fontWeight: '500',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.titleMedium,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  sectionContent: {
    gap: spacing.sm,
  },
  paragraph: {
    ...typography.bodyMedium,
    lineHeight: 24,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.xs,
    paddingRight: spacing.md,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 9,
    marginRight: spacing.sm,
  },
  bulletText: {
    ...typography.bodyMedium,
    lineHeight: 24,
    flex: 1,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  contactButtonText: {
    ...typography.labelLarge,
    fontWeight: '600',
  },
});

export default PrivacyPolicyScreen;
