/**
 * Review Service
 * Purpose: Smart App Store review prompting system
 * 
 * Strategy (based on Wilmer's approach):
 * - Only prompt after user has experienced value (not on first launch)
 * - Trigger after meaningful actions (5+ transactions, AI insight viewed, voice used)
 * - Use conditional flow: positive → native review, negative → feedback
 * - Respect Apple's 3x/year rate limit by tracking prompts
 * - Never prompt again after a successful review
 */

import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Linking, Alert } from 'react-native';
import { logger } from '../utils/logger';
import { AlertType, AlertButton } from '../components/AlertDialog';

export interface ReviewPromptOptions {
  title: string;
  message: string;
  type?: AlertType;
  buttons?: AlertButton[];
}

type PromptHandler = (options: ReviewPromptOptions) => void;

// Storage keys
const KEYS = {
  REVIEW_COMPLETED: '@finly_review_completed',
  REVIEW_PROMPT_COUNT: '@finly_review_prompt_count',
  LAST_PROMPT_DATE: '@finly_last_prompt_date',
  TRANSACTION_COUNT: '@finly_transaction_count_for_review',
  VALUABLE_ACTIONS: '@finly_valuable_actions',
  DECLINED_COUNT: '@finly_review_declined_count',
} as const;

// Trigger thresholds
const THRESHOLDS = {
  MIN_TRANSACTIONS: 5,           // Minimum transactions before asking
  MIN_VALUABLE_ACTIONS: 2,       // Voice, receipt, or AI insight interactions
  DAYS_BETWEEN_PROMPTS: 30,      // Don't ask more than once per month
  MAX_DECLINES: 3,               // Stop asking after 3 "not now" responses
  MAX_PROMPTS_PER_YEAR: 3,       // Apple's limit
} as const;

// Valuable action types
export type ValuableAction = 
  | 'voice_transaction'
  | 'receipt_scan'
  | 'ai_insight_viewed'
  | 'ai_chat_used'
  | 'first_budget_set'
  | 'positive_balance_streak';

interface ReviewState {
  transactionCount: number;
  valuableActions: ValuableAction[];
  promptCount: number;
  lastPromptDate: string | null;
  declinedCount: number;
  completed: boolean;
}

class ReviewService {
  private state: ReviewState | null = null;
  private promptHandler: PromptHandler | null = null;

  /**
   * Set a handler for showing review-related prompts
   */
  setPromptHandler(handler: PromptHandler | null): void {
    this.promptHandler = handler;
  }

  /**
   * Initialize the review service and load persisted state
   */
  async initialize(): Promise<void> {
    try {
      const [
        completed,
        promptCount,
        lastPromptDate,
        transactionCount,
        valuableActions,
        declinedCount,
      ] = await Promise.all([
        AsyncStorage.getItem(KEYS.REVIEW_COMPLETED),
        AsyncStorage.getItem(KEYS.REVIEW_PROMPT_COUNT),
        AsyncStorage.getItem(KEYS.LAST_PROMPT_DATE),
        AsyncStorage.getItem(KEYS.TRANSACTION_COUNT),
        AsyncStorage.getItem(KEYS.VALUABLE_ACTIONS),
        AsyncStorage.getItem(KEYS.DECLINED_COUNT),
      ]);

      this.state = {
        completed: completed === 'true',
        promptCount: parseInt(promptCount || '0', 10),
        lastPromptDate,
        transactionCount: parseInt(transactionCount || '0', 10),
        valuableActions: valuableActions ? JSON.parse(valuableActions) : [],
        declinedCount: parseInt(declinedCount || '0', 10),
      };

      logger.debug('[ReviewService] Initialized with state:', this.state);
    } catch (error) {
      logger.error('[ReviewService] Failed to initialize:', error);
      this.state = {
        completed: false,
        promptCount: 0,
        lastPromptDate: null,
        transactionCount: 0,
        valuableActions: [],
        declinedCount: 0,
      };
    }
  }

  /**
   * Track when a transaction is added (expense or income)
   */
  async trackTransaction(): Promise<void> {
    if (!this.state) await this.initialize();
    if (!this.state) return;

    this.state.transactionCount++;
    await AsyncStorage.setItem(
      KEYS.TRANSACTION_COUNT,
      this.state.transactionCount.toString()
    );

    logger.debug(`[ReviewService] Transaction count: ${this.state.transactionCount}`);

    // Automatically check if we should prompt
    await this.checkAndPromptIfReady();
  }

  /**
   * Track when user performs a valuable action (voice, receipt, AI, etc.)
   */
  async trackValuableAction(action: ValuableAction): Promise<void> {
    if (!this.state) await this.initialize();
    if (!this.state) return;

    // Don't track duplicates
    if (!this.state.valuableActions.includes(action)) {
      this.state.valuableActions.push(action);
      await AsyncStorage.setItem(
        KEYS.VALUABLE_ACTIONS,
        JSON.stringify(this.state.valuableActions)
      );

      logger.debug(`[ReviewService] Tracked valuable action: ${action}`, 
        this.state.valuableActions);
    }

    // Automatically check if we should prompt
    await this.checkAndPromptIfReady();
  }

  /**
   * Check if conditions are met and prompt if ready
   */
  async checkAndPromptIfReady(): Promise<boolean> {
    if (!this.state) await this.initialize();
    if (!this.state) return false;

    // Already completed a review
    if (this.state.completed) {
      logger.debug('[ReviewService] Already completed review, skipping');
      return false;
    }

    // Declined too many times
    if (this.state.declinedCount >= THRESHOLDS.MAX_DECLINES) {
      logger.debug('[ReviewService] User declined too many times, skipping');
      return false;
    }

    // Already hit yearly limit
    if (this.state.promptCount >= THRESHOLDS.MAX_PROMPTS_PER_YEAR) {
      logger.debug('[ReviewService] Hit yearly prompt limit, skipping');
      return false;
    }

    // Check time since last prompt
    if (this.state.lastPromptDate) {
      const lastPrompt = new Date(this.state.lastPromptDate);
      const daysSinceLastPrompt = Math.floor(
        (Date.now() - lastPrompt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLastPrompt < THRESHOLDS.DAYS_BETWEEN_PROMPTS) {
        logger.debug(`[ReviewService] Only ${daysSinceLastPrompt} days since last prompt, skipping`);
        return false;
      }
    }

    // Check if user has enough transactions
    if (this.state.transactionCount < THRESHOLDS.MIN_TRANSACTIONS) {
      logger.debug(`[ReviewService] Only ${this.state.transactionCount} transactions, need ${THRESHOLDS.MIN_TRANSACTIONS}`);
      return false;
    }

    // Check if user has done valuable actions
    if (this.state.valuableActions.length < THRESHOLDS.MIN_VALUABLE_ACTIONS) {
      logger.debug(`[ReviewService] Only ${this.state.valuableActions.length} valuable actions, need ${THRESHOLDS.MIN_VALUABLE_ACTIONS}`);
      return false;
    }

    // All conditions met! Show the prompt
    logger.info('[ReviewService] Conditions met, showing review prompt');
    await this.showConditionalPrompt();
    return true;
  }

  /**
   * Show conditional prompt: "Enjoying Finly?" → Yes/No
   * This is Wilmer's strategy to filter happy users before native prompt
   */
  private async showConditionalPrompt(): Promise<void> {
    if (!this.state) return;

    // Update prompt tracking
    this.state.promptCount++;
    this.state.lastPromptDate = new Date().toISOString();
    
    await Promise.all([
      AsyncStorage.setItem(KEYS.REVIEW_PROMPT_COUNT, this.state.promptCount.toString()),
      AsyncStorage.setItem(KEYS.LAST_PROMPT_DATE, this.state.lastPromptDate),
    ]);

    if (this.promptHandler) {
      this.promptHandler({
        title: 'Enjoying Finly? 💜',
        message: 'Your feedback helps us improve and reach more people who want to take control of their finances.',
        type: 'info',
        buttons: [
          {
            text: 'Not Really',
            style: 'cancel',
            onPress: () => this.handleNegativeFeedback(),
          },
          {
            text: 'Yes, I Love It!',
            style: 'default',
            onPress: () => this.handlePositiveFeedback(),
          },
        ],
      });
    } else {
      // Fallback to basic Alert
      Alert.alert(
        'Enjoying Finly? 💜',
        'Your feedback helps us improve and reach more people who want to take control of their finances.',
        [
          {
            text: 'Not Really',
            style: 'cancel',
            onPress: () => this.handleNegativeFeedback(),
          },
          {
            text: 'Yes, I Love It!',
            style: 'default',
            onPress: () => this.handlePositiveFeedback(),
          },
        ],
        { cancelable: true, onDismiss: () => this.handleDismiss() }
      );
    }
  }

  /**
   * User said they love it → show native review prompt
   */
  private async handlePositiveFeedback(): Promise<void> {
    logger.info('[ReviewService] User gave positive feedback, showing native prompt');

    try {
      const isAvailable = await StoreReview.isAvailableAsync();
      
      if (isAvailable) {
        // This uses SKStoreReviewController on iOS and In-App Review API on Android
        await StoreReview.requestReview();
        
        // Mark as completed (we can only use native prompt 3x/year, so be conservative)
        this.state!.completed = true;
        await AsyncStorage.setItem(KEYS.REVIEW_COMPLETED, 'true');
        
        logger.info('[ReviewService] Native review prompt shown');
      } else {
        // Fallback: open store page directly
        await this.openStorePage();
      }
    } catch (error) {
      logger.error('[ReviewService] Failed to show native review:', error);
      // Fallback to store page
      await this.openStorePage();
    }
  }

  /**
   * User said they don't like it → offer feedback option
   */
  private async handleNegativeFeedback(): Promise<void> {
    logger.info('[ReviewService] User gave negative feedback');

    // Track decline
    this.state!.declinedCount++;
    await AsyncStorage.setItem(
      KEYS.DECLINED_COUNT,
      this.state!.declinedCount.toString()
    );

    // Offer to hear their feedback
    if (this.promptHandler) {
      this.promptHandler({
        title: 'We Want to Improve 🛠️',
        message: 'Would you like to share what could be better? Your feedback shapes Finly AI\'s future.',
        type: 'warning',
        buttons: [
          {
            text: 'No Thanks',
            style: 'cancel',
          },
          {
            text: 'Send Feedback',
            style: 'default',
            onPress: () => this.openFeedbackEmail(),
          },
        ]
      });
    } else {
      Alert.alert(
        'We Want to Improve 🛠️',
        'Would you like to share what could be better? Your feedback shapes Finly AI\'s future.',
        [
          {
            text: 'No Thanks',
            style: 'cancel',
          },
          {
            text: 'Send Feedback',
            onPress: () => this.openFeedbackEmail(),
          },
        ]
      );
    }
  }

  /**
   * User dismissed without answering
   */
  private async handleDismiss(): Promise<void> {
    logger.debug('[ReviewService] User dismissed prompt');
    // Don't count this as a decline, they might just be busy
  }

  /**
   * Open the app store page for direct review
   * Note: This is only used as fallback when native in-app review isn't available
   * - iOS: Uses SKStoreReviewController natively (via expo-store-review)
   * - Android: Uses Google Play In-App Review API natively (via expo-store-review)
   */
  private async openStorePage(): Promise<void> {
    try {
      // Store URLs for direct store page opening (fallback only)
      // TODO: Replace 'id_YOUR_APP_ID' with actual App Store ID after first submission
      const storeUrl = Platform.select({
        ios: 'itms-apps://apps.apple.com/app/id_YOUR_APP_ID?action=write-review',
        android: 'market://details?id=com.raffay.finly',
        default: '',
      });

      if (storeUrl) {
        const canOpen = await Linking.canOpenURL(storeUrl);
        if (canOpen) {
          await Linking.openURL(storeUrl);
        }
      }
    } catch (error) {
      logger.error('[ReviewService] Failed to open store page:', error);
    }
  }

  /**
   * Open email for feedback
   */
  private async openFeedbackEmail(): Promise<void> {
    try {
      const subject = encodeURIComponent('Finly AI Feedback');
      const body = encodeURIComponent(
        `Hi Finly AI Team,\n\nHere's my feedback:\n\n[Please share what could be better]\n\n---\nDevice: ${Platform.OS}\nTransactions: ${this.state?.transactionCount || 0}`
      );
      const mailUrl = `mailto:hello@finly.ai?subject=${subject}&body=${body}`;
      
      const canOpen = await Linking.canOpenURL(mailUrl);
      if (canOpen) {
        await Linking.openURL(mailUrl);
      }
    } catch (error) {
      logger.error('[ReviewService] Failed to open email:', error);
    }
  }

  /**
   * Force show the conditional prompt (for testing or settings)
   */
  async forcePrompt(): Promise<void> {
    await this.showConditionalPrompt();
  }

  /**
   * Check if native store review is available
   */
  async isReviewAvailable(): Promise<boolean> {
    try {
      return await StoreReview.isAvailableAsync();
    } catch {
      return false;
    }
  }

  /**
   * Reset review state (for testing)
   */
  async reset(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(KEYS.REVIEW_COMPLETED),
      AsyncStorage.removeItem(KEYS.REVIEW_PROMPT_COUNT),
      AsyncStorage.removeItem(KEYS.LAST_PROMPT_DATE),
      AsyncStorage.removeItem(KEYS.TRANSACTION_COUNT),
      AsyncStorage.removeItem(KEYS.VALUABLE_ACTIONS),
      AsyncStorage.removeItem(KEYS.DECLINED_COUNT),
    ]);
    
    this.state = {
      completed: false,
      promptCount: 0,
      lastPromptDate: null,
      transactionCount: 0,
      valuableActions: [],
      declinedCount: 0,
    };

    logger.info('[ReviewService] State reset');
  }

  /**
   * Get current state for debugging
   */
  getState(): ReviewState | null {
    return this.state;
  }
}

// Export singleton instance
export const reviewService = new ReviewService();
export default reviewService;
