/**
 * StampAddedSuccessScreen — SCR-010
 *
 * Shown after cashier confirms stamp.
 * Displays success animation and updated progress.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CustomerStackParamList } from '../types';
import SafeScreen from '../components/layout/SafeScreen';
import StampGrid from '../components/ui/StampGrid';
import RewardBanner from '../components/ui/RewardBanner';
import ZidmeButton from '../components/ui/ZidmeButton';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { Spacing, Radius, Shadow } from '../theme/spacing';

type Props = NativeStackScreenProps<CustomerStackParamList, 'StampAddedSuccess'>;

export default function StampAddedSuccessScreen({ navigation, route }: Props) {
  const { progress, merchantName, merchantCategory } = route.params;

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  const remaining = progress.requiredStamps - progress.currentStamps;
  const newStampIndex = progress.currentStamps - 1; // index of just-added stamp

  useEffect(() => {
    // Entrance animation sequence
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 400,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleContinue = () => {
    navigation.navigate('CustomerStampCard', {
      progress,
      merchantName,
      merchantCategory,
    });
  };

  return (
    <SafeScreen backgroundColor={Colors.primary} style={styles.screen}>
      <View style={styles.container}>
        {/* Success Icon */}
        <Animated.View
          style={[
            styles.successBadge,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <Text style={styles.successEmoji}>✅</Text>
        </Animated.View>

        <Animated.View style={[styles.textBlock, { opacity: opacityAnim }]}>
          <Text style={styles.successTitle}>تمت إضافة الطابع!</Text>
          <Text style={styles.merchantLabel}>{merchantName}</Text>
        </Animated.View>

        {/* Updated stamp card */}
        <Animated.View
          style={[
            styles.card,
            { opacity: successAnim, transform: [{ scale: successAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] },
          ]}
        >
          <StampGrid
            current={progress.currentStamps}
            required={progress.requiredStamps}
            category={merchantCategory}
            newStampIndex={newStampIndex}
          />

          {/* Progress count */}
          <View style={styles.countRow}>
            <Text style={styles.countText}>
              {progress.currentStamps}
            </Text>
            <Text style={styles.countSlash}>/</Text>
            <Text style={styles.countTotal}>
              {progress.requiredStamps}
            </Text>
          </View>

          {/* Remaining */}
          <Text style={styles.remainingText}>
            {remaining === 1
              ? '🔥 طابع واحد أخير وهديتك جاهزة!'
              : `${remaining} طوابع متبقية للهدية`}
          </Text>
        </Animated.View>

        {/* Reward reminder */}
        <RewardBanner rewardLabel={progress.rewardLabel} compact />

        {/* Action */}
        <ZidmeButton
          label="رائع! 👍"
          onPress={handleContinue}
          style={styles.button}
          textStyle={styles.buttonText}
        />
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.primary,
  },
  container: {
    flex: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.base,
  },

  successBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successEmoji: {
    fontSize: 40,
  },

  textBlock: {
    alignItems: 'center',
    gap: 6,
  },
  successTitle: {
    ...Typography.displayMedium,
    color: Colors.white,
    textAlign: 'center',
  },
  merchantLabel: {
    ...Typography.bodyMedium,
    color: 'rgba(255,255,255,0.7)',
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    width: '100%',
    alignItems: 'center',
    gap: Spacing.base,
    ...Shadow.card,
  },

  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  countText: {
    fontSize: 44,
    fontWeight: '900',
    color: Colors.accent,
    lineHeight: 52,
  },
  countSlash: {
    fontSize: 24,
    color: Colors.textMuted,
  },
  countTotal: {
    fontSize: 24,
    fontWeight: '500',
    color: Colors.textSecondary,
  },

  remainingText: {
    ...Typography.labelMedium,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  button: {
    backgroundColor: Colors.accent,
    width: '100%',
  },
  buttonText: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
