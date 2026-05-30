import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
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
const CATEGORY_ICONS = { CAFE: '☕', PIZZERIA: '🍕', FAST_FOOD: '🍔' };
const CATEGORY_NAMES = { CAFE: 'مقهى', PIZZERIA: 'بيتزيريا', FAST_FOOD: 'وجبات سريعة' };
const CATEGORY_COLORS = { CAFE: '#6F4E37', PIZZERIA: '#E25822', FAST_FOOD: '#FFA500' };
const CATEGORY_STAMPS = { CAFE: 6, PIZZERIA: 8, FAST_FOOD: 5 };

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// Mock global state
let mockUser = null;
let mockMerchant = null;
let mockProgram = null;
let mockStamps = 3;
let mockPendingRequests = [];

const REQUIRED = 6;
const REWARD_LABEL = 'قهوة مجانية';

// ─── MOCK API ─────────────────────────────────────────────────────────────────
async function apiRequestOTP(phone) {
  await delay(800);
  if (phone.length < 9) throw { message: 'رقم غير صالح' };
  return { requestId: `req-${Date.now()}`, expiresIn: 300 };
}
async function apiVerifyOTP(code) {
  await delay(1000);
  if (code !== '123456') throw { message: 'الرمز غير صحيح' };
  mockUser = { id: 'usr-001', phone: '0555123456' };
  return mockUser;
}
async function apiCreateMerchant(name, category) {
  await delay(1000);
  mockMerchant = { id: 'mer-001', name, category, status: 'ACTIVE', qrToken: 'token-' + Date.now() };
  return mockMerchant;
}
async function apiCreateProgram(rewardLabel, requiredStamps, strategy, minAmount) {
  await delay(800);
  mockProgram = { id: 'prog-001', rewardLabel, requiredStamps, strategy, minAmount };
  return mockProgram;
}
async function apiGetDashboard() {
  await delay(700);
  return { stampsToday: 12, returningCustomers: 4, rewardsRedeemed: 2, activity: [
    { type: 'stamp', customer: '05** *** 23', time: 'منذ 5 دقائق' },
    { type: 'reward', customer: '06** *** 11', time: 'منذ 20 دقيقة' },
    { type: 'stamp', customer: '07** *** 88', time: 'منذ 35 دقيقة' },
  ]};
}
async function apiRequestStamp() {
  await delay(900);
  const req = { id: `req-${Date.now()}`, customer: '05** *** 42', time: 'الآن', status: 'PENDING' };
  mockPendingRequests = [req, ...mockPendingRequests];
  return req;
}
async function apiGetPending() {
  await delay(500);
  return mockPendingRequests.filter(r => r.status === 'PENDING');
}
async function apiConfirmStamp(reqId) {
  await delay(800);
  mockPendingRequests = mockPendingRequests.map(r => r.id === reqId ? { ...r, status: 'CONFIRMED' } : r);
  mockStamps = Math.min(mockStamps + 1, REQUIRED);
  return { currentStamps: mockStamps, rewardReady: mockStamps >= REQUIRED };
}
async function apiRejectStamp(reqId) {
  await delay(500);
  mockPendingRequests = mockPendingRequests.map(r => r.id === reqId ? { ...r, status: 'REJECTED' } : r);
}
async function apiGetProgress() {
  await delay(600);
  return { currentStamps: mockStamps, requiredStamps: REQUIRED, rewardStatus: mockStamps >= REQUIRED ? 'READY' : 'NONE', rewardLabel: REWARD_LABEL, strategy: 'PER_VISIT' };
}
async function apiRedeemReward() {
  await delay(800);
  mockStamps = 0;
  return { status: 'REDEEMED' };
}
// ─── MOCK MERCHANTS NEARBY ────────────────────────────────────────────────────
const NEARBY_MERCHANTS = [
  { id: 'm1', name: 'كافيه الأصيل', category: 'CAFE', distance: '120م', rating: 4.8, joined: true, stamps: 3, required: 6, points: 240 },
  { id: 'm2', name: 'بيتزا زيدني', category: 'PIZZERIA', distance: '350م', rating: 4.5, joined: false, stamps: 0, required: 8, points: 0 },
  { id: 'm3', name: 'فاست فود برو', category: 'FAST_FOOD', distance: '500م', rating: 4.2, joined: false, stamps: 0, required: 5, points: 0 },
  { id: 'm4', name: 'مقهى النجوم', category: 'CAFE', distance: '800م', rating: 4.6, joined: false, stamps: 0, required: 6, points: 0 },
];

// Mock points system
let myZidmePoints = 180;
let myMerchantPoints = { m1: 240, m2: 0, m3: 0, m4: 0 };

async function apiGetNearby() {
  await delay(1000);
  return NEARBY_MERCHANTS;
}
async function apiJoinMerchant(merchantId) {
  await delay(600);
  return { success: true };
}
async function apiAddPoints(merchantId, amount) {
  await delay(500);
  const pts = Math.floor(amount / 100) * 10;
  myMerchantPoints[merchantId] = (myMerchantPoints[merchantId] || 0) + pts;
  myZidmePoints += Math.floor(pts * 0.1);
  return { pointsAdded: pts, total: myMerchantPoints[merchantId] };
}
async function apiSharePoints(toPhone, amount) {
  await delay(800);
  myZidmePoints = Math.max(0, myZidmePoints - amount);
  return { success: true, remaining: myZidmePoints };
}
async function apiGetReferralLink() {
  await delay(300);
  return { link: 'https://zidme.dz/join?ref=ABD2024', code: 'ABD2024' };
}


// ─── SHARED COMPONENTS ───────────────────────────────────────────────────────
function Btn({ label, onPress, loading, disabled, variant = 'primary', style }) {
  const bg = variant === 'primary' ? C.primary : variant === 'accent' ? C.accent : variant === 'danger' ? '#FEE2E2' : 'transparent';
  const textColor = variant === 'accent' ? C.primary : variant === 'danger' ? C.error : variant === 'ghost' ? C.textSecondary : C.white;
  const border = variant === 'ghost' ? { borderWidth: 1.5, borderColor: C.border } : variant === 'danger' ? { borderWidth: 1.5, borderColor: C.error } : {};
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.8}
      style={[{ height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
        backgroundColor: bg, opacity: (disabled || loading) ? 0.5 : 1, width: '100%' }, border, style]}>
      {loading ? <ActivityIndicator color={textColor} />
        : <Text style={{ color: textColor, fontSize: 16, fontWeight: '700' }}>{label}</Text>}
    </TouchableOpacity>
  );
}

function LoadingModal({ visible, message }) {
  if (!visible) return null;
  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={{ flex: 1, backgroundColor: C.overlay, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ backgroundColor: C.white, borderRadius: 20, padding: 32, alignItems: 'center', gap: 16 }}>
          <ActivityIndicator size="large" color={C.primary} />
          {message && <Text style={{ color: C.textSecondary, fontSize: 14, textAlign: 'center' }}>{message}</Text>}
        </View>
      </View>
    </Modal>
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
        <TextInput key={i} ref={r => refs.current[i] = r}
          value={value[i] || ''} onChangeText={t => handleChange(t, i)}
          onKeyPress={e => handleKey(e, i)}
          keyboardType="number-pad" maxLength={1} selectTextOnFocus caretHidden textAlign="center"
          style={{ width: 44, height: 54, borderRadius: 12, borderWidth: 1.5,
            borderColor: error ? C.error : value[i] ? C.primary : C.border,
            backgroundColor: value[i] ? C.primarySurface : C.surface,
            fontSize: 22, fontWeight: '700', color: C.textPrimary }} />
      ))}
    </View>
  );
}

function StampDot({ filled, isNew, icon, size = 46 }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2,
      backgroundColor: filled ? C.stampFilled : C.stampEmpty,
      borderWidth: filled ? 0 : 1.5, borderColor: C.border,
      alignItems: 'center', justifyContent: 'center',
      transform: [{ scale: isNew ? 1.12 : 1 }],
      shadowColor: filled ? C.accent : 'transparent',
      shadowOpacity: filled ? 0.4 : 0, shadowRadius: 6, elevation: filled ? 4 : 0 }}>
      {filled ? <Text style={{ fontSize: size * 0.44 }}>{icon}</Text>
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

// ─── SCREEN: PHONE LOGIN ──────────────────────────────────────────────────────
function PhoneLoginScreen({ navigate }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const valid = phone.length === 9 && phone.startsWith('0');

  const send = async () => {
    try {
      setLoading(true); setError('');
      const res = await apiRequestOTP(phone);
      navigate('OTP', { phone, requestId: res.requestId });
    } catch (e) { setError(e.message || 'حدث خطأ'); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 32 }}>

          {/* Logo */}
          <View style={{ alignItems: 'center', gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', backgroundColor: C.primary, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10 }}>
              <Text style={{ fontSize: 32, fontWeight: '900', color: C.white }}>Z</Text>
              <Text style={{ fontSize: 14, color: C.accent, marginBottom: 4, letterSpacing: 3 }}>...</Text>
            </View>
            <Text style={{ fontSize: 24, fontWeight: '800', color: C.textPrimary }}>زيدني</Text>
            <Text style={{ fontSize: 14, color: C.textSecondary }}>نظام ولاء رقمي للمحلات الجزائرية</Text>
          </View>

          {/* Form */}
          <View style={{ gap: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: C.textPrimary, textAlign: 'right' }}>رقم هاتفك</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1.5,
              borderColor: error ? C.error : C.border, backgroundColor: C.white, height: 56, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 6 }}>
                <Text style={{ fontSize: 20 }}>🇩🇿</Text>
                <Text style={{ fontWeight: '600', color: C.textPrimary }}>+213</Text>
              </View>
              <View style={{ width: 1, height: 30, backgroundColor: C.border }} />
              <TextInput style={{ flex: 1, paddingHorizontal: 12, fontSize: 16, color: C.textPrimary }}
                value={phone} onChangeText={t => { setPhone(t.replace(/\D/g, '').slice(0, 9)); setError(''); }}
                placeholder="0X XX XX XX XX" placeholderTextColor={C.textMuted} keyboardType="number-pad" maxLength={9} />
            </View>
            {error ? <Text style={{ fontSize: 12, color: C.error, textAlign: 'right' }}>{error}</Text> : null}
            <Btn label="إرسال رمز التحقق" onPress={send} loading={loading} disabled={!valid} />
          </View>

          <View style={{ backgroundColor: C.accentLight, borderRadius: 12, padding: 12 }}>
            <Text style={{ fontSize: 13, color: C.primary, textAlign: 'center' }}>
              💡 للتجربة: أي رقم من 9 أرقام يبدأ بـ 0
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── SCREEN: OTP ──────────────────────────────────────────────────────────────
function OTPScreen({ navigate, params }) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(60);

  useEffect(() => {
    const t = setInterval(() => setTimer(p => p > 0 ? p - 1 : 0), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { if (otp.length === 6 && !loading) verify(); }, [otp]);

  const verify = async () => {
    try {
      setLoading(true); setError('');
      await apiVerifyOTP(otp);
      navigate('RoleSelect');
    } catch (e) { setError(e.message || 'خطأ'); setOtp(''); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 28 }}>
        <View style={{ alignItems: 'center', gap: 12 }}>
          <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: C.primarySurface,
            alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border }}>
            <Text style={{ fontSize: 36 }}>🔐</Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '700', color: C.textPrimary }}>أدخل رمز التحقق</Text>
          <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center' }}>
            أرسلنا رمزاً من 6 أرقام
          </Text>
          <View style={{ backgroundColor: C.accentLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ fontSize: 13, color: C.primary }}>💡 الرمز التجريبي: 123456</Text>
          </View>
        </View>

        <OTPBoxes value={otp} onChange={setOtp} error={!!error} autoFocus />
        {error ? <Text style={{ textAlign: 'center', fontSize: 13, color: C.error }}>{error}</Text> : null}
        {otp.length === 6 && <Btn label="تحقق" onPress={verify} loading={loading} />}

        <View style={{ alignItems: 'center' }}>
          {timer > 0
            ? <Text style={{ fontSize: 13, color: C.textMuted }}>إعادة الإرسال بعد {timer} ثانية</Text>
            : <TouchableOpacity onPress={() => { setTimer(60); setOtp(''); setError(''); }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: C.primary, textDecorationLine: 'underline' }}>
                  أعد إرسال الرمز
                </Text>
              </TouchableOpacity>}
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── SCREEN: ROLE SELECT ──────────────────────────────────────────────────────
function RoleSelectScreen({ navigate }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 32 }}>

        <View style={{ alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 26, fontWeight: '800', color: C.textPrimary }}>أهلاً بك!</Text>
          <Text style={{ fontSize: 15, color: C.textSecondary, textAlign: 'center' }}>
            كيف تريد استخدام زيدني اليوم؟
          </Text>
        </View>

        {/* Customer Card */}
        <TouchableOpacity onPress={() => navigate('CustomerEntry')} activeOpacity={0.85}
          style={{ backgroundColor: C.white, borderRadius: 20, padding: 24, gap: 12,
            borderWidth: 2, borderColor: C.border,
            shadowColor: C.primary, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }}>
          <Text style={{ fontSize: 48, textAlign: 'center' }}>🛍️</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: C.textPrimary, textAlign: 'center' }}>
            أنا زبون
          </Text>
          <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 22 }}>
            أريد جمع طوابع والحصول على مكافآت من المحلات
          </Text>
          <View style={{ backgroundColor: C.primarySurface, borderRadius: 10, padding: 10 }}>
            <Text style={{ fontSize: 13, color: C.primary, textAlign: 'center' }}>
              اجمع طوابع واستلم هديتك
            </Text>
          </View>
        </TouchableOpacity>

        {/* Merchant Card */}
        <TouchableOpacity onPress={() => navigate('MerchantSetup')} activeOpacity={0.85}
          style={{ backgroundColor: C.primary, borderRadius: 20, padding: 24, gap: 12,
            shadowColor: C.primary, shadowOpacity: 0.3, shadowRadius: 12, elevation: 5 }}>
          <Text style={{ fontSize: 48, textAlign: 'center' }}>🏪</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: C.white, textAlign: 'center' }}>
            أنا تاجر
          </Text>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 22 }}>
            أريد إنشاء برنامج ولاء لمحلي وإدارة زبائني
          </Text>
          <View style={{ backgroundColor: 'rgba(245,166,35,0.2)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: C.accent }}>
            <Text style={{ fontSize: 13, color: C.accent, textAlign: 'center' }}>
              أطلق برنامجك خلال 3 دقائق
            </Text>
          </View>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

// ─── SCREEN: MERCHANT SETUP ───────────────────────────────────────────────────
function MerchantSetupScreen({ navigate }) {
  const [step, setStep] = useState(1); // 1=name, 2=category, 3=reward
  const [name, setName] = useState('');
  const [category, setCategory] = useState(null);
  const [rewardLabel, setRewardLabel] = useState('');
  const [stamps, setStamps] = useState(6);
  const [strategy, setStrategy] = useState('PER_VISIT');
  const [minAmount, setMinAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    try {
      setLoading(true);
      await apiCreateMerchant(name, category);
      await apiCreateProgram(rewardLabel, stamps, strategy, minAmount ? parseInt(minAmount) : null);
      navigate('QRPoster');
    } catch (e) { }
    finally { setLoading(false); }
  };

  // Step 1: Store name
  if (step === 1) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flex: 1, padding: 24, gap: 24 }}>
          {/* Progress */}
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: C.textMuted }}>الخطوة 1 من 3</Text>
              <Text style={{ fontSize: 13, color: C.primary, fontWeight: '600' }}>معلومات المحل</Text>
            </View>
            <View style={{ height: 4, backgroundColor: C.border, borderRadius: 99 }}>
              <View style={{ width: '33%', height: '100%', backgroundColor: C.primary, borderRadius: 99 }} />
            </View>
          </View>

          <View style={{ flex: 1, justifyContent: 'center', gap: 24 }}>
            <View style={{ alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 40 }}>🏪</Text>
              <Text style={{ fontSize: 22, fontWeight: '700', color: C.textPrimary }}>ما اسم محلك؟</Text>
            </View>
            <TextInput
              value={name} onChangeText={setName}
              placeholder="مثال: كافيه الأصيل" placeholderTextColor={C.textMuted}
              style={{ borderWidth: 1.5, borderColor: C.border, borderRadius: 14, padding: 16,
                fontSize: 18, color: C.textPrimary, backgroundColor: C.white, textAlign: 'right' }}
              maxLength={40} autoFocus
            />
            <Btn label="التالي" onPress={() => setStep(2)} disabled={name.trim().length < 2} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  // Step 2: Category
  if (step === 2) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ flex: 1, padding: 24, gap: 24 }}>
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: C.textMuted }}>الخطوة 2 من 3</Text>
            <Text style={{ fontSize: 13, color: C.primary, fontWeight: '600' }}>صنف المحل</Text>
          </View>
          <View style={{ height: 4, backgroundColor: C.border, borderRadius: 99 }}>
            <View style={{ width: '66%', height: '100%', backgroundColor: C.primary, borderRadius: 99 }} />
          </View>
        </View>

        <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: C.textPrimary, textAlign: 'center' }}>
            ما صنف محلك؟
          </Text>
          <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center' }}>
            سيحدد التصميم والإعدادات الافتراضية
          </Text>

          {Object.entries(CATEGORY_ICONS).map(([key, icon]) => (
            <TouchableOpacity key={key} onPress={() => setCategory(key)} activeOpacity={0.85}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, borderRadius: 16,
                backgroundColor: category === key ? C.primary : C.white,
                borderWidth: 2, borderColor: category === key ? C.primary : C.border }}>
              <Text style={{ fontSize: 36 }}>{icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: category === key ? C.white : C.textPrimary }}>
                  {CATEGORY_NAMES[key]}
                </Text>
                <Text style={{ fontSize: 13, color: category === key ? 'rgba(255,255,255,0.7)' : C.textMuted }}>
                  {CATEGORY_STAMPS[key]} طوابع افتراضية
                </Text>
              </View>
              {category === key && <Text style={{ fontSize: 20 }}>✅</Text>}
            </TouchableOpacity>
          ))}

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Btn label="رجوع" onPress={() => setStep(1)} variant="ghost" style={{ flex: 1 }} />
            <Btn label="التالي" onPress={() => { setStamps(CATEGORY_STAMPS[category]); setStep(3); }}
              disabled={!category} style={{ flex: 2 }} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );

  // Step 3: Reward setup
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <LoadingModal visible={loading} message="جارٍ إنشاء المحل..." />
        <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: C.textMuted }}>الخطوة 3 من 3</Text>
              <Text style={{ fontSize: 13, color: C.primary, fontWeight: '600' }}>إعداد الهدية</Text>
            </View>
            <View style={{ height: 4, backgroundColor: C.border, borderRadius: 99 }}>
              <View style={{ width: '100%', height: '100%', backgroundColor: C.primary, borderRadius: 99 }} />
            </View>
          </View>

          <Text style={{ fontSize: 22, fontWeight: '700', color: C.textPrimary, textAlign: 'center' }}>
            ما هي الهدية؟
          </Text>

          {/* Reward label */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: C.textPrimary, textAlign: 'right' }}>
              نص الهدية
            </Text>
            <TextInput value={rewardLabel} onChangeText={setRewardLabel}
              placeholder="مثال: قهوة مجانية" placeholderTextColor={C.textMuted}
              style={{ borderWidth: 1.5, borderColor: C.border, borderRadius: 14, padding: 16,
                fontSize: 16, color: C.textPrimary, backgroundColor: C.white, textAlign: 'right' }}
              maxLength={60} />
          </View>

          {/* Stamps count */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: C.textPrimary, textAlign: 'right' }}>
              عدد الطوابع المطلوبة: {stamps}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, justifyContent: 'center' }}>
              <TouchableOpacity onPress={() => setStamps(s => Math.max(3, s - 1))}
                style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.border,
                  alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: '700', color: C.textPrimary }}>-</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 40, fontWeight: '900', color: C.primary, width: 60, textAlign: 'center' }}>
                {stamps}
              </Text>
              <TouchableOpacity onPress={() => setStamps(s => Math.min(15, s + 1))}
                style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.primary,
                  alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: '700', color: C.white }}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 12, color: C.textMuted, textAlign: 'center' }}>بين 3 و 15 طابع</Text>
          </View>

          {/* Strategy */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: C.textPrimary, textAlign: 'right' }}>
              قاعدة المنح
            </Text>
            {[
              { key: 'PER_VISIT', label: 'كل زيارة مؤهلة', desc: 'طابع لكل زيارة يؤكدها الكاشير', icon: '🚶' },
              { key: 'MIN_PURCHASE', label: 'شراء بحد أدنى', desc: 'طابع عند شراء فوق مبلغ معين', icon: '💰' },
            ].map(s => (
              <TouchableOpacity key={s.key} onPress={() => setStrategy(s.key)} activeOpacity={0.85}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14,
                  backgroundColor: strategy === s.key ? C.primarySurface : C.white,
                  borderWidth: 1.5, borderColor: strategy === s.key ? C.primary : C.border }}>
                <Text style={{ fontSize: 24 }}>{s.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: C.textPrimary }}>{s.label}</Text>
                  <Text style={{ fontSize: 12, color: C.textSecondary }}>{s.desc}</Text>
                </View>
                {strategy === s.key && <View style={{ width: 20, height: 20, borderRadius: 10,
                  backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.white }} />
                </View>}
              </TouchableOpacity>
            ))}
          </View>

          {strategy === 'MIN_PURCHASE' && (
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: C.textPrimary, textAlign: 'right' }}>
                الحد الأدنى للشراء (دج)
              </Text>
              <TextInput value={minAmount} onChangeText={setMinAmount}
                placeholder="مثال: 500" placeholderTextColor={C.textMuted} keyboardType="number-pad"
                style={{ borderWidth: 1.5, borderColor: C.border, borderRadius: 14, padding: 16,
                  fontSize: 16, color: C.textPrimary, backgroundColor: C.white, textAlign: 'right' }} />
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Btn label="رجوع" onPress={() => setStep(2)} variant="ghost" style={{ flex: 1 }} />
            <Btn label="إنشاء المحل" onPress={handleCreate} loading={loading}
              disabled={!rewardLabel.trim()} style={{ flex: 2 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── SCREEN: QR POSTER ────────────────────────────────────────────────────────
function QRPosterScreen({ navigate }) {
  const merchant = mockMerchant || { name: 'كافيه الأصيل', category: 'CAFE' };
  const program = mockProgram || { rewardLabel: 'قهوة مجانية', requiredStamps: 6 };
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }).start();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20, alignItems: 'center' }}>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 26, fontWeight: '800', color: C.textPrimary }}>محلك جاهز! 🎉</Text>
          <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center' }}>
            علّق هذا الـ QR في محلك وابدأ فوراً
          </Text>
        </View>

        {/* QR Poster */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }], width: '100%' }}>
          <View style={{ backgroundColor: C.primary, borderRadius: 24, padding: 24, alignItems: 'center', gap: 16 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 28 }}>{CATEGORY_ICONS[merchant.category]}</Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: C.white }}>{merchant.name}</Text>
            </View>

            {/* QR Code Mock */}
            <View style={{ backgroundColor: C.white, borderRadius: 16, padding: 16, width: 180, height: 180,
              alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {/* Mock QR pattern */}
              <View style={{ width: 140, height: 140, position: 'relative' }}>
                {[0,1,2,3,4,5,6].map(row => (
                  <View key={row} style={{ flexDirection: 'row', justifyContent: 'center' }}>
                    {[0,1,2,3,4,5,6].map(col => {
                      const isCorner = (row < 2 && col < 2) || (row < 2 && col > 4) || (row > 4 && col < 2);
                      const filled = isCorner || Math.random() > 0.5;
                      return <View key={col} style={{ width: 18, height: 18, margin: 1,
                        backgroundColor: filled ? C.primary : C.white, borderRadius: 2 }} />;
                    })}
                  </View>
                ))}
              </View>
            </View>

            {/* Reward info */}
            <View style={{ backgroundColor: C.accent, borderRadius: 12, padding: 12, width: '100%', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 12, color: C.primary, fontWeight: '600' }}>اجمع {program.requiredStamps} طوابع واحصل على</Text>
              <Text style={{ fontSize: 18, color: C.primary, fontWeight: '800' }}>{program.rewardLabel}</Text>
            </View>

            {/* Zidme brand */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>مدعوم بـ</Text>
              <Text style={{ fontSize: 14, fontWeight: '800', color: C.accent }}>زيدني</Text>
            </View>
          </View>
        </Animated.View>

        {/* Actions */}
        <View style={{ width: '100%', gap: 12 }}>
          <Btn label="الذهاب للوحة التحكم" onPress={() => navigate('Dashboard')} />
          <Btn label="شاشة الكاشير" onPress={() => navigate('CashierQueue')} variant="ghost" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── SCREEN: DASHBOARD ────────────────────────────────────────────────────────
function DashboardScreen({ navigate }) {
  const merchant = mockMerchant || { name: 'كافيه الأصيل', category: 'CAFE' };
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);
  const load = async () => {
    try { setLoading(true); const d = await apiGetDashboard(); setData(d); }
    finally { setLoading(false); }
  };

  const kpis = data ? [
    { label: 'طوابع اليوم', value: data.stampsToday, icon: '🏷️', color: C.primary },
    { label: 'زبائن عائدون', value: data.returningCustomers, icon: '🔄', color: '#2563EB' },
    { label: 'هدايا مستلمة', value: data.rewardsRedeemed, icon: '🎁', color: '#16A34A' },
  ] : [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* Header */}
        <View style={{ backgroundColor: C.primary, borderRadius: 20, padding: 20, gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => navigate('CashierQueue')}
              style={{ backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: C.primary }}>الكاشير</Text>
            </TouchableOpacity>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: C.white }}>{merchant.name}</Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                {CATEGORY_ICONS[merchant.category]} {CATEGORY_NAMES[merchant.category]}
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
            اليوم — {new Date().toLocaleDateString('ar-DZ')}
          </Text>
        </View>

        {/* KPIs */}
        {loading ? (
          <View style={{ alignItems: 'center', padding: 40 }}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {kpis.map((kpi, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: C.white, borderRadius: 16, padding: 14,
                alignItems: 'center', gap: 6, shadowColor: C.primary, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }}>
                <Text style={{ fontSize: 24 }}>{kpi.icon}</Text>
                <Text style={{ fontSize: 28, fontWeight: '900', color: kpi.color }}>{kpi.value}</Text>
                <Text style={{ fontSize: 11, color: C.textSecondary, textAlign: 'center' }}>{kpi.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Activity */}
        {data && (
          <View style={{ backgroundColor: C.white, borderRadius: 16, padding: 16, gap: 12,
            shadowColor: C.primary, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: C.textPrimary, textAlign: 'right' }}>
              آخر النشاطات
            </Text>
            {data.activity.map((item, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12,
                paddingBottom: i < data.activity.length - 1 ? 12 : 0,
                borderBottomWidth: i < data.activity.length - 1 ? 1 : 0, borderBottomColor: C.borderLight }}>
                <Text style={{ fontSize: 22 }}>{item.type === 'stamp' ? '🏷️' : '🎁'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: C.textPrimary, textAlign: 'right' }}>
                    {item.customer}
                  </Text>
                  <Text style={{ fontSize: 12, color: C.textMuted, textAlign: 'right' }}>{item.time}</Text>
                </View>
                <View style={{ backgroundColor: item.type === 'stamp' ? C.primarySurface : C.accentLight,
                  borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 11, color: item.type === 'stamp' ? C.primary : C.accent, fontWeight: '600' }}>
                    {item.type === 'stamp' ? 'طابع' : 'هدية'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <Btn label="عرض QR المحل" onPress={() => navigate('QRPoster')} variant="ghost" />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── SCREEN: CASHIER QUEUE ────────────────────────────────────────────────────
function CashierQueueScreen({ navigate }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); const t = setInterval(load, 3000); return () => clearInterval(t); }, []);

  const load = async () => {
    try { const r = await apiGetPending(); setRequests(r); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ backgroundColor: C.primary, padding: 20, gap: 4 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: C.white, textAlign: 'right' }}>
            شاشة الكاشير
          </Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'right' }}>
            {requests.length > 0 ? `${requests.length} طلب معلق` : 'لا توجد طلبات حالياً'}
          </Text>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
        ) : requests.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40 }}>
            <Text style={{ fontSize: 60 }}>⏳</Text>
            <Text style={{ fontSize: 18, fontWeight: '600', color: C.textPrimary }}>في انتظار الزبائن</Text>
            <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center' }}>
              عندما يطلب زبون طابعاً سيظهر هنا فوراً
            </Text>
            <Btn label="تحديث" onPress={load} variant="ghost" style={{ width: 120 }} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
            {requests.map(req => (
              <TouchableOpacity key={req.id} onPress={() => navigate('CashierConfirm', { reqId: req.id, req, onDone: load })}
                activeOpacity={0.85}
                style={{ backgroundColor: C.white, borderRadius: 16, padding: 20, gap: 12,
                  borderWidth: 2, borderColor: C.accent,
                  shadowColor: C.primary, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ backgroundColor: C.accentLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ fontSize: 12, color: C.accent, fontWeight: '700' }}>جديد</Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: C.textPrimary }}>{req.customer}</Text>
                </View>
                <Text style={{ fontSize: 13, color: C.textMuted, textAlign: 'right' }}>{req.time}</Text>
                <View style={{ backgroundColor: C.primary, borderRadius: 12, padding: 14, alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: C.white }}>اضغط للتأكيد أو الرفض</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── SCREEN: CASHIER CONFIRM ──────────────────────────────────────────────────
function CashierConfirmScreen({ navigate, params }) {
  const req = params?.req || { customer: '05** *** 42', time: 'الآن' };
  const reqId = params?.reqId;
  const program = mockProgram || { rewardLabel: 'قهوة مجانية', requiredStamps: 6, strategy: 'PER_VISIT' };
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null); // 'confirmed' | 'rejected'

  const confirm = async () => {
    try {
      setLoading(true);
      const res = await apiConfirmStamp(reqId);
      setDone('confirmed');
      setTimeout(() => { params?.onDone?.(); navigate('CashierQueue'); }, 2000);
    } finally { setLoading(false); }
  };

  const reject = async () => {
    try {
      setLoading(true);
      await apiRejectStamp(reqId);
      setDone('rejected');
      setTimeout(() => { params?.onDone?.(); navigate('CashierQueue'); }, 1500);
    } finally { setLoading(false); }
  };

  if (done === 'confirmed') return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <Text style={{ fontSize: 80 }}>✅</Text>
      <Text style={{ fontSize: 22, fontWeight: '700', color: '#16A34A' }}>تم منح الطابع</Text>
    </SafeAreaView>
  );

  if (done === 'rejected') return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF5F5', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <Text style={{ fontSize: 80 }}>❌</Text>
      <Text style={{ fontSize: 22, fontWeight: '700', color: C.error }}>تم الرفض</Text>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <LoadingModal visible={loading} message="جارٍ المعالجة..." />
      <View style={{ flex: 1, padding: 24, gap: 20, justifyContent: 'center' }}>

        {/* Customer info */}
        <View style={{ backgroundColor: C.white, borderRadius: 20, padding: 20, gap: 12, alignItems: 'center',
          shadowColor: C.primary, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }}>
          <Text style={{ fontSize: 48 }}>👤</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: C.textPrimary }}>{req.customer}</Text>
          <Text style={{ fontSize: 13, color: C.textMuted }}>{req.time}</Text>
          <View style={{ width: '100%', backgroundColor: C.primarySurface, borderRadius: 12, padding: 14, gap: 4 }}>
            <Text style={{ fontSize: 13, color: C.textSecondary, textAlign: 'center' }}>القاعدة</Text>
            <Text style={{ fontSize: 15, fontWeight: '600', color: C.primary, textAlign: 'center' }}>
              {program.strategy === 'PER_VISIT' ? 'كل زيارة مؤهلة' : `شراء فوق ${program.minAmount} دج`}
            </Text>
          </View>
          <View style={{ width: '100%', backgroundColor: C.accentLight, borderRadius: 12, padding: 14, gap: 4 }}>
            <Text style={{ fontSize: 13, color: C.textSecondary, textAlign: 'center' }}>الهدية</Text>
            <Text style={{ fontSize: 15, fontWeight: '600', color: C.primary, textAlign: 'center' }}>
              {program.rewardLabel}
            </Text>
          </View>
        </View>

        {/* Action buttons */}
        <Btn label="تأكيد الطابع" onPress={confirm} loading={loading} />
        <Btn label="رفض الطلب" onPress={reject} disabled={loading} variant="danger" />

      </View>
    </SafeAreaView>
  );
}

// ─── SCREEN: CUSTOMER ENTRY ───────────────────────────────────────────────────
function CustomerEntryScreen({ navigate }) {
  const merchant = mockMerchant || { name: 'كافيه الأصيل', category: 'CAFE' };
  const program = mockProgram || { rewardLabel: 'قهوة مجانية', requiredStamps: 6 };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 220,
        backgroundColor: C.primary, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 40, gap: 16 }}>
        <View style={{ alignItems: 'center', gap: 4, marginBottom: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: C.white }}>زيدني</Text>
        </View>
        <View style={{ backgroundColor: C.white, borderRadius: 24, padding: 24, alignItems: 'center', gap: 16,
          shadowColor: C.primary, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }}>
          <Text style={{ fontSize: 44 }}>{CATEGORY_ICONS[merchant.category]}</Text>
          <Text style={{ fontSize: 24, fontWeight: '700', color: C.textPrimary }}>{merchant.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.accentLight,
            borderRadius: 99, paddingHorizontal: 16, paddingVertical: 6 }}>
            <Text>🎁</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: C.primary }}>
              اجمع {program.requiredStamps} طوابع واحصل على {program.rewardLabel}
            </Text>
          </View>
        </View>
        <Btn label="عرض بطاقتي" onPress={() => navigate('StampCard')} />
        <Btn label="طلب طابع" onPress={() => navigate('StampCard')} variant="ghost" />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── SCREEN: STAMP CARD ───────────────────────────────────────────────────────
function StampCardScreen({ navigate }) {
  const merchant = mockMerchant || { name: 'كافيه الأصيل', category: 'CAFE' };
  const [stamps, setStamps] = useState(mockStamps);
  const [loading, setLoading] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const required = mockProgram?.requiredStamps || REQUIRED;
  const remaining = required - stamps;

  const requestStamp = async () => {
    try {
      setLoading(true);
      await apiRequestStamp();
      setLoading(false);
      setWaiting(true);
      await new Promise(r => setTimeout(r, 2500));
      mockStamps = Math.min(mockStamps + 1, required);
      setStamps(mockStamps);
      setWaiting(false);
      if (mockStamps >= required) navigate('RewardReady');
      else navigate('StampSuccess', { newStamps: mockStamps });
    } catch (e) { setLoading(false); setWaiting(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <LoadingModal visible={waiting} message="في انتظار تأكيد الكاشير..." />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        <View style={{ backgroundColor: C.primary, borderRadius: 20, padding: 20, alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 32 }}>{CATEGORY_ICONS[merchant.category]}</Text>
          <Text style={{ fontSize: 22, fontWeight: '700', color: C.white }}>{merchant.name}</Text>
        </View>
        <View style={{ backgroundColor: C.white, borderRadius: 20, padding: 24, alignItems: 'center', gap: 16,
          shadowColor: C.primary, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Text style={{ fontSize: 52, fontWeight: '900', color: C.primary }}>{stamps}</Text>
            <Text style={{ fontSize: 26, color: C.textMuted }}>/</Text>
            <Text style={{ fontSize: 26, fontWeight: '500', color: C.textSecondary }}>{required}</Text>
            <Text style={{ fontSize: 14, color: C.textSecondary, marginLeft: 4 }}>طابع</Text>
          </View>
          <StampGrid current={stamps} required={required} category={merchant.category} />
          <View style={{ width: '100%', height: 6, backgroundColor: C.stampEmpty, borderRadius: 99, overflow: 'hidden' }}>
            <View style={{ width: `${(stamps / required) * 100}%`, height: '100%', backgroundColor: C.accent, borderRadius: 99 }} />
          </View>
          <Text style={{ fontSize: 14, fontWeight: '600', color: C.textSecondary }}>
            {remaining === 1 ? 'طابع واحد أخير للهدية!' : `${remaining} طوابع متبقية`}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.accentLight,
          borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.accent }}>
          <Text style={{ fontSize: 26 }}>🎁</Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: C.textPrimary, flex: 1 }}>
            {mockProgram?.rewardLabel || REWARD_LABEL}
          </Text>
        </View>
        <Btn label="اطلب طابعاً" onPress={requestStamp} loading={loading} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── SCREEN: STAMP SUCCESS ────────────────────────────────────────────────────
function StampSuccessScreen({ navigate, params }) {
  const merchant = mockMerchant || { name: 'كافيه الأصيل', category: 'CAFE' };
  const stamps = params?.newStamps || mockStamps;
  const required = mockProgram?.requiredStamps || REQUIRED;
  const remaining = required - stamps;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }).start();
  }, []);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.primary }}>
      <View style={{ flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }], width: 80, height: 80, borderRadius: 40,
          backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 40 }}>✅</Text>
        </Animated.View>
        <Text style={{ fontSize: 26, fontWeight: '700', color: C.white }}>تمت إضافة الطابع</Text>
        <View style={{ backgroundColor: C.white, borderRadius: 20, padding: 24, width: '100%', alignItems: 'center', gap: 16 }}>
          <StampGrid current={stamps} required={required} category={merchant.category} newIndex={stamps - 1} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: C.textSecondary, textAlign: 'center' }}>
            {remaining === 1 ? 'طابع واحد أخير وهديتك جاهزة!' : `${remaining} طوابع متبقية للهدية`}
          </Text>
        </View>
        <Btn label="حسناً" onPress={() => navigate('StampCard')} variant="accent" />
      </View>
    </SafeAreaView>
  );
}

// ─── SCREEN: REWARD READY ─────────────────────────────────────────────────────
function RewardReadyScreen({ navigate }) {
  const merchant = mockMerchant || { name: 'كافيه الأصيل', category: 'CAFE' };
  const [state, setState] = useState('READY');
  const bounceAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(bounceAnim, { toValue: -10, duration: 600, useNativeDriver: true }),
      Animated.timing(bounceAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ])).start();
  }, []);
  const redeem = async () => {
    setState('WAITING');
    await apiRedeemReward();
    setState('DONE');
    setTimeout(() => navigate('StampCard'), 2000);
  };
  if (state === 'DONE') return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <Text style={{ fontSize: 80 }}>🎉</Text>
      <Text style={{ fontSize: 22, fontWeight: '700', color: '#16A34A' }}>استلمت هديتك!</Text>
      <Text style={{ fontSize: 14, color: C.textSecondary }}>تبدأ دورة جديدة الآن</Text>
    </SafeAreaView>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center', gap: 24, paddingTop: 48 }}>
        <Animated.Text style={{ fontSize: 80, transform: [{ translateY: bounceAnim }] }}>🏆</Animated.Text>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 32, fontWeight: '900', color: C.textPrimary }}>مبروك!</Text>
          <Text style={{ fontSize: 16, color: C.textSecondary, textAlign: 'center' }}>
            أكملت جمع الطوابع في{'\n'}
            <Text style={{ fontWeight: '700', color: C.primary }}>{merchant.name}</Text>
          </Text>
        </View>
        <View style={{ backgroundColor: C.primary, borderRadius: 20, width: '100%', overflow: 'hidden' }}>
          <View style={{ backgroundColor: C.accent, paddingVertical: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.primary, textAlign: 'center' }}>هديتك المكتسبة</Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '700', color: C.white, textAlign: 'center', padding: 24 }}>
            {mockProgram?.rewardLabel || REWARD_LABEL}
          </Text>
          {state === 'WAITING' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10,
              backgroundColor: 'rgba(255,255,255,0.1)', margin: 16, marginTop: 0, borderRadius: 12, padding: 14 }}>
              <Text style={{ fontSize: 22 }}>⏳</Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', flex: 1 }}>
                في انتظار تأكيد الكاشير...{'\n'}أظهر هذه الشاشة للموظف
              </Text>
            </View>
          )}
        </View>
        {state === 'READY' && <Btn label="استلم هديتي" onPress={redeem} variant="accent" style={{ width: '100%' }} />}
      </ScrollView>
    </SafeAreaView>
  );
}


// ─── SCREEN: NEARBY MERCHANTS ─────────────────────────────────────────────────
function NearbyScreen({ navigate }) {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(null);
  const [joined, setJoined] = useState({});
  const [locating, setLocating] = useState(true);

  useEffect(() => {
    setTimeout(() => setLocating(false), 1500);
    load();
  }, []);

  const load = async () => {
    try { const r = await apiGetNearby(); setMerchants(r); }
    finally { setLoading(false); }
  };

  const handleJoin = async (merchantId) => {
    try {
      setJoining(merchantId);
      await apiJoinMerchant(merchantId);
      setJoined(prev => ({ ...prev, [merchantId]: true }));
    } finally { setJoining(null); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header */}
      <View style={{ backgroundColor: C.primary, padding: 20, gap: 8 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: C.white, textAlign: 'right' }}>
          محلات قريبة منك
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
          <Text style={{ fontSize: 13, color: locating ? C.accent : '#4ADE80' }}>
            {locating ? 'جارٍ تحديد موقعك...' : 'تم تحديد موقعك'}
          </Text>
          <Text style={{ fontSize: 16 }}>{locating ? '📡' : '📍'}</Text>
        </View>
      </View>

      {/* Map placeholder */}
      <View style={{ height: 140, backgroundColor: '#E8F4EF', alignItems: 'center', justifyContent: 'center',
        borderBottomWidth: 1, borderBottomColor: C.border, position: 'relative', overflow: 'hidden' }}>
        {/* Fake map grid */}
        {[0,1,2,3,4].map(i => (
          <View key={i} style={{ position: 'absolute', left: 0, right: 0, top: i * 28,
            height: 1, backgroundColor: 'rgba(13,61,46,0.08)' }} />
        ))}
        {[0,1,2,3,4,5].map(i => (
          <View key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: i * 60,
            width: 1, backgroundColor: 'rgba(13,61,46,0.08)' }} />
        ))}
        {/* Merchant dots */}
        {[
          { x: 160, y: 60, active: true },
          { x: 80, y: 90, active: false },
          { x: 240, y: 40, active: false },
          { x: 300, y: 100, active: false },
        ].map((dot, i) => (
          <View key={i} style={{ position: 'absolute', left: dot.x, top: dot.y,
            width: dot.active ? 20 : 14, height: dot.active ? 20 : 14,
            borderRadius: dot.active ? 10 : 7,
            backgroundColor: dot.active ? C.accent : C.primary,
            borderWidth: 2, borderColor: C.white,
            shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 }} />
        ))}
        {/* My location */}
        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#3B82F6',
          borderWidth: 3, borderColor: C.white, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 }} />
        {/* Map disabled overlay */}
        <View style={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(13,61,46,0.7)',
          borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ fontSize: 11, color: C.white }}>🗺️ الخريطة الكاملة — قريباً</Text>
        </View>
      </View>

      {/* List */}
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {loading ? (
          <View style={{ alignItems: 'center', padding: 40 }}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={{ marginTop: 12, color: C.textSecondary }}>جارٍ البحث...</Text>
          </View>
        ) : merchants.map(m => {
          const isJoined = m.joined || joined[m.id];
          return (
            <View key={m.id} style={{ backgroundColor: C.white, borderRadius: 18, padding: 16, gap: 12,
              borderWidth: isJoined ? 2 : 1, borderColor: isJoined ? C.primary : C.border,
              shadowColor: C.primary, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {isJoined && (
                    <View style={{ backgroundColor: C.primarySurface, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 11, color: C.primary, fontWeight: '700' }}>منضم</Text>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 12, color: C.textMuted }}>{m.distance}</Text>
                    <Text style={{ fontSize: 14 }}>📍</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: C.textPrimary }}>{m.name}</Text>
                  <Text style={{ fontSize: 28 }}>{CATEGORY_ICONS[m.category]}</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 13, color: C.textSecondary }}>{m.required} طوابع للهدية</Text>
                  <Text style={{ fontSize: 14 }}>🏷️</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 13, color: C.accent, fontWeight: '600' }}>{m.rating}</Text>
                  <Text style={{ fontSize: 14 }}>⭐</Text>
                </View>
              </View>

              {isJoined && (
                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: C.textMuted }}>{m.required} / {m.stamps} طابع</Text>
                    <Text style={{ fontSize: 12, color: C.primary, fontWeight: '600' }}>تقدمك</Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: C.stampEmpty, borderRadius: 99, overflow: 'hidden' }}>
                    <View style={{ width: `${(m.stamps / m.required) * 100}%`, height: '100%',
                      backgroundColor: C.accent, borderRadius: 99 }} />
                  </View>
                </View>
              )}

              {!isJoined ? (
                <TouchableOpacity onPress={() => handleJoin(m.id)}
                  disabled={joining === m.id} activeOpacity={0.85}
                  style={{ backgroundColor: C.primary, borderRadius: 12, padding: 14,
                    alignItems: 'center', opacity: joining === m.id ? 0.6 : 1 }}>
                  {joining === m.id
                    ? <ActivityIndicator color={C.white} />
                    : <Text style={{ fontSize: 15, fontWeight: '700', color: C.white }}>انضم الآن</Text>}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => navigate('StampCard')}
                  style={{ backgroundColor: C.primarySurface, borderRadius: 12, padding: 12, alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: C.primary }}>عرض بطاقتي</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── SCREEN: POINTS WALLET ────────────────────────────────────────────────────
function PointsWalletScreen({ navigate }) {
  const [zidmePoints, setZidmePoints] = useState(myZidmePoints);
  const [merchantPoints] = useState(myMerchantPoints);
  const [showShare, setShowShare] = useState(false);
  const [sharePhone, setSharePhone] = useState('');
  const [shareAmount, setShareAmount] = useState('');
  const [sharing, setSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [referral, setReferral] = useState(null);
  const [loadingRef, setLoadingRef] = useState(false);

  const handleShare = async () => {
    const amount = parseInt(shareAmount);
    if (!sharePhone || !amount || amount > zidmePoints) return;
    try {
      setSharing(true);
      const res = await apiSharePoints(sharePhone, amount);
      myZidmePoints = res.remaining;
      setZidmePoints(res.remaining);
      setShareSuccess(true);
      setSharePhone(''); setShareAmount('');
      setTimeout(() => { setShareSuccess(false); setShowShare(false); }, 2000);
    } finally { setSharing(false); }
  };

  const loadReferral = async () => {
    try {
      setLoadingRef(true);
      const res = await apiGetReferralLink();
      setReferral(res);
    } finally { setLoadingRef(false); }
  };

  useEffect(() => { loadReferral(); }, []);

  const totalMerchantPts = Object.values(merchantPoints).reduce((a, b) => a + b, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>

        {/* Zidme Points Card */}
        <View style={{ backgroundColor: C.primary, borderRadius: 24, padding: 24, gap: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ backgroundColor: 'rgba(245,166,35,0.2)', borderRadius: 12,
              paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: C.accent }}>
              <Text style={{ fontSize: 12, color: C.accent, fontWeight: '700' }}>نقاط Zidme</Text>
            </View>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>محفظتك الرقمية</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>نقطة</Text>
              <Text style={{ fontSize: 56, fontWeight: '900', color: C.accent }}>{zidmePoints}</Text>
            </View>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              تتحول لاحقاً إلى هدايا وخصومات
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={() => setShowShare(true)}
              style={{ flex: 1, backgroundColor: C.accent, borderRadius: 12, padding: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: C.primary }}>مشاركة نقاط</Text>
            </TouchableOpacity>
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12,
              padding: 12, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>استبدال — قريباً</Text>
            </View>
          </View>
        </View>

        {/* Merchant Points */}
        <View style={{ backgroundColor: C.white, borderRadius: 20, padding: 20, gap: 14,
          shadowColor: C.primary, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: C.textSecondary }}>{totalMerchantPts} نقطة إجمالي</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: C.textPrimary }}>نقاط المحلات</Text>
          </View>
          {NEARBY_MERCHANTS.filter(m => merchantPoints[m.id] > 0).map(m => (
            <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12,
              paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.borderLight }}>
              <View style={{ backgroundColor: C.accentLight, borderRadius: 10,
                paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: C.primary }}>
                  {merchantPoints[m.id]}
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: C.textPrimary }}>{m.name}</Text>
                <Text style={{ fontSize: 12, color: C.textMuted }}>{CATEGORY_NAMES[m.category]}</Text>
              </View>
              <Text style={{ fontSize: 24 }}>{CATEGORY_ICONS[m.category]}</Text>
            </View>
          ))}
          {totalMerchantPts === 0 && (
            <Text style={{ fontSize: 14, color: C.textMuted, textAlign: 'center', padding: 12 }}>
              لا توجد نقاط بعد — ابدأ بالتسوق!
            </Text>
          )}
        </View>

        {/* Referral */}
        <View style={{ backgroundColor: C.white, borderRadius: 20, padding: 20, gap: 14,
          shadowColor: C.primary, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 14 }}>🎁</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: C.textPrimary }}>ادعُ أصدقاءك</Text>
          </View>
          <Text style={{ fontSize: 13, color: C.textSecondary, textAlign: 'right', lineHeight: 20 }}>
            شارك رابط الدعوة واحصل على نقاط Zidme عند انضمام كل صديق
          </Text>
          {loadingRef ? <ActivityIndicator color={C.primary} /> : referral && (
            <View style={{ gap: 10 }}>
              <View style={{ backgroundColor: C.primarySurface, borderRadius: 12, padding: 14,
                borderWidth: 1, borderColor: C.border, flexDirection: 'row',
                justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ backgroundColor: C.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 12, color: C.white, fontWeight: '700' }}>نسخ</Text>
                </View>
                <Text style={{ fontSize: 13, color: C.primary, fontWeight: '600', flex: 1, textAlign: 'right', marginHorizontal: 8 }}>
                  {referral.link}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                <View style={{ backgroundColor: C.accentLight, borderRadius: 10,
                  paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: C.primary }}>{referral.code}</Text>
                  <Text style={{ fontSize: 11, color: C.textSecondary }}>كود الدعوة</Text>
                </View>
              </View>
            </View>
          )}
        </View>

      </ScrollView>

      {/* Share Points Modal */}
      <Modal visible={showShare} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16 }}>
            {shareSuccess ? (
              <View style={{ alignItems: 'center', padding: 20, gap: 12 }}>
                <Text style={{ fontSize: 60 }}>✅</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: C.primary }}>تمت المشاركة!</Text>
              </View>
            ) : (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => setShowShare(false)}>
                    <Text style={{ fontSize: 16, color: C.error }}>إلغاء</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: C.textPrimary }}>مشاركة النقاط</Text>
                </View>
                <View style={{ backgroundColor: C.primarySurface, borderRadius: 12, padding: 14, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: C.textSecondary }}>رصيدك المتاح</Text>
                  <Text style={{ fontSize: 32, fontWeight: '900', color: C.primary }}>{zidmePoints} نقطة</Text>
                </View>
                <TextInput value={sharePhone} onChangeText={setSharePhone}
                  placeholder="رقم هاتف المستقبل (0XXXXXXXXX)" placeholderTextColor={C.textMuted}
                  keyboardType="number-pad" maxLength={10}
                  style={{ borderWidth: 1.5, borderColor: C.border, borderRadius: 14, padding: 16,
                    fontSize: 16, color: C.textPrimary, textAlign: 'right' }} />
                <TextInput value={shareAmount} onChangeText={setShareAmount}
                  placeholder="عدد النقاط" placeholderTextColor={C.textMuted}
                  keyboardType="number-pad"
                  style={{ borderWidth: 1.5, borderColor: C.border, borderRadius: 14, padding: 16,
                    fontSize: 16, color: C.textPrimary, textAlign: 'right' }} />
                <Btn label="شارك النقاط" onPress={handleShare} loading={sharing}
                  disabled={!sharePhone || !shareAmount || parseInt(shareAmount) > zidmePoints} />
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── SCREEN: ADD POINTS (Cashier) ─────────────────────────────────────────────
function AddPointsScreen({ navigate }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleAdd = async () => {
    const amt = parseInt(amount);
    if (!amt || amt < 100) return;
    try {
      setLoading(true);
      const res = await apiAddPoints('m1', amt);
      setResult(res);
      setTimeout(() => { setResult(null); setAmount(''); navigate('CashierQueue'); }, 2500);
    } finally { setLoading(false); }
  };

  if (result) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <Text style={{ fontSize: 70 }}>⭐</Text>
      <Text style={{ fontSize: 22, fontWeight: '700', color: '#16A34A' }}>
        +{result.pointsAdded} نقطة
      </Text>
      <Text style={{ fontSize: 15, color: C.textSecondary }}>
        إجمالي الزبون: {result.total} نقطة
      </Text>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 24 }}>
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 56 }}>⭐</Text>
            <Text style={{ fontSize: 22, fontWeight: '700', color: C.textPrimary }}>إضافة نقاط</Text>
            <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center' }}>
              كل 100 دج = 10 نقاط للزبون
            </Text>
          </View>

          <View style={{ backgroundColor: C.white, borderRadius: 20, padding: 20, gap: 16,
            shadowColor: C.primary, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: C.textPrimary, textAlign: 'right' }}>
              مبلغ الشراء (دج)
            </Text>
            <TextInput value={amount} onChangeText={setAmount}
              placeholder="مثال: 1500" placeholderTextColor={C.textMuted}
              keyboardType="number-pad" autoFocus
              style={{ borderWidth: 1.5, borderColor: C.border, borderRadius: 14, padding: 16,
                fontSize: 24, color: C.textPrimary, textAlign: 'center', fontWeight: '700' }} />
            {amount && parseInt(amount) >= 100 && (
              <View style={{ backgroundColor: C.accentLight, borderRadius: 12, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: C.primary }}>
                  = {Math.floor(parseInt(amount) / 100) * 10} نقطة للزبون
                </Text>
              </View>
            )}
          </View>

          <Btn label="منح النقاط" onPress={handleAdd} loading={loading}
            disabled={!amount || parseInt(amount) < 100} />
          <Btn label="رجوع" onPress={() => navigate('CashierQueue')} variant="ghost" />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── NAV BAR ──────────────────────────────────────────────────────────────────
// No global nav bar - each screen navigates naturally

// ─── EXIT MODAL ───────────────────────────────────────────────────────────────
function ExitModal({ visible, role, onClose, onSwitchRole, onLogout }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end' }} onPress={onClose} activeOpacity={1}>
        <View style={{ backgroundColor: C.white, borderTopLeftRadius: 24,
          borderTopRightRadius: 24, padding: 24, gap: 12, paddingBottom: 36 }}>

          {/* Header */}
          <View style={{ alignItems: 'center', marginBottom: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border }} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '700', color: C.textPrimary, textAlign: 'center' }}>
            خيارات الحساب
          </Text>

          {/* Current role indicator */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: 8, backgroundColor: C.primarySurface, borderRadius: 12, padding: 12 }}>
            <Text style={{ fontSize: 20 }}>{role === 'customer' ? '🛍️' : '🏪'}</Text>
            <Text style={{ fontSize: 14, color: C.primary, fontWeight: '600' }}>
              أنت الآن في وضع {role === 'customer' ? 'الزبون' : 'التاجر'}
            </Text>
          </View>

          {/* Switch role */}
          <TouchableOpacity onPress={onSwitchRole} activeOpacity={0.85}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14,
              backgroundColor: C.white, borderRadius: 16, padding: 18,
              borderWidth: 1.5, borderColor: C.border }}>
            <Text style={{ fontSize: 28 }}>{role === 'customer' ? '🏪' : '🛍️'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: C.textPrimary, textAlign: 'right' }}>
                التبديل إلى {role === 'customer' ? 'وضع التاجر' : 'وضع الزبون'}
              </Text>
              <Text style={{ fontSize: 13, color: C.textMuted, textAlign: 'right' }}>
                نفس الحساب — دور مختلف
              </Text>
            </View>
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity onPress={onLogout} activeOpacity={0.85}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14,
              backgroundColor: '#FFF5F5', borderRadius: 16, padding: 18,
              borderWidth: 1.5, borderColor: '#FEE2E2' }}>
            <Text style={{ fontSize: 28 }}>🚪</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: C.error, textAlign: 'right' }}>
                تسجيل الخروج
              </Text>
              <Text style={{ fontSize: 13, color: C.textMuted, textAlign: 'right' }}>
                العودة لشاشة الدخول
              </Text>
            </View>
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}
            style={{ padding: 14, alignItems: 'center' }}>
            <Text style={{ fontSize: 15, color: C.textMuted, fontWeight: '600' }}>إلغاء</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── CUSTOMER TAB BAR ─────────────────────────────────────────────────────────
function CustomerTabBar({ active, navigate, onMenuPress }) {
  const tabs = [
    { label: 'محلات', screen: 'Nearby', icon: '📍' },
    { label: 'طوابعي', screen: 'StampCard', icon: '🏷️' },
    { label: 'نقاطي', screen: 'PointsWallet', icon: '⭐' },
  ];
  return (
    <View style={{ flexDirection: 'row', backgroundColor: C.white,
      borderTopWidth: 1, borderTopColor: C.border,
      paddingBottom: 20, paddingTop: 8 }}>
      {tabs.map(({ label, screen, icon }) => (
        <TouchableOpacity key={screen} onPress={() => navigate(screen)}
          style={{ flex: 1, alignItems: 'center', gap: 4 }} activeOpacity={0.7}>
          <Text style={{ fontSize: 26 }}>{icon}</Text>
          <Text style={{ fontSize: 12, fontWeight: active === screen ? '700' : '400',
            color: active === screen ? C.primary : C.textMuted }}>{label}</Text>
          {active === screen && (
            <View style={{ width: 20, height: 3, borderRadius: 2, backgroundColor: C.primary }} />
          )}
        </TouchableOpacity>
      ))}
      {/* Account button */}
      <TouchableOpacity onPress={onMenuPress}
        style={{ flex: 1, alignItems: 'center', gap: 4 }} activeOpacity={0.7}>
        <Text style={{ fontSize: 26 }}>👤</Text>
        <Text style={{ fontSize: 12, color: C.textMuted }}>حسابي</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── MERCHANT TAB BAR ─────────────────────────────────────────────────────────
function MerchantTabBar({ active, navigate, onMenuPress }) {
  const tabs = [
    { label: 'لوحة التحكم', screen: 'Dashboard', icon: '📊' },
    { label: 'الكاشير', screen: 'CashierQueue', icon: '⚡' },
    { label: 'نقاط+', screen: 'AddPoints', icon: '💰' },
  ];
  return (
    <View style={{ flexDirection: 'row', backgroundColor: C.white,
      borderTopWidth: 1, borderTopColor: C.border,
      paddingBottom: 20, paddingTop: 8 }}>
      {tabs.map(({ label, screen, icon }) => (
        <TouchableOpacity key={screen} onPress={() => navigate(screen)}
          style={{ flex: 1, alignItems: 'center', gap: 4 }} activeOpacity={0.7}>
          <Text style={{ fontSize: 26 }}>{icon}</Text>
          <Text style={{ fontSize: 11, fontWeight: active === screen ? '700' : '400',
            color: active === screen ? C.primary : C.textMuted, textAlign: 'center' }}>{label}</Text>
          {active === screen && (
            <View style={{ width: 20, height: 3, borderRadius: 2, backgroundColor: C.primary }} />
          )}
        </TouchableOpacity>
      ))}
      {/* Account button */}
      <TouchableOpacity onPress={onMenuPress}
        style={{ flex: 1, alignItems: 'center', gap: 4 }} activeOpacity={0.7}>
        <Text style={{ fontSize: 26 }}>👤</Text>
        <Text style={{ fontSize: 11, color: C.textMuted, textAlign: 'center' }}>حسابي</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
const CUSTOMER_SCREENS = ['Nearby', 'StampCard', 'PointsWallet', 'CustomerEntry', 'StampSuccess', 'RewardReady'];
const MERCHANT_SCREENS = ['Dashboard', 'CashierQueue', 'AddPoints', 'QRPoster', 'CashierConfirm'];
const AUTH_SCREENS = ['PhoneLogin', 'OTP', 'RoleSelect'];

export default function App() {
  const [screen, setScreen] = useState('PhoneLogin');
  const [params, setParams] = useState({});
  const [role, setRole] = useState(null);
  const [showExitModal, setShowExitModal] = useState(false);

  const navigate = (name, p = {}) => {
    if (name === 'RoleSelect') setRole(null);
    if (CUSTOMER_SCREENS.includes(name)) setRole('customer');
    if (MERCHANT_SCREENS.includes(name) || name === 'MerchantSetup') setRole('merchant');
    setScreen(name);
    setParams(p);
  };

  const handleSwitchRole = () => {
    setShowExitModal(false);
    setTimeout(() => navigate('RoleSelect'), 300);
  };

  const handleLogout = () => {
    setShowExitModal(false);
    setRole(null);
    setTimeout(() => navigate('PhoneLogin'), 300);
  };

  const showCustomerTab = role === 'customer' && CUSTOMER_SCREENS.includes(screen);
  const showMerchantTab = role === 'merchant' && MERCHANT_SCREENS.includes(screen);

  const screens = {
    PhoneLogin: <PhoneLoginScreen navigate={navigate} params={params} />,
    OTP: <OTPScreen navigate={navigate} params={params} />,
    RoleSelect: <RoleSelectScreen navigate={navigate} params={params} />,
    MerchantSetup: <MerchantSetupScreen navigate={navigate} params={params} />,
    QRPoster: <QRPosterScreen navigate={navigate} params={params} />,
    Dashboard: <DashboardScreen navigate={navigate} params={params} />,
    CashierQueue: <CashierQueueScreen navigate={navigate} params={params} />,
    CashierConfirm: <CashierConfirmScreen navigate={navigate} params={params} />,
    CustomerEntry: <CustomerEntryScreen navigate={navigate} params={params} />,
    Nearby: <NearbyScreen navigate={navigate} params={params} />,
    PointsWallet: <PointsWalletScreen navigate={navigate} params={params} />,
    AddPoints: <AddPointsScreen navigate={navigate} params={params} />,
    StampCard: <StampCardScreen navigate={navigate} params={params} />,
    StampSuccess: <StampSuccessScreen navigate={navigate} params={params} />,
    RewardReady: <RewardReadyScreen navigate={navigate} params={params} />,
  };

  return (
    <View style={{ flex: 1 }}>
      {screens[screen] || screens['PhoneLogin']}
      {showCustomerTab && (
        <CustomerTabBar active={screen} navigate={navigate}
          onMenuPress={() => setShowExitModal(true)} />
      )}
      {showMerchantTab && (
        <MerchantTabBar active={screen} navigate={navigate}
          onMenuPress={() => setShowExitModal(true)} />
      )}
      <ExitModal
        visible={showExitModal}
        role={role}
        onClose={() => setShowExitModal(false)}
        onSwitchRole={handleSwitchRole}
        onLogout={handleLogout}
      />
    </View>
  );
}
