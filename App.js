import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Modal, Animated,
  KeyboardAvoidingView, Platform, SafeAreaView,
} from 'react-native';

// ─── THEME ───────────────────────────────────────────────────────────────────
const C = {
  primary: '#0D3D2E',
  primaryLight: '#1A5C44',
  primarySurface: '#E8F4EF',
  accent: '#F5A623',
  accentLight: '#FDD88A',
  stampFilled: '#F5A623',
  stampEmpty: '#D0E8DE',
  success: '#22C55E',
  error: '#EF4444',
  white: '#FFFFFF',
  background: '#F7FAF8',
  surface: '#FFFFFF',
  border: '#D0E8DE',
  borderLight: '#E8F4EF',
  textPrimary: '#0D2218',
  textSecondary: '#4A7B62',
  textMuted: '#8FB5A2',
  overlay: 'rgba(13,61,46,0.5)',
  overlayLight: 'rgba(13,61,46,0.08)',
};

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MERCHANTS = {
  'token-cafe': { id: 'm1', name: 'كافيه الأصيل', category: 'CAFE', status: 'ACTIVE' },
  'token-pizza': { id: 'm2', name: 'بيتزا زيدني', category: 'PIZZERIA', status: 'ACTIVE' },
};
const CATEGORY_ICONS = { CAFE: '☕', PIZZERIA: '🍕', FAST_FOOD: '🍔' };
const delay = (ms) => new Promise(r => setTimeout(r, ms));

let mockStamps = 3;
const REQUIRED = 6;
const REWARD_LABEL = 'قهوة مجانية ☕';

// ─── MOCK API ─────────────────────────────────────────────────────────────────
async function apiRequestOTP(phone) {
  await delay(800);
  if (phone.length < 9) throw { message: 'رقم غير صالح' };
  return { requestId: `req-${Date.now()}`, expiresIn: 300 };
}
async function apiVerifyOTP(code) {
  await delay(1000);
  if (code !== '123456') throw { message: 'الرمز غير صحيح' };
  return { accessToken: 'mock-token', user: { id: 'cus-001' } };
}
async function apiRequestStamp() {
  await delay(900);
  return { id: `sess-${Date.now()}`, status: 'PENDING' };
}
async function apiCashierConfirm() {
  await delay(2000);
  mockStamps = Math.min(mockStamps + 1, REQUIRED);
  return { currentStamps: mockStamps, rewardReady: mockStamps >= REQUIRED };
}
async function apiRequestRedemption() {
  await delay(800);
  return { status: 'REDEEM_REQUESTED' };
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function Btn({ label, onPress, loading, disabled, variant = 'primary', style }) {
  const bg = variant === 'primary' ? C.primary : variant === 'accent' ? C.accent : 'transparent';
  const textColor = variant === 'accent' ? C.primary : C.white;
  const border = variant === 'ghost' ? { borderWidth: 1.5, borderColor: C.border } : {};
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[{
        height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
        backgroundColor: bg, opacity: (disabled || loading) ? 0.5 : 1, width: '100%',
      }, border, style]}
    >
      {loading
        ? <ActivityIndicator color={textColor} />
        : <Text style={{ color: textColor, fontSize: 16, fontWeight: '700' }}>{label}</Text>}
    </TouchableOpacity>
  );
}

function StampDot({ filled, isNew, icon, size = 46 }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: filled ? C.stampFilled : C.stampEmpty,
      borderWidth: filled ? 0 : 1.5, borderColor: C.border,
      alignItems: 'center', justifyContent: 'center',
      transform: [{ scale: isNew ? 1.12 : 1 }],
      shadowColor: filled ? C.accent : 'transparent',
      shadowOpacity: filled ? 0.4 : 0, shadowRadius: 6, elevation: filled ? 4 : 0,
    }}>
      {filled
        ? <Text style={{ fontSize: size * 0.44 }}>{icon}</Text>
        : <View style={{ width: size * 0.3, height: size * 0.3, borderRadius: 99, backgroundColor: C.border }} />}
    </View>
  );
}

function StampGrid({ current, required, category, newIndex }) {
  const icon = CATEGORY_ICONS[category] || '⭐';
  const size = required <= 6 ? 50 : 44;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
      {Array.from({ length: required }).map((_, i) => (
        <StampDot key={i} filled={i < current} isNew={i === newIndex} icon={icon} size={size} />
      ))}
    </View>
  );
}

function OTPBoxes({ value, onChange, error, autoFocus }) {
  const refs = useRef([]);
  useEffect(() => { if (autoFocus) setTimeout(() => refs.current[0]?.focus(), 300); }, []);
  const handleChange = (text, idx) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const chars = value.split('');
    chars[idx] = digit;
    const next = chars.join('').slice(0, 6);
    onChange(next);
    if (digit && idx < 5) refs.current[idx + 1]?.focus();
  };
  const handleKey = (e, idx) => {
    if (e.nativeEvent.key === 'Backspace' && !value[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
      const chars = value.split(''); chars[idx - 1] = '';
      onChange(chars.join(''));
    }
  };
  return (
    <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <TextInput
          key={i} ref={r => refs.current[i] = r}
          value={value[i] || ''} onChangeText={t => handleChange(t, i)}
          onKeyPress={e => handleKey(e, i)}
          keyboardType="number-pad" maxLength={1} selectTextOnFocus caretHidden textAlign="center"
          style={{
            width: 44, height: 54, borderRadius: 12, borderWidth: 1.5,
            borderColor: error ? C.error : value[i] ? C.primary : C.border,
            backgroundColor: value[i] ? C.primarySurface : C.surface,
            fontSize: 22, fontWeight: '700', color: C.textPrimary,
          }}
        />
      ))}
    </View>
  );
}

function LoadingModal({ visible, message }) {
  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={{ flex: 1, backgroundColor: C.overlay, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ backgroundColor: C.white, borderRadius: 20, padding: 32, alignItems: 'center', gap: 16 }}>
          <ActivityIndicator size="large" color={C.primary} />
          {message && <Text style={{ color: C.textSecondary, fontSize: 14 }}>{message}</Text>}
        </View>
      </View>
    </Modal>
  );
}

// ─── SCREENS ──────────────────────────────────────────────────────────────────

function CustomerEntryScreen({ navigate }) {
  const merchant = MERCHANTS['token-cafe'];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 200, backgroundColor: C.primary, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 48, gap: 16 }}>
        {/* Brand */}
        <View style={{ alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', backgroundColor: C.primaryLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
            <Text style={{ fontSize: 24, fontWeight: '900', color: C.white }}>Z</Text>
            <Text style={{ fontSize: 12, color: C.accent, marginBottom: 3, letterSpacing: 2 }}>···</Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: '700', color: C.white }}>زيدني</Text>
        </View>

        {/* Card */}
        <View style={{ backgroundColor: C.white, borderRadius: 24, padding: 24, alignItems: 'center', gap: 16, shadowColor: C.primary, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }}>
          <Text style={{ fontSize: 40 }}>{CATEGORY_ICONS[merchant.category]}</Text>
          <Text style={{ fontSize: 26, fontWeight: '700', color: C.textPrimary }}>{merchant.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.accentLight, borderRadius: 99, paddingHorizontal: 16, paddingVertical: 6 }}>
            <Text>🎁</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: C.primary }}>اجمع طوابع واحصل على مكافأة</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%', paddingTop: 12, borderTopWidth: 1, borderTopColor: C.borderLight }}>
            {[['📱','سجّل رقمك'],['🏷️','اجمع طوابع'],['🎉','احصل على هديتك']].map(([icon,label],i) => (
              <View key={i} style={{ alignItems: 'center', gap: 4, flex: 1 }}>
                <Text style={{ fontSize: 22 }}>{icon}</Text>
                <Text style={{ fontSize: 11, color: C.textSecondary, textAlign: 'center' }}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <Btn label="Start" onPress={() => navigate('PhoneLogin')} />
        <Text style={{ textAlign: 'center', fontSize: 12, color: C.textMuted }}>بدون تحميل تطبيق • بدون تسجيل معقد</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function PhoneLoginScreen({ navigate }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const valid = phone.length === 9 && phone.startsWith('0');

  const send = async () => {
    try {
      setLoading(true); setError('');
      const res = await apiRequestOTP(phone);
      navigate('OTPVerification', { phone, requestId: res.requestId });
    } catch (e) { setError(e.message || 'حدث خطأ'); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 32 }}>
          <View style={{ alignItems: 'center', gap: 12 }}>
            <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: C.primarySurface, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border }}>
              <Text style={{ fontSize: 36 }}>📱</Text>
            </View>
            <Text style={{ fontSize: 22, fontWeight: '700', color: C.textPrimary }}>أدخل رقم هاتفك</Text>
            <Text style={{ fontSize: 14, color: C.textSecondary }}>سنرسل لك رمز تحقق برسالة قصيرة</Text>
          </View>

          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1.5, borderColor: error ? C.error : C.border, backgroundColor: C.white, height: 56, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 6 }}>
                <Text style={{ fontSize: 20 }}>🇩🇿</Text>
                <Text style={{ fontWeight: '600', color: C.textPrimary }}>+213</Text>
              </View>
              <View style={{ width: 1, height: 30, backgroundColor: C.border }} />
              <TextInput
                style={{ flex: 1, paddingHorizontal: 12, fontSize: 16, color: C.textPrimary }}
                value={phone} onChangeText={t => { setPhone(t.replace(/\D/g,'').slice(0,9)); setError(''); }}
                placeholder="0X XX XX XX XX" placeholderTextColor={C.textMuted}
                keyboardType="number-pad" maxLength={9}
              />
            </View>
            {error ? <Text style={{ fontSize: 12, color: C.error, textAlign: 'right' }}>{error}</Text> : null}
            <Btn label="ارسال الرمز" onPress={send} loading={loading} disabled={!valid} />
          </View>

          <Text style={{ textAlign: 'center', fontSize: 12, color: C.textMuted }}>🔒 رقمك محمي ولا يُشارك مع أي جهة</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function OTPVerificationScreen({ navigate, params }) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(60);

  useEffect(() => {
    const t = setInterval(() => setTimer(p => p > 0 ? p - 1 : 0), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { if (otp.length === 6) verify(); }, [otp]);

  const verify = async () => {
    try {
      setLoading(true); setError('');
      await apiVerifyOTP(otp);
      navigate('StampCard');
    } catch (e) { setError(e.message || 'خطأ'); setOtp(''); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 28 }}>
        <View style={{ alignItems: 'center', gap: 12 }}>
          <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: C.primarySurface, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border }}>
            <Text style={{ fontSize: 36 }}>🔐</Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '700', color: C.textPrimary }}>أدخل رمز التحقق</Text>
          <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center' }}>أرسلنا رمزاً من 6 أرقام</Text>
          <View style={{ backgroundColor: C.accentLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ fontSize: 13, color: C.primary }}>💡 للتجربة: استخدم الرمز 123456</Text>
          </View>
        </View>

        <OTPBoxes value={otp} onChange={setOtp} error={!!error} autoFocus />
        {error ? <Text style={{ textAlign: 'center', fontSize: 13, color: C.error }}>{error}</Text> : null}

        {otp.length === 6 && <Btn label="تحقق" onPress={verify} loading={loading} />}

        <View style={{ alignItems: 'center' }}>
          {timer > 0
            ? <Text style={{ fontSize: 13, color: C.textMuted }}>إعادة الإرسال بعد {timer} ثانية</Text>
            : <TouchableOpacity onPress={() => { setTimer(60); setOtp(''); setError(''); }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: C.primary, textDecorationLine: 'underline' }}>أعد إرسال الرمز</Text>
              </TouchableOpacity>}
        </View>
      </View>
    </SafeAreaView>
  );
}

function StampCardScreen({ navigate }) {
  const merchant = MERCHANTS['token-cafe'];
  const [stamps, setStamps] = useState(mockStamps);
  const [loading, setLoading] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const remaining = REQUIRED - stamps;

  const requestStamp = async () => {
    try {
      setLoading(true);
      await apiRequestStamp();
      setLoading(false);
      setWaiting(true);
      const res = await apiCashierConfirm();
      setStamps(res.currentStamps);
      setWaiting(false);
      if (res.rewardReady) navigate('RewardReady');
      else navigate('StampSuccess', { newStamps: res.currentStamps });
    } catch (e) { setLoading(false); setWaiting(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <LoadingModal visible={waiting} message="في انتظار تأكيد الكاشير..." />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ backgroundColor: C.primary, borderRadius: 20, padding: 20, alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 32 }}>{CATEGORY_ICONS[merchant.category]}</Text>
          <Text style={{ fontSize: 22, fontWeight: '700', color: C.white }}>{merchant.name}</Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>كل زيارة مؤهلة</Text>
        </View>

        {/* Stamp Card */}
        <View style={{ backgroundColor: C.white, borderRadius: 20, padding: 24, alignItems: 'center', gap: 16, shadowColor: C.primary, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Text style={{ fontSize: 52, fontWeight: '900', color: C.primary, lineHeight: 60 }}>{stamps}</Text>
            <Text style={{ fontSize: 26, color: C.textMuted }}>/</Text>
            <Text style={{ fontSize: 26, fontWeight: '500', color: C.textSecondary }}>{REQUIRED}</Text>
            <Text style={{ fontSize: 14, color: C.textSecondary, marginLeft: 4 }}>طابع</Text>
          </View>

          <StampGrid current={stamps} required={REQUIRED} category={merchant.category} />

          <View style={{ width: '100%', height: 6, backgroundColor: C.stampEmpty, borderRadius: 99, overflow: 'hidden' }}>
            <View style={{ width: `${(stamps / REQUIRED) * 100}%`, height: '100%', backgroundColor: C.accent, borderRadius: 99 }} />
          </View>

          <Text style={{ fontSize: 14, fontWeight: '600', color: C.textSecondary }}>
            {remaining === 1 ? '🔥 طابع واحد أخير للهدية!' : `${remaining} طوابع متبقية`}
          </Text>
        </View>

        {/* Reward Banner */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.accentLight, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.accent }}>
          <Text style={{ fontSize: 26 }}>🎁</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: C.textSecondary }}>هديتك</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: C.textPrimary }}>{REWARD_LABEL}</Text>
          </View>
        </View>

        <Btn label="اطلب طابعاً" onPress={requestStamp} loading={loading} />
        <Text style={{ textAlign: 'center', fontSize: 12, color: C.textMuted }}>اضغط بعد إتمام شرائك</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StampSuccessScreen({ navigate, params }) {
  const merchant = MERCHANTS['token-cafe'];
  const stamps = params?.newStamps || mockStamps;
  const remaining = REQUIRED - stamps;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }).start();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.primary }}>
      <View style={{ flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }], width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 40 }}>✅</Text>
        </Animated.View>

        <View style={{ alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 26, fontWeight: '700', color: C.white }}>تمت إضافة الطابع!</Text>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>{merchant.name}</Text>
        </View>

        <View style={{ backgroundColor: C.white, borderRadius: 20, padding: 24, width: '100%', alignItems: 'center', gap: 16 }}>
          <StampGrid current={stamps} required={REQUIRED} category={merchant.category} newIndex={stamps - 1} />
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Text style={{ fontSize: 44, fontWeight: '900', color: C.accent }}>{stamps}</Text>
            <Text style={{ fontSize: 22, color: C.textMuted }}>/</Text>
            <Text style={{ fontSize: 22, fontWeight: '500', color: C.textSecondary }}>{REQUIRED}</Text>
          </View>
          <Text style={{ fontSize: 14, fontWeight: '600', color: C.textSecondary, textAlign: 'center' }}>
            {remaining === 1 ? '🔥 طابع واحد أخير وهديتك جاهزة!' : `${remaining} طوابع متبقية للهدية`}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 14, width: '100%' }}>
          <Text style={{ fontSize: 22 }}>🎁</Text>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', flex: 1 }}>{REWARD_LABEL}</Text>
        </View>

        <Btn label="Great" onPress={() => navigate('StampCard')} variant="accent" />
      </View>
    </SafeAreaView>
  );
}

function RewardReadyScreen({ navigate }) {
  const merchant = MERCHANTS['token-cafe'];
  const [state, setState] = useState('READY');
  const glowAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(bounceAnim, { toValue: -10, duration: 600, useNativeDriver: true }),
      Animated.timing(bounceAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ])).start();
  }, []);

  const redeem = async () => {
    setState('REQUESTING');
    await apiRequestRedemption();
    setState('WAITING');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center', gap: 24, paddingTop: 48 }}>
        <Animated.Text style={{ fontSize: 80, transform: [{ translateY: bounceAnim }] }}>🏆</Animated.Text>

        <View style={{ alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 32, fontWeight: '900', color: C.textPrimary }}>مبروك! 🎉</Text>
          <Text style={{ fontSize: 16, color: C.textSecondary, textAlign: 'center' }}>
            أكملت جمع الطوابع في{'\n'}
            <Text style={{ fontWeight: '700', color: C.primary }}>{merchant.name}</Text>
          </Text>
        </View>

        <View style={{ backgroundColor: C.primary, borderRadius: 20, width: '100%', overflow: 'hidden' }}>
          <View style={{ backgroundColor: C.accent, paddingVertical: 8, paddingHorizontal: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.primary, textAlign: 'center', letterSpacing: 0.5 }}>هديتك المكتسبة</Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '700', color: C.white, textAlign: 'center', padding: 24 }}>{REWARD_LABEL}</Text>
          {state === 'WAITING' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.1)', margin: 16, marginTop: 0, borderRadius: 12, padding: 14 }}>
              <Text style={{ fontSize: 22 }}>⏳</Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', flex: 1 }}>في انتظار تأكيد الكاشير...{'\n'}أظهر هذه الشاشة للموظف</Text>
            </View>
          )}
        </View>

        {state === 'READY' && (
          <View style={{ gap: 12, width: '100%' }}>
            <View style={{ backgroundColor: C.white, borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: C.borderLight }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.textSecondary, textAlign: 'center' }}>كيف تستلم هديتك؟</Text>
              {[['1️⃣','اضغط على زر "استلم هديتي"'],['2️⃣','أظهر الشاشة للكاشير'],['3️⃣','سيؤكد الكاشير ويسلمك هديتك']].map(([icon,text],i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 18 }}>{icon}</Text>
                  <Text style={{ fontSize: 14, color: C.textPrimary, flex: 1 }}>{text}</Text>
                </View>
              ))}
            </View>
            <Btn label="استلم هديتي" onPress={redeem} loading={state === 'REQUESTING'} variant="accent" />
          </View>
        )}

        {state === 'WAITING' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Animated.View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: C.accent, opacity: glowAnim }} />
            <Text style={{ fontSize: 14, color: C.textSecondary }}>في انتظار الكاشير</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── NAVIGATOR ────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState('CustomerEntry');
  const [params, setParams] = useState({});

  const navigate = (name, p = {}) => {
    setScreen(name);
    setParams(p);
  };

  const screens = {
    CustomerEntry: <CustomerEntryScreen navigate={navigate} params={params} />,
    PhoneLogin: <PhoneLoginScreen navigate={navigate} params={params} />,
    OTPVerification: <OTPVerificationScreen navigate={navigate} params={params} />,
    StampCard: <StampCardScreen navigate={navigate} params={params} />,
    StampSuccess: <StampSuccessScreen navigate={navigate} params={params} />,
    RewardReady: <RewardReadyScreen navigate={navigate} params={params} />,
  };

  return (
    <View style={{ flex: 1 }}>
      {screens[screen]}
      {/* Dev nav bar */}
      <View style={{ flexDirection: 'row', backgroundColor: C.primary, paddingBottom: 8, paddingTop: 4 }}>
        {[['Entry','CustomerEntry'],['Login','PhoneLogin'],['OTP','OTPVerification'],['Card','StampCard'],['✅','StampSuccess'],['🏆','RewardReady']].map(([label, name]) => (
          <TouchableOpacity key={name} onPress={() => navigate(name)} style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}>
            <Text style={{ fontSize: 10, color: screen === name ? C.accent : 'rgba(255,255,255,0.5)', fontWeight: screen === name ? '700' : '400' }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
