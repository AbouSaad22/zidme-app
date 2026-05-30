/**
 * RewardReadyScreen — SCR-011
 *
 * Shown when customer has completed required stamps.
 * States: READY → REDEEM_REQUESTED → (cashier confirms)
 *
 * Customer presses "استلم هديتي" → backend creates redemption request.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CustomerStackParamList } from '../types';
import SafeScreen from '../components/layout/SafeScreen';
import ZidmeButton from '../components/ui/ZidmeButton';
import LoadingOverlay from '../components/ui/LoadingOverlay';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { Spacing, Radius, Shadow } from '../theme/spacing';
import { requestRedemption } from '../services/mockApi';

type Props = NativeStackScreenProps<CustomerStackParamList, 'RewardReady'>;

type ScreenState = 'READY' | 'REQUESTING' | 'WAITING_CASHIER' | 'DONE';

export default function RewardReadyScreen({ navigation, route }: Props) {
  const { reward, merchantName } = route.params;

  const [screenState, setScreenState] = useState<ScreenState>('READY');

  // Animations
  const glowAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance
    Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start();

    // Pulsing glow loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ]),
    ).start();

    // Trophy bounce
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -8, duration: 600, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const handleRedeem = async () => {
    try {
      setScreenState('REQUESTING');
      await requestRedemption(reward.id);
      setScreenState('WAITING_CASHIER');
    } catch (e) {
      setScreenState('READY');
    }
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  const isWaiting = screenState === 'WAITING_CASHIER';
  const isRequesting = screenState === 'REQUESTING';

  return (
    <SafeScreen backgroundColor={Colors.background}>
      <LoadingOverlay visible={isRequesting} message="جارٍ إرسال الطلب..." />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.container, { opacity: fadeIn }]}>
          {/* Glow bg */}
          <Animated.View style={[styles.glowBg, { opacity: glowOpacity }]} />

          {/* Trophy */}
          <Animated.Text
            style={[styles.trophy, { transform: [{ translateY: bounceAnim }] }]}
          >
            🏆
          </Animated.Text>

          {/* Congratulations */}
          <View style={styles.textBlock}>
            <Text style={styles.congrats}>مبروك! 🎉</Text>
            <Text style={styles.subtext}>
              أكملت جمع الطوابع في{'\n'}
              <Text style={styles.merchantHighlight}>{merchantName}</Text>
            </Text>
          </View>

          {/* Reward card */}
          <View style={styles.rewardCard}>
            <View style={styles.rewardHeader}>
              <Text style={styles.rewardHeaderText}>هديتك المكتسبة</Text>
            </View>
            <Text style={styles.rewardLabel}>{reward.rewardLabel}</Text>

            {isWaiting && (
              <View style={styles.waitingBanner}>
                <Text style={styles.waitingIcon}>⏳</Text>
                <Text style={styles.waitingText}>
                  في انتظار تأكيد الكاشير...{'\n'}أظهر هذه الشاشة للموظف
                </Text>
              </View>
            )}
          </View>

          {/* Instructions */}
          {!isWaiting && (
            <View style={styles.instructionBox}>
              <Text style={styles.instructionTitle}>كيف تستلم هديتك؟</Text>
              {[
                { icon: '1️⃣', text: 'اضغط على زر "استلم هديتي"' },
                { icon: '2️⃣', text: 'أظهر الشاشة للكاشير' },
                { icon: '3️⃣', text: 'سيؤكد الكاشير ويسلمك هديتك' },
              ].map((item, i) => (
                <View key={i} style={styles.instructionRow}>
                  <Text style={styles.instructionIcon}>{item.icon}</Text>
                  <Text style={styles.instructionText}>{item.text}</Text>
                </View>
              ))}
            </View>
          )}

          {/* CTA */}
          {!isWaiting ? (
            <ZidmeButton
              label="استلم هديتي 🎁"
              onPress={handleRedeem}
              loading={isRequesting}
              style={styles.redeemButton}
              textStyle={styles.redeemButtonText}
            />
          ) : (
            <View style={styles.waitingPulse}>
              <Animated.View style={[styles.pulseDot, { opacity: glowOpacity }]} />
              <Text style={styles.waitingLabel}>في انتظار الكاشير</Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.xl,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.xxxl,
  },

  glowBg: {
    position: 'absolute',
    top: 0,
    left: '20%',
    width: '60%',
    height: 200,
    backgroundColor: Colors.accentLight,
    borderRadius: 200,
    transform: [{ scaleY: 0.3 }],
  },

  trophy: {
    fontSize: 80,
  },

  textBlock: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  congrats: {
    ...Typography.displayLarge,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtext: {
    ...Typography.bodyLarge,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },
  merchantHighlight: {
    fontWeight: '700',
    color: Colors.primary,
  },

  rewardCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    width: '100%',
    overflow: 'hidden',
    ...Shadow.card,
  },
  rewardHeader: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
  },
  rewardHeaderText: {
    ...Typography.labelSmall,
    color: Colors.primary,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  rewardLabel: {
    ...Typography.heading1,
    color: Colors.white,
    textAlign: 'center',
    padding: Spacing.xl,
  },

  waitingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
    margin: Spacing.base,
    marginTop: 0,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  waitingIcon: {
    fontSize: 24,
  },
  waitingText: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
    lineHeight: 20,
  },

  instructionBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    width: '100%',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  instructionTitle: {
    ...Typography.labelMedium,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  instructionIcon: {
    fontSize: 18,
    width: 28,
    textAlign: 'center',
  },
  instructionText: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    flex: 1,
  },

  redeemButton: {
    backgroundColor: Colors.accent,
    width: '100%',
  },
  redeemButtonText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 18,
  },

  waitingPulse: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.accent,
  },
  waitingLabel: {
    ...Typography.labelMedium,
    color: Colors.textSecondary,
  },
});
