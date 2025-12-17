/**
 * TermsOfServiceScreen Component
 * Purpose: Display Terms of Service in a structured, enterprise-grade format
 * Compliant with finance app standards including regulatory disclaimers
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

const TermsOfServiceScreen: React.FC = () => {
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

  const WarningBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <View style={[styles.warningBox, { backgroundColor: theme.warning + '15', borderColor: theme.warning + '40' }]}>
      <Icon name="alert-circle-outline" size={20} color={theme.warning} style={styles.warningIcon} />
      <Text style={[styles.warningText, { color: theme.textSecondary }]}>
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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Terms of Service</Text>
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

        <Section title="1. Acceptance of Terms">
          <Paragraph>
            By downloading, installing, or using Finly ("the App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the App.
          </Paragraph>
          <Paragraph>
            These Terms constitute a legally binding agreement between you and Finly ("we," "our," or "us"). We reserve the right to modify these Terms at any time. Continued use of the App after any modifications constitutes acceptance of the updated Terms.
          </Paragraph>
        </Section>

        <Section title="2. Important Financial Disclaimer">
          <WarningBox>
            FINLY IS NOT A BANK, CREDIT UNION, FINANCIAL INSTITUTION, BROKER-DEALER, INVESTMENT ADVISOR, OR FIDUCIARY. The App does not provide financial, investment, tax, legal, or accounting advice.
          </WarningBox>
          <Paragraph>
            The App is a personal expense tracking and budgeting tool designed to help you organize and visualize your financial information. You should:
          </Paragraph>
          <BulletPoint>Consult qualified financial professionals before making financial decisions</BulletPoint>
          <BulletPoint>Not rely solely on App data for tax filing, loan applications, or legal matters</BulletPoint>
          <BulletPoint>Independently verify all financial calculations and information</BulletPoint>
          <BulletPoint>Understand that past spending patterns do not predict future financial outcomes</BulletPoint>
        </Section>

        <Section title="3. Service Description">
          <Paragraph>
            Finly provides personal finance management features including:
          </Paragraph>
          <BulletPoint>Manual expense and income tracking</BulletPoint>
          <BulletPoint>Budget creation and monitoring</BulletPoint>
          <BulletPoint>Spending analytics and visualizations</BulletPoint>
          <BulletPoint>AI-powered transaction categorization assistance</BulletPoint>
          <BulletPoint>Receipt scanning and storage</BulletPoint>
          <BulletPoint>Data export capabilities</BulletPoint>
          <Paragraph>
            The App does not access your bank accounts, execute financial transactions, or manage any funds on your behalf. All data you enter is provided voluntarily by you.
          </Paragraph>
        </Section>

        <Section title="4. User Accounts">
          <Paragraph>
            To use certain features, you must create an account. You agree to:
          </Paragraph>
          <BulletPoint>Provide accurate and complete registration information</BulletPoint>
          <BulletPoint>Maintain the security of your account credentials</BulletPoint>
          <BulletPoint>Immediately notify us of any unauthorized account access</BulletPoint>
          <BulletPoint>Accept responsibility for all activities under your account</BulletPoint>
          <Paragraph>
            We reserve the right to suspend or terminate accounts that violate these Terms or engage in fraudulent, abusive, or illegal activities.
          </Paragraph>
        </Section>

        <Section title="5. Subscription & Payments">
          <Paragraph>
            Finly offers both free and premium subscription tiers. For premium subscriptions:
          </Paragraph>
          <BulletPoint>Subscriptions are billed through Apple App Store or Google Play Store</BulletPoint>
          <BulletPoint>Subscriptions automatically renew unless canceled 24 hours before the renewal date</BulletPoint>
          <BulletPoint>Refunds are handled according to the respective app store's policies</BulletPoint>
          <BulletPoint>Prices may change with reasonable notice; existing subscriptions honor their original pricing until renewal</BulletPoint>
          <BulletPoint>Free trials, if offered, convert to paid subscriptions unless canceled before trial end</BulletPoint>
          <Paragraph>
            You can manage or cancel your subscription through your device's app store settings.
          </Paragraph>
        </Section>

        <Section title="6. User Responsibilities">
          <Paragraph>
            When using the App, you agree NOT to:
          </Paragraph>
          <BulletPoint>Use the App for any illegal or unauthorized purpose</BulletPoint>
          <BulletPoint>Attempt to gain unauthorized access to our systems or other users' accounts</BulletPoint>
          <BulletPoint>Transmit viruses, malware, or harmful code</BulletPoint>
          <BulletPoint>Reverse engineer, decompile, or disassemble the App</BulletPoint>
          <BulletPoint>Use automated systems to access the App without permission</BulletPoint>
          <BulletPoint>Impersonate any person or entity</BulletPoint>
          <BulletPoint>Interfere with or disrupt the App's functionality</BulletPoint>
        </Section>

        <Section title="7. Data Accuracy">
          <Paragraph>
            You are solely responsible for the accuracy of data you enter into the App. Finly:
          </Paragraph>
          <BulletPoint>Does not verify the accuracy of user-entered financial data</BulletPoint>
          <BulletPoint>Is not liable for decisions made based on inaccurate data</BulletPoint>
          <BulletPoint>Recommends regular review and reconciliation of your entered data</BulletPoint>
          <BulletPoint>May provide estimates, projections, or suggestions that should not be treated as financial advice</BulletPoint>
        </Section>

        <Section title="8. AI Features">
          <Paragraph>
            The App may use artificial intelligence for features like voice entry and transaction categorization. You acknowledge that:
          </Paragraph>
          <BulletPoint>AI suggestions may not always be accurate and require your review</BulletPoint>
          <BulletPoint>AI features are for convenience only and do not constitute professional advice</BulletPoint>
          <BulletPoint>You are responsible for verifying and correcting AI-generated categorizations</BulletPoint>
          <BulletPoint>AI processing is performed in accordance with our Privacy Policy</BulletPoint>
        </Section>

        <Section title="9. Intellectual Property">
          <Paragraph>
            All content, features, and functionality of the App—including but not limited to text, graphics, logos, icons, images, audio clips, software, and the compilation thereof—are owned by Finly or its licensors and protected by copyright, trademark, and other intellectual property laws.
          </Paragraph>
          <Paragraph>
            You are granted a limited, non-exclusive, non-transferable license to use the App for personal, non-commercial purposes in accordance with these Terms.
          </Paragraph>
        </Section>

        <Section title="10. Limitation of Liability">
          <WarningBox>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, FINLY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE APP.
          </WarningBox>
          <Paragraph>
            We are not responsible for:
          </Paragraph>
          <BulletPoint>Financial losses resulting from decisions made using App data</BulletPoint>
          <BulletPoint>Data loss due to device failure, user error, or other circumstances</BulletPoint>
          <BulletPoint>Service interruptions or technical issues</BulletPoint>
          <BulletPoint>Third-party actions or services</BulletPoint>
          <Paragraph>
            Our total liability for any claims arising from these Terms shall not exceed the amount you paid for the App in the twelve (12) months preceding the claim.
          </Paragraph>
        </Section>

        <Section title="11. Disclaimer of Warranties">
          <Paragraph>
            THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </Paragraph>
          <Paragraph>
            We do not warrant that the App will be uninterrupted, error-free, secure, or free of viruses or other harmful components.
          </Paragraph>
        </Section>

        <Section title="12. Indemnification">
          <Paragraph>
            You agree to indemnify, defend, and hold harmless Finly and its officers, directors, employees, and agents from any claims, damages, losses, liabilities, costs, or expenses (including reasonable attorneys' fees) arising from:
          </Paragraph>
          <BulletPoint>Your use of the App</BulletPoint>
          <BulletPoint>Your violation of these Terms</BulletPoint>
          <BulletPoint>Your violation of any third-party rights</BulletPoint>
          <BulletPoint>Any content you provide through the App</BulletPoint>
        </Section>

        <Section title="13. Termination">
          <Paragraph>
            You may terminate your account at any time by deleting your account through the App settings. Upon termination:
          </Paragraph>
          <BulletPoint>Your right to use the App ceases immediately</BulletPoint>
          <BulletPoint>We will delete your personal data in accordance with our Privacy Policy</BulletPoint>
          <BulletPoint>Certain provisions of these Terms survive termination (including Limitation of Liability, Disclaimer of Warranties, and Indemnification)</BulletPoint>
          <Paragraph>
            We may suspend or terminate your access at any time for violations of these Terms, with or without notice.
          </Paragraph>
        </Section>

        <Section title="14. Governing Law & Disputes">
          <Paragraph>
            These Terms shall be governed by and construed in accordance with the laws of the United States and the State of Delaware, without regard to conflict of law principles.
          </Paragraph>
          <Paragraph>
            Any disputes arising from these Terms or your use of the App shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. You waive any right to participate in class action lawsuits against Finly.
          </Paragraph>
        </Section>

        <Section title="15. Privacy">
          <Paragraph>
            Your use of the App is also governed by our Privacy Policy, which is incorporated into these Terms by reference. Please review our Privacy Policy to understand how we collect, use, and protect your information.
          </Paragraph>
          <TouchableOpacity 
            onPress={() => navigation.navigate('PrivacyPolicy' as never)}
            style={[styles.linkButton, { backgroundColor: theme.primary + '10' }]}
          >
            <Icon name="shield-check-outline" size={20} color={theme.primary} />
            <Text style={[styles.linkButtonText, { color: theme.primary }]}>
              View Privacy Policy
            </Text>
          </TouchableOpacity>
        </Section>

        <Section title="16. Modifications to Service">
          <Paragraph>
            We reserve the right to modify, suspend, or discontinue any part of the App at any time, with or without notice. We are not liable for any modification, suspension, or discontinuation of the App or any part thereof.
          </Paragraph>
        </Section>

        <Section title="17. Severability">
          <Paragraph>
            If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
          </Paragraph>
        </Section>

        <Section title="18. Entire Agreement">
          <Paragraph>
            These Terms, together with our Privacy Policy, constitute the entire agreement between you and Finly regarding your use of the App and supersede all prior agreements and understandings.
          </Paragraph>
        </Section>

        <Section title="19. Contact Us">
          <Paragraph>
            If you have questions about these Terms of Service, please contact us:
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
  warningBox: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  warningIcon: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  warningText: {
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

export default TermsOfServiceScreen;

