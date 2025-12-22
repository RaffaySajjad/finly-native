/**
 * PrivacyPolicyScreen Component
 * Purpose: Display the privacy policy in a structured, enterprise-grade format
 * Compliant with GDPR, CCPA, and finance app standards
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { typography, spacing, borderRadius } from '../theme';

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

  const InfoBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <View style={[styles.infoBox, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '30' }]}>
      <Icon name="shield-check-outline" size={20} color={theme.primary} style={styles.infoIcon} />
      <Text style={[styles.infoText, { color: theme.textSecondary }]}>
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
            Last Updated: December 2025
          </Text>
        </View>

        <Section title="1. Introduction">
          <Paragraph>
            Welcome to Finly ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal financial information. This Privacy Policy explains how we collect, use, disclose, and safeguard your data when you use our mobile application ("the App").
          </Paragraph>
          <Paragraph>
            By using Finly, you consent to the practices described in this Privacy Policy. If you do not agree with our policies, please do not use the App.
          </Paragraph>
        </Section>

        <Section title="2. Important Financial Disclaimer">
          <InfoBox>
            Finly is not a bank, broker, credit union, financial institution, or financial advisor. The App does not hold your funds, access your bank accounts, or execute financial transactions on your behalf.
          </InfoBox>
          <Paragraph>
            All financial data within the App is entered voluntarily by you and is used solely for personal budgeting and expense tracking purposes.
          </Paragraph>
        </Section>

        <Section title="3. Information We Collect">
          <Paragraph>
            We collect the following categories of information:
          </Paragraph>
          <BulletPoint>
            <Text style={{ fontWeight: '600' }}>Account Information:</Text> Name, email address, and encrypted password for authentication purposes.
          </BulletPoint>
          <BulletPoint>
            <Text style={{ fontWeight: '600' }}>Financial Data:</Text> Expenses, income, budgets, categories, and tags you voluntarily enter into the App.
          </BulletPoint>
          <BulletPoint>
            <Text style={{ fontWeight: '600' }}>Receipt Images:</Text> Photos of receipts you upload for expense documentation.
          </BulletPoint>
          <BulletPoint>
            <Text style={{ fontWeight: '600' }}>Device Information:</Text> Device type, operating system, and app version for support and optimization.
          </BulletPoint>
          <BulletPoint>
            <Text style={{ fontWeight: '600' }}>Usage Analytics:</Text> Anonymous usage patterns to improve app functionality.
          </BulletPoint>
        </Section>

        <Section title="4. How We Use Your Information">
          <Paragraph>
            We use your information exclusively to:
          </Paragraph>
          <BulletPoint>Provide and maintain the App's core functionality</BulletPoint>
          <BulletPoint>Sync your data across your devices securely</BulletPoint>
          <BulletPoint>Generate personalized insights and spending analytics</BulletPoint>
          <BulletPoint>Process AI-powered features (voice entry, categorization)</BulletPoint>
          <BulletPoint>Send important service notifications (with your consent)</BulletPoint>
          <BulletPoint>Provide customer support when requested</BulletPoint>
          <BulletPoint>Improve our services and develop new features</BulletPoint>
        </Section>

        <Section title="5. Data Storage & Security">
          <Paragraph>
            We implement industry-standard security measures to protect your information:
          </Paragraph>
          <BulletPoint>
            <Text style={{ fontWeight: '600' }}>Encryption:</Text> All data is encrypted in transit (TLS 1.3) and at rest (AES-256).
          </BulletPoint>
          <BulletPoint>
            <Text style={{ fontWeight: '600' }}>Secure Authentication:</Text> Passwords are hashed using bcrypt with unique salts.
          </BulletPoint>
          <BulletPoint>
            <Text style={{ fontWeight: '600' }}>Biometric Security:</Text> Optional Face ID/Touch ID for additional app protection.
          </BulletPoint>
          <BulletPoint>
            <Text style={{ fontWeight: '600' }}>Cloud Infrastructure:</Text> Data is stored on secure, SOC 2 compliant cloud servers.
          </BulletPoint>
          <BulletPoint>
            <Text style={{ fontWeight: '600' }}>Regular Audits:</Text> We conduct regular security assessments and penetration testing.
          </BulletPoint>
        </Section>

        <Section title="6. AI Features & Third-Party Processing">
          <Paragraph>
            Our AI-powered features are provided through third-party services:
          </Paragraph>
          <InfoBox>
            Finly uses OpenAI's services to power AI features including voice transcription (Whisper), receipt scanning (Vision), and the AI chat assistant (GPT). When you use these features, relevant data is processed by OpenAI according to their privacy policy and data usage policies.
          </InfoBox>
          <Paragraph>
            When you use our AI-powered features (Voice Entry, Receipt Scan, Finly AI Assistant):
          </Paragraph>
          <BulletPoint>Voice and text inputs are sent to OpenAI for processing and are handled according to OpenAI's data retention policies.</BulletPoint>
          <BulletPoint>Receipt images are processed by OpenAI Vision to extract transaction details.</BulletPoint>
          <BulletPoint>AI chat conversations are processed by OpenAI to generate responses.</BulletPoint>
          <BulletPoint>Categorization suggestions are based on your personal spending patterns.</BulletPoint>
          <BulletPoint>You maintain full control to accept, modify, or reject AI suggestions.</BulletPoint>
          <BulletPoint>We do not use your data to train AI models.</BulletPoint>
        </Section>

        <Section title="7. Data Sharing & Disclosure">
          <InfoBox>
            We do NOT sell, rent, trade, or share your personal financial data with advertisers, data brokers, or any third parties for marketing purposes.
          </InfoBox>
          <Paragraph>
            We may share limited information only in these circumstances:
          </Paragraph>
          <BulletPoint>
            <Text style={{ fontWeight: '600' }}>Service Providers:</Text> Trusted vendors who assist in operating our service (cloud hosting, analytics) under strict confidentiality agreements.
          </BulletPoint>
          <BulletPoint>
            <Text style={{ fontWeight: '600' }}>Legal Requirements:</Text> When required by law, subpoena, or to protect our rights and safety.
          </BulletPoint>
          <BulletPoint>
            <Text style={{ fontWeight: '600' }}>Business Transfers:</Text> In the event of a merger or acquisition, with notice to users.
          </BulletPoint>
        </Section>

        <Section title="8. Your Privacy Rights">
          <Paragraph>
            You have comprehensive control over your data:
          </Paragraph>
          <BulletPoint>
            <Text style={{ fontWeight: '600' }}>Access:</Text> View all your data within the App at any time.
          </BulletPoint>
          <BulletPoint>
            <Text style={{ fontWeight: '600' }}>Export:</Text> Download your complete data in CSV or JSON formats.
          </BulletPoint>
          <BulletPoint>
            <Text style={{ fontWeight: '600' }}>Rectification:</Text> Edit or correct any information in your account.
          </BulletPoint>
          <BulletPoint>
            <Text style={{ fontWeight: '600' }}>Deletion:</Text> Request complete account deletion through Settings. Your data is permanently removed within 30 days, except where retention is legally required.
          </BulletPoint>
          <BulletPoint>
            <Text style={{ fontWeight: '600' }}>Portability:</Text> Transfer your data to another service using our export feature.
          </BulletPoint>
          <BulletPoint>
            <Text style={{ fontWeight: '600' }}>Opt-Out:</Text> Disable non-essential data collection and notifications in Settings.
          </BulletPoint>
        </Section>

        <Section title="9. California Privacy Rights (CCPA)">
          <Paragraph>
            California residents have additional rights under the California Consumer Privacy Act (CCPA):
          </Paragraph>
          <BulletPoint>Right to know what personal information we collect and how it's used</BulletPoint>
          <BulletPoint>Right to delete personal information we have collected</BulletPoint>
          <BulletPoint>Right to opt-out of the sale of personal information (Note: We do not sell your data)</BulletPoint>
          <BulletPoint>Right to non-discrimination for exercising your privacy rights</BulletPoint>
        </Section>

        <Section title="10. International Data Transfers">
          <Paragraph>
            Your data may be processed in countries outside your country of residence. We ensure appropriate safeguards are in place, including standard contractual clauses approved by relevant authorities, to protect your data during international transfers.
          </Paragraph>
        </Section>

        <Section title="11. Data Retention">
          <Paragraph>
            We retain your personal data only as long as necessary:
          </Paragraph>
          <BulletPoint>Account data is retained while your account is active.</BulletPoint>
          <BulletPoint>Upon account deletion, personal data is purged within 30 days.</BulletPoint>
          <BulletPoint>Anonymous, aggregated analytics may be retained indefinitely for service improvement.</BulletPoint>
          <BulletPoint>Some data may be retained longer if required by law (e.g., tax records, legal disputes).</BulletPoint>
        </Section>

        <Section title="12. Children's Privacy">
          <Paragraph>
            Finly is not intended for users under 13 years of age. We do not knowingly collect personal information from children. If we learn that we have collected data from a child under 13, we will delete it promptly.
          </Paragraph>
        </Section>

        <Section title="13. Changes to This Policy">
          <Paragraph>
            We may update this Privacy Policy from time to time. We will notify you of significant changes via email or in-app notification. Continued use of the App after changes constitutes acceptance of the updated policy.
          </Paragraph>
        </Section>

        <Section title="14. Related Documents">
          <Paragraph>
            Please also review our Terms of Service, which governs your use of the App:
          </Paragraph>
          <TouchableOpacity
            onPress={() => navigation.navigate('TermsOfService' as never)}
            style={[styles.linkButton, { backgroundColor: theme.primary + '10' }]}
          >
            <Icon name="file-document-outline" size={20} color={theme.primary} />
            <Text style={[styles.linkButtonText, { color: theme.primary }]}>
              View Terms of Service
            </Text>
          </TouchableOpacity>
        </Section>

        <Section title="15. Contact Us">
          <Paragraph>
            If you have questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact our Privacy Team:
          </Paragraph>
          <TouchableOpacity 
            onPress={() => Linking.openURL('mailto:support@heyfinly.ai')}
            style={[styles.contactButton, { backgroundColor: theme.primary + '10' }]}
          >
            <Icon name="email-outline" size={20} color={theme.primary} />
            <Text style={[styles.contactButtonText, { color: theme.primary }]}>
              support@heyfinly.ai
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
  infoBox: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  infoIcon: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  infoText: {
    ...typography.bodySmall,
    flex: 1,
    lineHeight: 20,
    fontWeight: '500',
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
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  linkButtonText: {
    ...typography.labelLarge,
    fontWeight: '600',
  },
});

export default PrivacyPolicyScreen;
