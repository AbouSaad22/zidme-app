/**
 * CustomerStampCardScreen — SCR-009
 *
 * Core customer value screen. Shows:
 * - Merchant category icon + name
 * - Stamp progress grid (Hero Component)
 * - Program rule (PER_VISIT or MIN_PURCHASE_STAMP)
 * - Reward label
 * - Request stamp CTA
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CustomerStackParamList } from '../types';
import SafeScreen from '../components/layout/SafeScreen';
import StampGrid from '../components/ui/StampGrid';
import RewardBanner from '../components/ui/RewardBanner';
import ZidmeButton from '../components/ui/ZidmeButton';
import CategoryIcon from '../components/ui/CategoryIcon';
import LoadingOverlay from '../components/ui/LoadingOverlay';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { Spacing, Radius, Shadow } from '../theme/spacing';
import { requestStamp, simulateCashierConfirm } from '../services/mockApi';

type Props = NativeStackScreenProps<CustomerStackParamList, 'CustomerStampCard'>;

export default function CustomerStampCardScreen({ navigation, route }: Props) {
  const { progress, merchantName, merchantCategory } = route.params;

  const [requesting, setRequesting] = useState(false);
  const [waitingCashier, setWaitingCashier] = useState(false);

  const remaining = progress.requiredStamps - progress.currentStamps;
  const isComplete = remaining <= 0;

  const getRuleText = () => {
    if (progress.strategyType === 'MIN_PURCHASE_STAMP') {
      return `كل شراء بـ ${progress.minAmountDzd} دج أو أكثر`;
    }
    return 'كل زيارة مؤهلة';
  };

  const handleRequestStamp = async () => {
    if (isComplete) return;

    try {
      setRequesting(true);
      // Create pending session
      const session = await requestStamp('token-merchant', progress.customerId);

      setRequesting(false);
      setWaitingCashier(true);

      // Simulate cashier confirms (auto in mock)
      const result = await simulateCashierConfirm(session.id);

      setWaitingCashier(false);

      if (result.rewardReady) {
        navigation.navigate('RewardReady', {
          reward: {
            id: 'rwd-001',
            status: 'READY',
            rewardLabel: progress.rewardLabel,
            merchantName,
          },
          merchantName,
        });
      } else {
        navigation.navigate('StampAddedSuccess', {
          progress: result.progress,
          merchantName,
          merchantCategory,
        });
      }
    } catch (e: any) {
      setRequesting(false);
      setWaitingCashier(false);
    }
  };

  return (
    <SafeScreen backgroundColor={Colors.background}>
      <LoadingOverlay
        visible={waitingCashier}
        message={'في انتظار تأكيد الكاشير...'}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Top green header */}
        <View style={styles.topSection}>
          <CategoryIcon category={merchantCategory} size={32} />
          <Text style={styles.merchantName}>{merchantName}</Text>
          <Text style={styles.ruleText}>{getRuleText()}</Text>
        </View>

        {/* Stamp Card — Hero Component */}
        <View style={styles.card}>
          {/* Progress count */}
          <View style={styles.progressRow}>
            <Text style={styles.progressCurrent}>{progress.currentStamps}</Text>
            <Text style={styles.progressSeparator}>/</Text>
            <Text style={styles.progressTotal}>{progress.requiredStamps}</Text>
            <Text style={styles.progressLabel}>طابع</Text>
          </View>

          {/* Stamp Grid */}
          <StampGrid
            current={progress.currentStamps}
            required={progress.requiredStamps}
            category={merchantCategory}
          />

          {/* Progress bar */}
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(
                    (progress.currentStamps / progress.requiredStamps) * 100,
                    100,
                  )}%`,
                },
              ]}
            />
          </View>

          {/* Remaining text */}
          {!isComplete && (
            <Text style={styles.remainingText}>
              {remaining === 1
                ? 'طابع واحد أخير للحصول على هديتك! 🔥'
                : `${remaining} طوابع متبقية`}
            </Text>
          )}
        </View>

        {/* Reward Banner */}
        <RewardBanner
          rewardLabel={progress.rewardLabel}
          isReady={isComplete}
        />

        {/* CTA */}
        <View style={styles.ctaSection}>
          {isComplete ? (
            <ZidmeButton
              label="استلم هديتي 🎁"
              onPress={() =>
                navigation.navigate('RewardReady', {
                  reward: {
                    id: 'rwd-001',
                    status: 'READY',
                    rewardLabel: progress.rewardLabel,
                    merchantName,
                  },
                  merchantName,
                })
              }
            />
          ) : (
            <ZidmeButton
              label="اطلب طابعاً"
              onPress={handleRequestStamp}
              loading={requesting}
            />
          )}
          <Text style={styles.ctaHint}>
            {isComplete
              ? 'أظهر هذه الشاشة للكاشير'
              : 'اضغط بعد إتمام شرائك'}
          </Text>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: Spacing.base,
    gap: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },

  topSection: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  merchantName: {
    ...Typography.heading1,
    color: Colors.white,
    textAlign: 'center',
  },
  ruleText: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.7)',
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.base,
    alignItems: 'center',
    ...Shadow.card,
  },

  progressRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  progressCurrent: {
    fontSize: 48,
    fontWeight: '900',
    color: Colors.primary,
    lineHeight: 56,
  },
  progressSeparator: {
    fontSize: 28,
    color: Colors.textMuted,
    fontWeight: '300',
  },
  progressTotal: {
    fontSize: 28,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  progressLabel: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    marginLeft: 4,
  },

  progressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.stampEmpty,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
  },

  remainingText: {
    ...Typography.labelMedium,
    color: Colors.textSecondary,
  },

  ctaSection: {
    gap: Spacing.sm,
    alignItems: 'center',
  },
  ctaHint: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
  },
});
