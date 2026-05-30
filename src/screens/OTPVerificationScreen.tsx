/**
 * OTPVerificationScreen — SCR-003
 *
 * 6-digit OTP verification with resend timer.
 * Handles invalid OTP, expired OTP, and too many attempts.
 *
 * Mock: code "123456" always succeeds.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CustomerStackParamList } from '../types';
import SafeScreen from '../components/layout/SafeScreen';
import OTPInput from '../components/ui/OTPInput';
import ZidmeButton from '../components/ui/ZidmeButton';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { verifyOTP, requestOTP, getCustomerProgress, getMerchantByToken } from '../services/mockApi';

type Props = NativeStackScreenProps<CustomerStackParamList, 'OTPVerification'>;

const RESEND_COOLDOWN = 60; // seconds
const OTP_LENGTH = 6;

export default function OTPVerificationScreen({ navigation, route }: Props) {
  const { phone, requestId: initialRequestId, merchantToken } = route.params;

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN);
  const [currentRequestId, setCurrentRequestId] = useState(initialRequestId);
  const [resending, setResending] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    startResendTimer();
    return () => stopResendTimer();
  }, []);

  useEffect(() => {
    // Auto-verify when 6 digits entered
    if (otp.length === OTP_LENGTH && !loading) {
      handleVerify();
    }
  }, [otp]);

  const startResendTimer = () => {
    setResendTimer(RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          stopResendTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopResendTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleVerify = async () => {
    if (otp.length < OTP_LENGTH) return;
    if (attempts >= 5) {
      setError('تجاوزت عدد المحاولات. اطلب رمزاً جديداً.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const session = await verifyOTP(phone, currentRequestId, otp);
      const merchant = await getMerchantByToken(merchantToken);
      const progress = await getCustomerProgress(merchant.id);

      // If reward is already ready, go straight to RewardReady
      if (progress.rewardStatus === 'READY') {
        navigation.replace('RewardReady', {
          reward: {
            id: 'rwd-001',
            status: 'READY',
            rewardLabel: progress.rewardLabel,
            merchantName: merchant.name,
          },
          merchantName: merchant.name,
        });
        return;
      }

      navigation.replace('CustomerStampCard', {
        progress,
        merchantName: merchant.name,
        merchantCategory: merchant.category,
      });
    } catch (e: any) {
      setAttempts((prev) => prev + 1);
      setOtp('');

      if (e?.code === 'OTP_EXPIRED') {
        setError('انتهت صلاحية الرمز. اطلب رمزاً جديداً.');
      } else {
        setError(`الرمز غير صحيح. تبقى لك ${5 - attempts - 1} محاولات.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || resending) return;

    try {
      setResending(true);
      setError(null);
      setOtp('');
      setAttempts(0);

      const result = await requestOTP(phone);
      setCurrentRequestId(result.requestId);
      startResendTimer();
    } catch (e: any) {
      setError('تعذّر إرسال الرمز. حاول مجدداً.');
    } finally {
      setResending(false);
    }
  };

  // Format phone for display (mask middle digits)
  const displayPhone = phone.replace(/(\+213)(\d{2})(\d{4})(\d{3})/, '$1 $2 ···· $4');

  return (
    <SafeScreen backgroundColor={Colors.background}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconBg}>
            <Text style={styles.icon}>🔐</Text>
          </View>
          <Text style={styles.title}>أدخل رمز التحقق</Text>
          <Text style={styles.subtitle}>
            أرسلنا رمزاً مكوناً من 6 أرقام إلى{'\n'}
            <Text style={styles.phone}>{displayPhone}</Text>
          </Text>

          {/* Dev hint */}
          <View style={styles.devHint}>
            <Text style={styles.devHintText}>💡 للتجربة: استخدم الرمز 123456</Text>
          </View>
        </View>

        {/* OTP */}
        <OTPInput
          value={otp}
          onChange={(val) => {
            setOtp(val);
            if (error) setError(null);
          }}
          error={!!error}
          disabled={loading || attempts >= 5}
          autoFocus
        />

        {/* Error */}
        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : null}

        {/* Verify button (shown when less than 6 digits or error) */}
        {(otp.length === OTP_LENGTH || error) && (
          <ZidmeButton
            label="تحقق"
            onPress={handleVerify}
            loading={loading}
            disabled={otp.length < OTP_LENGTH || attempts >= 5}
          />
        )}

        {/* Resend */}
        <View style={styles.resendRow}>
          {resendTimer > 0 ? (
            <Text style={styles.resendTimer}>
              إعادة الإرسال بعد {resendTimer} ثانية
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResend} disabled={resending}>
              <Text style={styles.resendLink}>
                {resending ? 'جارٍ الإرسال...' : 'أعد إرسال الرمز'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
    gap: Spacing.xl,
  },

  header: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconBg: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  icon: {
    fontSize: 36,
  },
  title: {
    ...Typography.heading1,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  phone: {
    fontWeight: '700',
    color: Colors.primary,
  },
  devHint: {
    backgroundColor: Colors.accentLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  devHintText: {
    ...Typography.bodySmall,
    color: Colors.primary,
  },

  error: {
    ...Typography.bodySmall,
    color: Colors.error,
    textAlign: 'center',
  },

  resendRow: {
    alignItems: 'center',
  },
  resendTimer: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
  },
  resendLink: {
    ...Typography.labelMedium,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
});
