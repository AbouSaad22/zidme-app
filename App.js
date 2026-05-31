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
async function apiConvertPointsToStamp(merchantId, pointsPerStamp) {
  await delay(700);
  const available = myMerchantPoints[merchantId] || 0;
  if (available < pointsPerStamp) throw { message: 'نقاط غير كافية' };
  const stampsToAdd = Math.floor(available / pointsPerStamp);
  const remainder = available % pointsPerStamp;
  myMerchantPoints[merchantId] = remainder;
  mockStamps = Math.min(mockStamps + stampsToAdd, REQUIRED);
  return { stampsAdded: stampsToAdd, remainingPoints: remainder, newTotal: mockStamps };
}

// Mock user profile
let mockProfile = {
  name: '',
  age: '',
  gender: null, // 'male' | 'female'
  address: '',
  avatar: null,
  completionPoints: 0,
  completedFields: [],
};

const PROFILE_REWARDS = {
  name: { points: 20, label: 'إضافة الاسم' },
  age: { points: 10, label: 'إضافة العمر' },
  gender: { points: 10, label: 'تحديد الجنس' },
  address: { points: 30, label: 'إضافة العنوان' },
};

async function apiSaveProfile(data) {
  await delay(700);
  let newPoints = 0;
  const newFields = [];
  Object.keys(PROFILE_REWARDS).forEach(field => {
    if (data[field] && !mockProfile.completedFields.includes(field)) {
      newPoints += PROFILE_REWARDS[field].points;
      newFields.push(field);
    }
  });
  mockProfile = { ...mockProfile, ...data,
    completionPoints: mockProfile.completionPoints + newPoints,
    completedFields: [...mockProfile.completedFields, ...newFields] };
  if (newPoints > 0) myZidmePoints += newPoints;
  return { profile: mockProfile, pointsEarned: newPoints, newFields };
}

async function apiGetProfile() {
  await delay(400);
  return mockProfile;
}

// QR Token registry - maps token to merchant
const QR_REGISTRY = {
  'QR-CAFE-001': { merchantId: 'm1', name: 'كافيه الأصيل', category: 'CAFE', required: 6, rewardLabel: 'قهوة مجانية', strategy: 'PER_VISIT', pointsPerStamp: 50 },
  'QR-PIZZA-001': { merchantId: 'm2', name: 'بيتزا زيدني', category: 'PIZZERIA', required: 8, rewardLabel: 'بيتزا مجانية', strategy: 'MIN_PURCHASE', pointsPerStamp: 80 },
  'QR-FF-001': { merchantId: 'm3', name: 'فاست فود برو', category: 'FAST_FOOD', required: 5, rewardLabel: 'وجبة مجانية', strategy: 'MIN_PURCHASE', pointsPerStamp: 40 },
  'QR-CAFE-002': { merchantId: 'm4', name: 'مقهى النجوم', category: 'CAFE', required: 6, rewardLabel: 'مشروب مجاني', strategy: 'PER_VISIT', pointsPerStamp: 50 },
};

// Customer QR tokens (for cashier to scan)
const CUSTOMER_QR = { 'CUS-ABD-001': { customerId: 'cus-001', name: 'عبد الرحمن', phone: '0555123456' } };

async function apiScanMerchantQR(token) {
  await delay(600);
  const merchant = QR_REGISTRY[token];
  if (!merchant) throw { message: 'رمز QR غير صالح' };
  const currentStamps = mockStamps;
  const currentPoints = myMerchantPoints[merchant.merchantId] || 0;
  return { merchant, currentStamps, currentPoints };
}

async function apiAddStampViaQR(merchantId) {
  await delay(800);
  mockStamps = Math.min(mockStamps + 1, REQUIRED);
  const pts = 10;
  myMerchantPoints[merchantId] = (myMerchantPoints[merchantId] || 0) + pts;
  return { stampsAdded: 1, pointsAdded: pts, currentStamps: mockStamps, rewardReady: mockStamps >= REQUIRED };
}

async function apiScanCustomerQR(token, merchantId) {
  await delay(600);
  const customer = CUSTOMER_QR[token];
  if (!customer) throw { message: 'رمز QR الزبون غير صالح' };
  return { customer, merchantId };
}

// Pending purchase confirmations (cashier queue)
let pendingPurchases = [];

async function apiSubmitPurchase(merchantId, amount, pointsPerStamp) {
  await delay(600);
  const pointsEarned = Math.floor(amount / 100) * 10;
  const stampsToAdd = Math.floor(pointsEarned / pointsPerStamp);
  const remainder = pointsEarned % pointsPerStamp;
  const req = {
    id: `pur-${Date.now()}`,
    merchantId,
    customerId: 'cus-001',
    customerName: 'عبد الرحمن',
    amount,
    pointsEarned,
    stampsToAdd,
    remainder,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };
  pendingPurchases = [req, ...pendingPurchases];
  return req;
}

async function apiGetPendingPurchases() {
  await delay(400);
  return pendingPurchases.filter(p => p.status === 'PENDING');
}

async function apiConfirmPurchase(reqId) {
  await delay(700);
  const req = pendingPurchases.find(p => p.id === reqId);
  if (!req) throw { message: 'طلب غير موجود' };
  pendingPurchases = pendingPurchases.map(p =>
    p.id === reqId ? { ...p, status: 'CONFIRMED' } : p
  );
  // Apply stamps and points
  mockStamps = Math.min(mockStamps + req.stampsToAdd, REQUIRED);
  myMerchantPoints[req.merchantId] = (myMerchantPoints[req.merchantId] || 0) + req.remainder;
  return { ...req, status: 'CONFIRMED', newStamps: mockStamps };
}

async function apiRejectPurchase(reqId) {
  await delay(400);
  pendingPurchases = pendingPurchases.map(p =>
    p.id === reqId ? { ...p, status: 'REJECTED' } : p
  );
  return { status: 'REJECTED' };
}

// Mock customers for merchant
const MOCK_CUSTOMERS = [
  { id: 'c1', name: 'أحمد بن علي', phone: '0551234567', points: 240, stamps: 3, lastVisit: 'منذ يومين' },
  { id: 'c2', name: 'فاطمة زهراء', phone: '0661234567', points: 80, stamps: 1, lastVisit: 'منذ أسبوع' },
  { id: 'c3', name: 'محمد أمين', phone: '0771234567', points: 150, stamps: 5, lastVisit: 'اليوم' },
  { id: 'c4', name: 'خديجة بوعلي', phone: '0551239999', points: 0, stamps: 2, lastVisit: 'منذ 3 أيام' },
];
let customerPointsFromMerchant = { c1: 240, c2: 80, c3: 150, c4: 0 };

async function apiGetCustomers(search = '') {
  await delay(500);
  if (!search) return MOCK_CUSTOMERS;
  return MOCK_CUSTOMERS.filter(c =>
    c.name.includes(search) || c.phone.includes(search)
  );
}
async function apiGiftPoints(customerId, amount) {
  await delay(700);
  customerPointsFromMerchant[customerId] = (customerPointsFromMerchant[customerId] || 0) + amount;
  return { success: true, newTotal: customerPointsFromMerchant[customerId] };
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
      navigate('NameSetup');
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

// ─── SCREEN: NAME SETUP (after OTP) ─────────────────────────────────────────
function NameSetupScreen({ navigate }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!name.trim()) return;
    try {
      setLoading(true);
      await apiSaveProfile({ name: name.trim() });
      navigate('RoleSelect');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 32 }}>

          <View style={{ alignItems: 'center', gap: 12 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: C.primarySurface,
              alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border }}>
              <Text style={{ fontSize: 40 }}>👋</Text>
            </View>
            <Text style={{ fontSize: 24, fontWeight: '800', color: C.textPrimary, textAlign: 'center' }}>
              أهلاً! ما اسمك؟
            </Text>
            <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center' }}>
              سيظهر اسمك في بطاقاتك ومعاملاتك
            </Text>
          </View>

          <View style={{ gap: 12 }}>
            <TextInput value={name} onChangeText={setName}
              placeholder="أدخل اسمك الكامل" placeholderTextColor={C.textMuted}
              autoFocus maxLength={40}
              style={{ borderWidth: 2, borderColor: name ? C.primary : C.border,
                borderRadius: 16, padding: 18, fontSize: 20, color: C.textPrimary,
                backgroundColor: C.white, textAlign: 'right',
                shadowColor: C.primary, shadowOpacity: name ? 0.1 : 0, shadowRadius: 6, elevation: name ? 2 : 0 }} />
            <Btn label="متابعة" onPress={handleContinue} loading={loading} disabled={!name.trim()} />
          </View>

          <TouchableOpacity onPress={() => navigate('RoleSelect')} style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: C.textMuted, textDecorationLine: 'underline' }}>
              تخطي الآن
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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

// ─── SCREEN: MERCHANT SETUP (Single Page) ────────────────────────────────────
function MerchantSetupScreen({ navigate }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(null);
  const [rewardLabel, setRewardLabel] = useState('');
  const [stamps, setStamps] = useState(6);
  const [strategy, setStrategy] = useState('PER_VISIT');
  const [minAmount, setMinAmount] = useState('');
  const [pointsPerStamp, setPointsPerStamp] = useState(50);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!name.trim() || name.trim().length < 2) e.name = 'أدخل اسم المحل';
    if (!category) e.category = 'اختر صنف المحل';
    if (!rewardLabel.trim()) e.reward = 'أدخل نص الهدية';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      await apiCreateMerchant(name, category);
      await apiCreateProgram(rewardLabel, stamps, strategy, minAmount ? parseInt(minAmount) : null);
      navigate('QRPoster');
    } catch (e) { }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <LoadingModal visible={loading} message="جارٍ إنشاء المحل..." />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={{ backgroundColor: C.primary, borderRadius: 20, padding: 20, alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 28 }}>🏪</Text>
          <Text style={{ fontSize: 22, fontWeight: '800', color: C.white }}>إنشاء محلك</Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>أملأ المعلومات وابدأ في دقائق</Text>
        </View>

        {/* Section 1: Store Info */}
        <View style={{ backgroundColor: C.white, borderRadius: 18, padding: 18, gap: 14,
          shadowColor: C.primary, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: C.textPrimary, textAlign: 'right' }}>
            معلومات المحل
          </Text>

          {/* Name */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, color: C.textSecondary, textAlign: 'right' }}>اسم المحل *</Text>
            <TextInput value={name} onChangeText={t => { setName(t); setErrors(e => ({...e, name: null})); }}
              placeholder="مثال: كافيه الأصيل" placeholderTextColor={C.textMuted} maxLength={40}
              style={{ borderWidth: 1.5, borderColor: errors.name ? C.error : C.border,
                borderRadius: 12, padding: 14, fontSize: 16, color: C.textPrimary,
                backgroundColor: C.background, textAlign: 'right' }} />
            {errors.name && <Text style={{ fontSize: 12, color: C.error, textAlign: 'right' }}>{errors.name}</Text>}
          </View>

          {/* Category */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 13, color: C.textSecondary, textAlign: 'right' }}>صنف المحل *</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {Object.entries(CATEGORY_ICONS).map(([key, icon]) => (
                <TouchableOpacity key={key} onPress={() => { setCategory(key); setStamps(CATEGORY_STAMPS[key]); setErrors(e => ({...e, category: null})); }}
                  style={{ flex: 1, alignItems: 'center', padding: 12, borderRadius: 14,
                    backgroundColor: category === key ? C.primary : C.background,
                    borderWidth: 2, borderColor: category === key ? C.primary : C.border }}>
                  <Text style={{ fontSize: 28 }}>{icon}</Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', marginTop: 4,
                    color: category === key ? C.white : C.textSecondary }}>{CATEGORY_NAMES[key]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.category && <Text style={{ fontSize: 12, color: C.error, textAlign: 'right' }}>{errors.category}</Text>}
          </View>
        </View>

        {/* Section 2: Reward */}
        <View style={{ backgroundColor: C.white, borderRadius: 18, padding: 18, gap: 14,
          shadowColor: C.primary, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: C.textPrimary, textAlign: 'right' }}>
            برنامج الولاء
          </Text>

          {/* Reward label */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, color: C.textSecondary, textAlign: 'right' }}>الهدية *</Text>
            <TextInput value={rewardLabel} onChangeText={t => { setRewardLabel(t); setErrors(e => ({...e, reward: null})); }}
              placeholder="مثال: قهوة مجانية" placeholderTextColor={C.textMuted} maxLength={60}
              style={{ borderWidth: 1.5, borderColor: errors.reward ? C.error : C.border,
                borderRadius: 12, padding: 14, fontSize: 16, color: C.textPrimary,
                backgroundColor: C.background, textAlign: 'right' }} />
            {errors.reward && <Text style={{ fontSize: 12, color: C.error, textAlign: 'right' }}>{errors.reward}</Text>}
          </View>

          {/* Stamps count */}
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: C.textMuted }}>بين 3 و 15</Text>
              <Text style={{ fontSize: 13, color: C.textSecondary }}>عدد الطوابع المطلوبة</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, justifyContent: 'center',
              backgroundColor: C.background, borderRadius: 12, padding: 12 }}>
              <TouchableOpacity onPress={() => setStamps(s => Math.max(3, s - 1))}
                style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.border,
                  alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: '700', color: C.textPrimary }}>-</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 40, fontWeight: '900', color: C.primary, width: 60, textAlign: 'center' }}>{stamps}</Text>
              <TouchableOpacity onPress={() => setStamps(s => Math.min(15, s + 1))}
                style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.primary,
                  alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: '700', color: C.white }}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Strategy */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 13, color: C.textSecondary, textAlign: 'right' }}>قاعدة منح الطابع</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { key: 'PER_VISIT', label: 'كل زيارة', icon: '🚶' },
                { key: 'MIN_PURCHASE', label: 'حد أدنى', icon: '💰' },
              ].map(s => (
                <TouchableOpacity key={s.key} onPress={() => setStrategy(s.key)}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14,
                    borderRadius: 12, backgroundColor: strategy === s.key ? C.primarySurface : C.background,
                    borderWidth: 1.5, borderColor: strategy === s.key ? C.primary : C.border }}>
                  <Text style={{ fontSize: 20 }}>{s.icon}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600',
                    color: strategy === s.key ? C.primary : C.textSecondary }}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {strategy === 'MIN_PURCHASE' && (
            <TextInput value={minAmount} onChangeText={setMinAmount}
              placeholder="الحد الأدنى للشراء بالدج" placeholderTextColor={C.textMuted} keyboardType="number-pad"
              style={{ borderWidth: 1.5, borderColor: C.border, borderRadius: 12, padding: 14,
                fontSize: 16, color: C.textPrimary, backgroundColor: C.background, textAlign: 'right' }} />
          )}
        </View>

        {/* Section 3: Points */}
        <View style={{ backgroundColor: C.white, borderRadius: 18, padding: 18, gap: 14,
          shadowColor: C.primary, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: C.textPrimary, textAlign: 'right' }}>
            نظام النقاط
          </Text>
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: C.textMuted }}>{pointsPerStamp} نقطة = طابع واحد</Text>
              <Text style={{ fontSize: 13, color: C.textSecondary }}>معدل تحويل النقاط</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'center',
              backgroundColor: C.background, borderRadius: 12, padding: 12 }}>
              <TouchableOpacity onPress={() => setPointsPerStamp(p => Math.max(10, p - 10))}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.border,
                  alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '700' }}>-</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 34, fontWeight: '900', color: C.primary, width: 70, textAlign: 'center' }}>
                {pointsPerStamp}
              </Text>
              <TouchableOpacity onPress={() => setPointsPerStamp(p => Math.min(500, p + 10))}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.primary,
                  alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: C.white }}>+</Text>
              </TouchableOpacity>
            </View>
            <View style={{ backgroundColor: C.accentLight, borderRadius: 10, padding: 10 }}>
              <Text style={{ fontSize: 12, color: C.primary, textAlign: 'center' }}>
                الزبون يحول نقاطه إلى طوابع — الباقي يُحفظ تلقائياً
              </Text>
            </View>
          </View>
        </View>

        {/* Preview */}
        {name && category && rewardLabel && (
          <View style={{ backgroundColor: C.primary, borderRadius: 18, padding: 18, gap: 10 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textAlign: 'right' }}>
              معاينة البطاقة
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: C.primary }}>{stamps} طوابع</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: C.white }}>{name}</Text>
                <Text style={{ fontSize: 26 }}>{CATEGORY_ICONS[category]}</Text>
              </View>
            </View>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 10,
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: C.accent }}>{rewardLabel}</Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>الهدية</Text>
            </View>
          </View>
        )}

        <Btn label="إنشاء المحل" onPress={handleCreate} loading={loading}
          disabled={!name || !category || !rewardLabel} />

      </ScrollView>
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

// ─── COMPONENT: PURCHASE CONFIRM CARD ───────────────────────────────────────
function PurchaseConfirmCard({ purchase, onDone }) {
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    try {
      setLoading(true);
      await apiConfirmPurchase(purchase.id);
      setStatus('confirmed');
      setTimeout(onDone, 1500);
    } finally { setLoading(false); }
  };

  const reject = async () => {
    try {
      setLoading(true);
      await apiRejectPurchase(purchase.id);
      setStatus('rejected');
      setTimeout(onDone, 1000);
    } finally { setLoading(false); }
  };

  if (status === 'confirmed') return (
    <View style={{ backgroundColor: '#F0FDF4', borderRadius: 16, padding: 16,
      flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: '#86EFAC' }}>
      <Text style={{ fontSize: 28 }}>✅</Text>
      <Text style={{ fontSize: 15, fontWeight: '700', color: '#16A34A' }}>تم تأكيد المبلغ!</Text>
    </View>
  );

  if (status === 'rejected') return (
    <View style={{ backgroundColor: '#FFF5F5', borderRadius: 16, padding: 16,
      flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: '#FEE2E2' }}>
      <Text style={{ fontSize: 28 }}>❌</Text>
      <Text style={{ fontSize: 15, fontWeight: '700', color: C.error }}>تم الرفض</Text>
    </View>
  );

  return (
    <View style={{ backgroundColor: C.white, borderRadius: 18, padding: 18, gap: 14,
      borderWidth: 2, borderColor: C.primary,
      shadowColor: C.primary, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 }}>

      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ backgroundColor: C.primarySurface, borderRadius: 8,
          paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ fontSize: 12, color: C.primary, fontWeight: '700' }}>تأكيد مبلغ شراء</Text>
        </View>
        <Text style={{ fontSize: 16, fontWeight: '700', color: C.textPrimary }}>
          {purchase.customerName}
        </Text>
      </View>

      {/* Amount breakdown */}
      <View style={{ backgroundColor: C.background, borderRadius: 14, padding: 14, gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 22, fontWeight: '900', color: C.primary }}>{purchase.amount} دج</Text>
          <Text style={{ fontSize: 14, color: C.textSecondary }}>مبلغ الشراء</Text>
        </View>
        <View style={{ height: 1, backgroundColor: C.border }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: C.primary }}>
            {purchase.stampsToAdd > 0 ? `+${purchase.stampsToAdd} طابع` : ''}
            {purchase.remainder > 0 ? `  +${purchase.remainder} نقطة` : ''}
          </Text>
          <Text style={{ fontSize: 13, color: C.textSecondary }}>سيحصل على</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity onPress={reject} disabled={loading}
          style={{ flex: 1, backgroundColor: '#FFF5F5', borderRadius: 14, padding: 16,
            alignItems: 'center', borderWidth: 1.5, borderColor: '#FEE2E2' }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: C.error }}>رفض</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={confirm} disabled={loading}
          style={{ flex: 2, backgroundColor: C.primary, borderRadius: 14, padding: 16, alignItems: 'center' }}>
          {loading ? <ActivityIndicator color={C.white} />
            : <Text style={{ fontSize: 15, fontWeight: '700', color: C.white }}>تأكيد المبلغ</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── SCREEN: CASHIER QUEUE ────────────────────────────────────────────────────
function CashierQueueScreen({ navigate }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [purchases, setPurchases] = useState([]);
  useEffect(() => { load(); const t = setInterval(load, 3000); return () => clearInterval(t); }, []);

  const load = async () => {
    try {
      const [r, p] = await Promise.all([apiGetPending(), apiGetPendingPurchases()]);
      setRequests(r);
      setPurchases(p);
    } finally { setLoading(false); }
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
        ) : requests.length === 0 && purchases.length === 0 ? (
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
            {/* Purchase confirmation requests */}
            {purchases.map(pur => (
              <PurchaseConfirmCard key={pur.id} purchase={pur} onDone={load} />
            ))}
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
function StampCardScreen({ navigate, params }) {
  const merchant = params?.merchant || mockMerchant || { name: 'كافيه الأصيل', category: 'CAFE' };
  const category = merchant.category || 'CAFE';
  const merchantStamps = params?.merchant ? (params.merchant.stamps || 0) : mockStamps;
  const [stamps, setStamps] = useState(merchantStamps);
  const [loading, setLoading] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const required = params?.merchant?.required || mockProgram?.requiredStamps || REQUIRED;
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
          <StampGrid current={stamps} required={required} category={category} />
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
            {params?.merchant ? `هدية من ${merchant.name}` : (mockProgram?.rewardLabel || REWARD_LABEL)}
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


// ─── COMPONENT: MIN PURCHASE FLOW ───────────────────────────────────────────
function MinPurchaseFlow({ merchant, adding, onSent }) {
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState('input'); // input | waiting | confirmed | rejected
  const [reqData, setReqData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const pointsPerStamp = merchant?.pointsPerStamp || 50;
  const amt = parseInt(amount) || 0;
  const pointsEarned = Math.floor(amt / 100) * 10;
  const stampsFromPoints = Math.floor(pointsEarned / pointsPerStamp);
  const remainder = pointsEarned % pointsPerStamp;

  useEffect(() => {
    if (step === 'waiting') {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])).start();
      // Simulate cashier confirming after 4 seconds
      setTimeout(async () => {
        if (reqData) {
          const res = await apiConfirmPurchase(reqData.id);
          setStep('confirmed');
          setReqData(res);
          onSent && onSent();
        }
      }, 4000);
    }
  }, [step]);

  const handleSubmit = async () => {
    if (amt < 100) return;
    try {
      setSubmitting(true);
      const req = await apiSubmitPurchase(merchant?.merchantId || 'm1', amt, pointsPerStamp);
      setReqData(req);
      setStep('waiting');
    } finally { setSubmitting(false); }
  };

  if (step === 'confirmed') return (
    <View style={{ backgroundColor: '#F0FDF4', borderRadius: 16, padding: 20, gap: 12,
      alignItems: 'center', borderWidth: 1.5, borderColor: '#86EFAC' }}>
      <Text style={{ fontSize: 48 }}>✅</Text>
      <Text style={{ fontSize: 18, fontWeight: '800', color: '#16A34A' }}>تم تأكيد الكاشير!</Text>
      <View style={{ gap: 6, width: '100%' }}>
        {reqData?.stampsToAdd > 0 && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between',
            backgroundColor: C.primarySurface, borderRadius: 10, padding: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: C.primary }}>+{reqData.stampsToAdd} طابع</Text>
            <Text style={{ fontSize: 14, color: C.textSecondary }}>تمت الإضافة</Text>
          </View>
        )}
        {reqData?.remainder > 0 && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between',
            backgroundColor: C.accentLight, borderRadius: 10, padding: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: C.primary }}>{reqData.remainder} نقطة محفوظة</Text>
            <Text style={{ fontSize: 14, color: C.textSecondary }}>للطابع القادم</Text>
          </View>
        )}
      </View>
    </View>
  );

  if (step === 'waiting') return (
    <View style={{ gap: 12 }}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }],
        backgroundColor: C.primary, borderRadius: 16, padding: 20, alignItems: 'center', gap: 12 }}>
        <Text style={{ fontSize: 36 }}>⏳</Text>
        <Text style={{ fontSize: 16, fontWeight: '700', color: C.white }}>في انتظار تأكيد الكاشير</Text>
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>
          أظهر هذه الشاشة للموظف
        </Text>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 14,
          width: '100%', gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: C.accent }}>{reqData?.amount} دج</Text>
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>مبلغ الشراء</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 14, color: C.accent }}>{reqData?.stampsToAdd} طابع + {reqData?.remainder} نقطة</Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>ستُضاف بعد التأكيد</Text>
          </View>
        </View>
      </Animated.View>
      <ActivityIndicator color={C.primary} size="large" />
    </View>
  );

  // Input step
  return (
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={{ gap: 10, paddingBottom: 100 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: C.textPrimary, textAlign: 'right' }}>
          أدخل مبلغ الشراء (دج)
        </Text>

        {/* Quick amounts */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[500, 1000, 1500, 2000].map(n => (
            <TouchableOpacity key={n} onPress={() => setAmount(String(n))}
              style={{ flex: 1, backgroundColor: amount === String(n) ? C.primary : C.background,
                borderRadius: 10, padding: 12, alignItems: 'center',
                borderWidth: 1.5, borderColor: amount === String(n) ? C.primary : C.border }}>
              <Text style={{ fontSize: 14, fontWeight: '700',
                color: amount === String(n) ? C.white : C.textSecondary }}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput value={amount} onChangeText={setAmount}
          placeholder="أو أدخل مبلغاً مخصصاً" placeholderTextColor={C.textMuted}
          keyboardType="number-pad" autoFocus
          style={{ borderWidth: 2, borderColor: amt >= 100 ? C.primary : C.border,
            borderRadius: 14, padding: 16, fontSize: 22, color: C.textPrimary,
            textAlign: 'center', fontWeight: '700', backgroundColor: C.background }} />

        {/* Live preview */}
        {amt >= 100 && (
          <View style={{ backgroundColor: C.primarySurface, borderRadius: 14, padding: 14, gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, color: C.textSecondary }}>{pointsEarned} نقطة</Text>
              <Text style={{ fontSize: 14, color: C.textSecondary }}>ستكسب</Text>
            </View>
            <View style={{ height: 1, backgroundColor: C.border }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                {stampsFromPoints > 0 && (
                  <View style={{ backgroundColor: C.primary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: C.white }}>+{stampsFromPoints} طابع</Text>
                  </View>
                )}
                {remainder > 0 && (
                  <View style={{ backgroundColor: C.accentLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: C.primary }}>{remainder} نقطة محفوظة</Text>
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 13, color: C.textSecondary }}>النتيجة</Text>
            </View>
          </View>
        )}

        <TouchableOpacity onPress={handleSubmit} disabled={submitting || amt < 100}
          style={{ backgroundColor: amt >= 100 ? C.primary : C.border,
            borderRadius: 16, padding: 18, alignItems: 'center',
            shadowColor: C.primary, shadowOpacity: amt >= 100 ? 0.3 : 0,
            shadowRadius: 8, elevation: amt >= 100 ? 4 : 0 }}>
          {submitting ? <ActivityIndicator color={C.white} />
            : <Text style={{ fontSize: 17, fontWeight: '800', color: amt >= 100 ? C.white : C.textMuted }}>
                {amt < 100 ? 'أدخل المبلغ' : 'إرسال للكاشير للتأكيد'}
              </Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── COMPONENT: QR SCAN RESULT ───────────────────────────────────────────────
function QRScanResult({ result, adding, onAddStamp, onAddPoints }) {
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const merchant = result.merchant || {};
  const strategy = merchant.strategy || 'PER_VISIT';
  const pointsPerStamp = merchant.pointsPerStamp || 50;
  const isMinPurchase = result.type === 'merchant' && strategy === 'MIN_PURCHASE';

  // Calculate stamps from amount
  const amount = parseInt(purchaseAmount) || 0;
  const pointsEarned = isMinPurchase ? Math.floor(amount / 100) * 10 : 0;
  const stampsFromPoints = isMinPurchase ? Math.floor(pointsEarned / pointsPerStamp) : 0;
  const remainder = isMinPurchase ? pointsEarned % pointsPerStamp : 0;

  return (
    <View style={{ backgroundColor: C.white, margin: 16, borderRadius: 20, padding: 20, gap: 14 }}>
      {/* Merchant info */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ backgroundColor: '#D1FAE5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ fontSize: 12, color: '#065F46', fontWeight: '700' }}>✓ تم التعرف</Text>
        </View>
        {result.type === 'merchant' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: C.textPrimary }}>{merchant.name}</Text>
            <Text style={{ fontSize: 28 }}>{CATEGORY_ICONS[merchant.category]}</Text>
          </View>
        ) : (
          <Text style={{ fontSize: 16, fontWeight: '700', color: C.textPrimary }}>{result.customer?.name}</Text>
        )}
      </View>

      {/* Current stats */}
      {result.type === 'merchant' && (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, backgroundColor: C.primarySurface, borderRadius: 12, padding: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: C.primary }}>{result.currentStamps}</Text>
            <Text style={{ fontSize: 11, color: C.textMuted }}>طوابعك الحالية</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: C.accentLight, borderRadius: 12, padding: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: C.primary }}>{result.currentPoints}</Text>
            <Text style={{ fontSize: 11, color: C.textMuted }}>نقاطك المتراكمة</Text>
          </View>
        </View>
      )}

      {/* Strategy badge */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: isMinPurchase ? C.accentLight : C.primarySurface,
          borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
          borderWidth: 1, borderColor: isMinPurchase ? C.accent : C.border }}>
          <Text style={{ fontSize: 12, color: C.primary, fontWeight: '600' }}>
            {isMinPurchase ? `💰 حد أدنى — ${pointsPerStamp} نقطة = طابع` : '🚶 كل زيارة = طابع'}
          </Text>
        </View>
      </View>

      {/* PER_VISIT: direct stamp button */}
      {!isMinPurchase && (
        <TouchableOpacity onPress={onAddStamp} disabled={adding}
          style={{ backgroundColor: C.primary, borderRadius: 16, padding: 18,
            alignItems: 'center', opacity: adding ? 0.6 : 1,
            shadowColor: C.primary, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}>
          {adding ? <ActivityIndicator color={C.white} />
            : <Text style={{ fontSize: 18, fontWeight: '800', color: C.white }}>
                {result.type === 'merchant' ? 'إضافة طابع' : 'منح طابع للزبون'}
              </Text>}
        </TouchableOpacity>
      )}

      {/* MIN_PURCHASE: enter amount + send to cashier */}
      {isMinPurchase && (
        <MinPurchaseFlow merchant={merchant} adding={adding} onSent={onAddPoints} />
      )}
    </View>
  );
}

// ─── SCREEN: QR SCANNER ──────────────────────────────────────────────────────
function QRScannerScreen({ navigate, params }) {
  const mode = params?.mode || 'customer'; // 'customer' | 'cashier'
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState(false);
  const [done, setDone] = useState(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  // QR codes to simulate
  const MERCHANT_TOKENS = Object.keys(QR_REGISTRY);
  const CUSTOMER_TOKENS = Object.keys(CUSTOMER_QR);

  useEffect(() => {
    // Pulse animation
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ])).start();
    // Scan line animation
    Animated.loop(Animated.timing(scanLineAnim, {
      toValue: 1, duration: 2000, useNativeDriver: true,
    })).start();
  }, []);

  const simulateScan = async (token) => {
    setScanning(true);
    setError(null);
    await delay(800);
    try {
      if (mode === 'customer') {
        const res = await apiScanMerchantQR(token);
        setResult({ type: 'merchant', ...res, token });
      } else {
        const res = await apiScanCustomerQR(token, mockMerchant?.id || 'm1');
        setResult({ type: 'customer', ...res, token });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setScanning(false);
    }
  };

  const handleAddStamp = async () => {
    if (!result) return;
    try {
      setAdding(true);
      const res = await apiAddStampViaQR(result.merchant.merchantId);
      setDone(res);
    } finally {
      setAdding(false); }
  };

  const handleAddPoints = async () => {
    if (!result) return;
    try {
      setAdding(true);
      await delay(700);
      const pts = 20;
      myMerchantPoints[result.merchant.merchantId] = (myMerchantPoints[result.merchant.merchantId] || 0) + pts;
      setDone({ pointsAdded: pts, currentStamps: mockStamps });
    } finally {
      setAdding(false); }
  };

  const scanLineY = scanLineAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 200] });

  // Done state
  if (done) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: done.rewardReady ? C.accent : '#F0FDF4', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 }}>
      <Text style={{ fontSize: 80 }}>{done.rewardReady ? '🏆' : done.stampsAdded ? '✅' : '⭐'}</Text>
      <View style={{ alignItems: 'center', gap: 8 }}>
        {done.stampsAdded && <Text style={{ fontSize: 26, fontWeight: '800', color: done.rewardReady ? C.primary : '#16A34A' }}>
          {done.rewardReady ? 'هديتك جاهزة!' : 'تمت إضافة الطابع!'}
        </Text>}
        {done.pointsAdded && !done.stampsAdded && <Text style={{ fontSize: 26, fontWeight: '800', color: '#16A34A' }}>+{done.pointsAdded} نقطة</Text>}
        <Text style={{ fontSize: 16, color: '#15803D' }}>الطوابع: {done.currentStamps} / {REQUIRED}</Text>
        {done.pointsAdded && <Text style={{ fontSize: 14, color: '#4ADE80' }}>+{done.pointsAdded} نقطة مضافة</Text>}
      </View>
      <TouchableOpacity onPress={() => { setDone(null); setResult(null); setError(null); }}
        style={{ backgroundColor: C.primary, borderRadius: 16, padding: 18, width: '100%', alignItems: 'center' }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: C.white }}>مسح آخر</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigate(mode === 'customer' ? 'StampCard' : 'CashierQueue')}
        style={{ padding: 12 }}>
        <Text style={{ fontSize: 15, color: C.textMuted }}>العودة</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0D0D0D' }}>
      {/* Header */}
      <View style={{ padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => navigate(mode === 'customer' ? 'Nearby' : 'CashierQueue')}
          style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 10 }}>
          <Text style={{ fontSize: 16, color: C.white }}>✕</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: C.white }}>
          {mode === 'customer' ? 'امسح QR المحل' : 'امسح QR الزبون'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Camera viewfinder (simulated) */}
      <View style={{ alignItems: 'center', padding: 24 }}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }],
          width: 240, height: 240, position: 'relative' }}>
          {/* Corner brackets */}
          {[{top:0,left:0}, {top:0,right:0}, {bottom:0,left:0}, {bottom:0,right:0}].map((pos, i) => (
            <View key={i} style={{ position: 'absolute', width: 40, height: 40, ...pos,
              borderColor: C.accent, borderTopWidth: i < 2 ? 4 : 0, borderBottomWidth: i >= 2 ? 4 : 0,
              borderLeftWidth: i % 2 === 0 ? 4 : 0, borderRightWidth: i % 2 === 1 ? 4 : 0 }} />
          ))}
          {/* Scan area */}
          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', margin: 2,
            alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {/* Scan line */}
            <Animated.View style={{ position: 'absolute', left: 0, right: 0, height: 2,
              backgroundColor: C.accent, opacity: 0.8,
              transform: [{ translateY: scanLineY }] }} />
            {scanning
              ? <ActivityIndicator size="large" color={C.accent} />
              : <Text style={{ fontSize: 48, opacity: 0.3 }}>📷</Text>}
          </View>
        </Animated.View>

        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 16, textAlign: 'center' }}>
          {scanning ? 'جارٍ المسح...' : 'وجّه الكاميرا نحو رمز QR'}
        </Text>
      </View>

      {/* Error */}
      {error && (
        <View style={{ backgroundColor: '#7F1D1D', margin: 16, borderRadius: 12, padding: 14 }}>
          <Text style={{ color: '#FCA5A5', textAlign: 'center', fontSize: 14 }}>{error}</Text>
        </View>
      )}

      {/* Scan Result */}
      {result && !done && (
        <QRScanResult result={result} adding={adding}
          onAddStamp={handleAddStamp} onAddPoints={handleAddPoints} />
      )}

      {/* Simulate QR buttons */}
      {!result && !scanning && (
        <View style={{ padding: 16, gap: 10, paddingBottom: 100 }}>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center' }}>
            — محاكاة QR للتجربة —
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {(mode === 'customer' ? MERCHANT_TOKENS : CUSTOMER_TOKENS).map(token => {
                const info = mode === 'customer' ? QR_REGISTRY[token] : CUSTOMER_QR[token];
                return (
                  <TouchableOpacity key={token} onPress={() => simulateScan(token)}
                    style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14,
                      padding: 14, alignItems: 'center', gap: 6, minWidth: 100,
                      borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                    <Text style={{ fontSize: 28 }}>
                      {mode === 'customer' ? CATEGORY_ICONS[info.category] : '👤'}
                    </Text>
                    <Text style={{ fontSize: 12, color: C.white, fontWeight: '600', textAlign: 'center' }}>
                      {mode === 'customer' ? info.name : info.name}
                    </Text>
                    <View style={{ backgroundColor: C.accent, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 10, color: C.primary, fontWeight: '700' }}>امسح</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}
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
                <TouchableOpacity onPress={() => navigate('StampCard', { merchant: m })}
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

// ─── COMPONENT: CONVERT POINTS TO STAMPS ────────────────────────────────────
function ConvertPointsSection({ navigate }) {
  const POINTS_PER_STAMP = mockProgram?.pointsPerStamp || 50;
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedMerchant, setSelectedMerchant] = useState('m1');

  const availablePoints = myMerchantPoints[selectedMerchant] || 0;
  const possibleStamps = Math.floor(availablePoints / POINTS_PER_STAMP);
  const remainder = availablePoints % POINTS_PER_STAMP;

  const handleConvert = async () => {
    if (possibleStamps === 0) return;
    try {
      setConverting(true);
      const res = await apiConvertPointsToStamp(selectedMerchant, POINTS_PER_STAMP);
      setResult(res);
      setTimeout(() => setResult(null), 3000);
    } catch(e) {} finally { setConverting(false); }
  };

  const joinedMerchants = NEARBY_MERCHANTS.filter(m => (myMerchantPoints[m.id] || 0) > 0);

  if (joinedMerchants.length === 0) return null;

  return (
    <View style={{ backgroundColor: C.white, borderRadius: 20, padding: 20, gap: 14,
      shadowColor: C.primary, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
      borderWidth: 1.5, borderColor: C.primary }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 16 }}>🔄</Text>
        <Text style={{ fontSize: 16, fontWeight: '700', color: C.textPrimary }}>
          حوّل نقاطك إلى طوابع
        </Text>
      </View>

      {/* Merchant selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
          {joinedMerchants.map(m => (
            <TouchableOpacity key={m.id} onPress={() => setSelectedMerchant(m.id)}
              style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99,
                backgroundColor: selectedMerchant === m.id ? C.primary : C.primarySurface,
                borderWidth: 1.5, borderColor: selectedMerchant === m.id ? C.primary : C.border }}>
              <Text style={{ fontSize: 13, fontWeight: '600',
                color: selectedMerchant === m.id ? C.white : C.primary }}>
                {CATEGORY_ICONS[m.category]} {m.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Preview */}
      <View style={{ backgroundColor: C.primarySurface, borderRadius: 14, padding: 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 14, color: C.textSecondary }}>نقاطك المتاحة</Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: C.primary }}>{availablePoints} نقطة</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 14, color: C.textSecondary }}>معدل التحويل</Text>
          <Text style={{ fontSize: 14, fontWeight: '600', color: C.textPrimary }}>{POINTS_PER_STAMP} نقطة = طابع</Text>
        </View>
        <View style={{ height: 1, backgroundColor: C.border }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 14, color: C.textSecondary }}>الباقي (يُحفظ)</Text>
          <Text style={{ fontSize: 14, fontWeight: '600', color: C.accent }}>{remainder} نقطة</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: C.primary }}>ستحصل على</Text>
          <Text style={{ fontSize: 22, fontWeight: '900', color: C.primary }}>{possibleStamps} طابع</Text>
        </View>
      </View>

      {/* Result */}
      {result && (
        <View style={{ backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14,
          flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 24 }}>✅</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#16A34A' }}>
              تم إضافة {result.stampsAdded} طابع
            </Text>
            <Text style={{ fontSize: 13, color: C.textSecondary }}>
              الباقي المحفوظ: {result.remainingPoints} نقطة
            </Text>
          </View>
        </View>
      )}

      <TouchableOpacity onPress={handleConvert} disabled={possibleStamps === 0 || converting}
        activeOpacity={0.85}
        style={{ backgroundColor: possibleStamps > 0 ? C.primary : C.border,
          borderRadius: 14, padding: 16, alignItems: 'center' }}>
        {converting
          ? <ActivityIndicator color={C.white} />
          : <Text style={{ fontSize: 16, fontWeight: '700',
              color: possibleStamps > 0 ? C.white : C.textMuted }}>
              {possibleStamps > 0 ? `حوّل الآن ← ${possibleStamps} طابع` : 'نقاط غير كافية'}
            </Text>}
      </TouchableOpacity>
    </View>
  );
}

// ─── SCREEN: POINTS WALLET ────────────────────────────────────────────────────
function PointsWalletScreen({ navigate }) {
  const [zidmePoints, setZidmePoints] = useState(myZidmePoints);
  const [merchantPoints, setMerchantPoints] = useState({...myMerchantPoints});
  const [showShare, setShowShare] = useState(false);
  const [sharePhone, setSharePhone] = useState('');
  const [shareAmount, setShareAmount] = useState('');
  const [sharing, setSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [shareMerchant, setShareMerchant] = useState(null);
  const [referral, setReferral] = useState(null);
  const [loadingRef, setLoadingRef] = useState(false);

  const handleShare = async () => {
    const amount = parseInt(shareAmount);
    const available = merchantPoints[shareMerchant] || 0;
    if (!sharePhone || !amount || amount > available || !shareMerchant) return;
    try {
      setSharing(true);
      await apiSharePoints(sharePhone, amount);
      const updated = { ...merchantPoints };
      updated[shareMerchant] = available - amount;
      setMerchantPoints(updated);
      myMerchantPoints[shareMerchant] = updated[shareMerchant];
      setShareSuccess(true);
      setSharePhone(''); setShareAmount('');
      setTimeout(() => { setShareSuccess(false); setShowShare(false); setShareMerchant(null); }, 2500);
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
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12,
              padding: 12, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>استبدال — قريباً</Text>
            </View>
          </View>
        </View>

        {/* Per-Merchant Points with Share */}
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: C.textPrimary, textAlign: 'right' }}>
            نقاط كل محل
          </Text>
          {NEARBY_MERCHANTS.filter(m => (merchantPoints[m.id] || 0) >= 0).map(m => (
            <View key={m.id} style={{ backgroundColor: C.white, borderRadius: 16, padding: 16, gap: 12,
              shadowColor: C.primary, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ backgroundColor: C.accentLight, borderRadius: 10,
                  paddingHorizontal: 12, paddingVertical: 5 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: C.primary }}>
                    {merchantPoints[m.id] || 0}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: C.textPrimary }}>{m.name}</Text>
                  <Text style={{ fontSize: 26 }}>{CATEGORY_ICONS[m.category]}</Text>
                </View>
              </View>
              {(merchantPoints[m.id] || 0) > 0 && (
                <TouchableOpacity
                  onPress={() => { setShareMerchant(m.id); setShowShare(true); }}
                  style={{ backgroundColor: C.primarySurface, borderRadius: 10, padding: 10,
                    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
                    borderWidth: 1, borderColor: C.border }}>
                  <Text style={{ fontSize: 14 }}>🔄</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: C.primary }}>
                    مشاركة نقاط {m.name}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Convert Points to Stamps */}
        <ConvertPointsSection navigate={navigate} />

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
          <View style={{ backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 24, gap: 16, paddingBottom: 36 }}>
            {shareSuccess ? (
              <View style={{ alignItems: 'center', padding: 20, gap: 12 }}>
                <Text style={{ fontSize: 60 }}>✅</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: C.primary }}>تمت المشاركة!</Text>
                <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center' }}>
                  سيصل للمتلقي إشعار مع دعوة للانضمام للمحل
                </Text>
              </View>
            ) : (
              <>
                <View style={{ alignItems: 'center' }}>
                  <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border }} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => setShowShare(false)}>
                    <Text style={{ fontSize: 16, color: C.error }}>إلغاء</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: C.textPrimary }}>مشاركة النقاط</Text>
                </View>

                {/* Balance - per merchant */}
                {shareMerchant && (
                  <View style={{ backgroundColor: C.primarySurface, borderRadius: 12, padding: 14, gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 22, fontWeight: '900', color: C.primary }}>
                        {merchantPoints[shareMerchant] || 0} نقطة
                      </Text>
                      <Text style={{ fontSize: 13, color: C.textSecondary }}>رصيدك في</Text>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: C.primary, textAlign: 'right' }}>
                      {NEARBY_MERCHANTS.find(m => m.id === shareMerchant)?.name}
                    </Text>
                  </View>
                )}

                {/* Phone */}
                <TextInput value={sharePhone} onChangeText={setSharePhone}
                  placeholder="رقم هاتف المستقبل (0XXXXXXXXX)" placeholderTextColor={C.textMuted}
                  keyboardType="number-pad" maxLength={10}
                  style={{ borderWidth: 1.5, borderColor: C.border, borderRadius: 14, padding: 16,
                    fontSize: 16, color: C.textPrimary, textAlign: 'right' }} />

                {/* Amount */}
                <TextInput value={shareAmount} onChangeText={setShareAmount}
                  placeholder="عدد النقاط" placeholderTextColor={C.textMuted}
                  keyboardType="number-pad"
                  style={{ borderWidth: 1.5, borderColor: C.border, borderRadius: 14, padding: 16,
                    fontSize: 16, color: C.textPrimary, textAlign: 'right' }} />

                {/* Merchant invite option */}
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: C.textPrimary, textAlign: 'right' }}>
                    ادعُه لمحل معين (اختياري)
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity onPress={() => setShareMerchant(null)}
                        style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99,
                          backgroundColor: !shareMerchant ? C.primary : C.primarySurface,
                          borderWidth: 1.5, borderColor: !shareMerchant ? C.primary : C.border }}>
                        <Text style={{ fontSize: 13, fontWeight: '600',
                          color: !shareMerchant ? C.white : C.primary }}>بدون دعوة</Text>
                      </TouchableOpacity>
                      {NEARBY_MERCHANTS.map(m => (
                        <TouchableOpacity key={m.id} onPress={() => setShareMerchant(m.id)}
                          style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99,
                            backgroundColor: shareMerchant === m.id ? C.primary : C.primarySurface,
                            borderWidth: 1.5, borderColor: shareMerchant === m.id ? C.primary : C.border }}>
                          <Text style={{ fontSize: 13, fontWeight: '600',
                            color: shareMerchant === m.id ? C.white : C.primary }}>
                            {CATEGORY_ICONS[m.category]} {m.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>

                  {/* Preview of what recipient sees */}
                  {shareMerchant && (
                    <View style={{ backgroundColor: C.accentLight, borderRadius: 12, padding: 12, gap: 4,
                      borderWidth: 1, borderColor: C.accent }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: C.primary, textAlign: 'right' }}>
                        ما سيراه المتلقي:
                      </Text>
                      <Text style={{ fontSize: 13, color: C.textPrimary, textAlign: 'right', lineHeight: 20 }}>
                        {'"'}أرسل لك {shareAmount || '...'} نقطة في {NEARBY_MERCHANTS.find(m=>m.id===shareMerchant)?.name} —
                        انضم الآن واستخدمها!{'"'}
                      </Text>
                    </View>
                  )}
                </View>

                <Btn label="شارك النقاط" onPress={handleShare} loading={sharing}
                  disabled={!sharePhone || !shareAmount || !shareMerchant ||
                    parseInt(shareAmount) > (merchantPoints[shareMerchant] || 0)} />
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── SCREEN: GIFT POINTS (Merchant to Customer) ──────────────────────────────
function GiftPointsScreen({ navigate }) {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState(MOCK_CUSTOMERS);
  const [selected, setSelected] = useState(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  const handleSearch = async (text) => {
    setSearch(text);
    const res = await apiGetCustomers(text);
    setCustomers(res);
  };

  const handleGift = async () => {
    if (!selected || !amount || parseInt(amount) <= 0) return;
    try {
      setLoading(true);
      const res = await apiGiftPoints(selected.id, parseInt(amount));
      setSuccess({ customer: selected, amount: parseInt(amount), total: res.newTotal });
      setSelected(null); setAmount(''); setSearch('');
      setCustomers(MOCK_CUSTOMERS);
      setTimeout(() => setSuccess(null), 3000);
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ backgroundColor: C.primary, padding: 20 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: C.white, textAlign: 'right' }}>
          إهداء نقاط لزبون
        </Text>
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'right' }}>
          ابحث عن زبون أو اختره من القائمة
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">

        {/* Success banner */}
        {success && (
          <View style={{ backgroundColor: '#F0FDF4', borderRadius: 16, padding: 16, gap: 6,
            borderWidth: 1.5, borderColor: '#86EFAC', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 32 }}>🎁</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#16A34A', textAlign: 'right' }}>
                تم الإهداء بنجاح!
              </Text>
              <Text style={{ fontSize: 13, color: '#15803D', textAlign: 'right' }}>
                {success.amount} نقطة لـ {success.customer.name}
              </Text>
              <Text style={{ fontSize: 12, color: '#4ADE80', textAlign: 'right' }}>
                رصيده الجديد: {success.total} نقطة
              </Text>
            </View>
          </View>
        )}

        {/* Search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10,
          backgroundColor: C.white, borderRadius: 14, borderWidth: 1.5, borderColor: C.border,
          paddingHorizontal: 14, height: 52 }}>
          <Text style={{ fontSize: 18 }}>🔍</Text>
          <TextInput value={search} onChangeText={handleSearch}
            placeholder="ابحث بالاسم أو رقم الهاتف" placeholderTextColor={C.textMuted}
            style={{ flex: 1, fontSize: 15, color: C.textPrimary, textAlign: 'right' }} />
        </View>

        {/* Selected customer preview */}
        {selected && (
          <View style={{ backgroundColor: C.primary, borderRadius: 16, padding: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setSelected(null)}
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8,
                  paddingHorizontal: 10, paddingVertical: 5 }}>
                <Text style={{ fontSize: 13, color: C.white }}>تغيير</Text>
              </TouchableOpacity>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: C.white }}>{selected.name}</Text>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{selected.phone}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10,
                padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: C.accent }}>{selected.stamps}</Text>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>طوابع</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10,
                padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: C.accent }}>
                  {customerPointsFromMerchant[selected.id] || 0}
                </Text>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>نقاط حالية</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10,
                padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>
                  {selected.lastVisit}
                </Text>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>آخر زيارة</Text>
              </View>
            </View>

            {/* Gift amount */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.8)', textAlign: 'right' }}>
                عدد النقاط المهداة
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[10, 25, 50, 100].map(n => (
                  <TouchableOpacity key={n} onPress={() => setAmount(String(n))}
                    style={{ flex: 1, backgroundColor: amount === String(n) ? C.accent : 'rgba(255,255,255,0.15)',
                      borderRadius: 10, padding: 10, alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, fontWeight: '700',
                      color: amount === String(n) ? C.primary : C.white }}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput value={amount} onChangeText={setAmount}
                placeholder="أو أدخل عدداً مخصصاً" placeholderTextColor="rgba(255,255,255,0.4)"
                keyboardType="number-pad"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 14,
                  fontSize: 16, color: C.white, textAlign: 'right', borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.2)' }} />
            </View>

            <Btn label={loading ? '' : `إهداء ${amount || '...'} نقطة`}
              onPress={handleGift} loading={loading}
              disabled={!amount || parseInt(amount) <= 0}
              style={{ backgroundColor: C.accent }}
              textStyle={{ color: C.primary }} />
          </View>
        )}

        {/* Customer list */}
        {!selected && (
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: C.textSecondary, textAlign: 'right' }}>
              {customers.length} زبون
            </Text>
            {customers.map(c => (
              <TouchableOpacity key={c.id} onPress={() => setSelected(c)} activeOpacity={0.85}
                style={{ backgroundColor: C.white, borderRadius: 14, padding: 16,
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  borderWidth: 1, borderColor: C.border }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: C.textMuted }}>{c.lastVisit}</Text>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: C.textPrimary }}>{c.name}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <View style={{ backgroundColor: C.accentLight, borderRadius: 6,
                        paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 12, color: C.primary, fontWeight: '600' }}>
                          {customerPointsFromMerchant[c.id] || 0} نقطة
                        </Text>
                      </View>
                      <View style={{ backgroundColor: C.primarySurface, borderRadius: 6,
                        paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 12, color: C.primary, fontWeight: '600' }}>
                          {c.stamps} طابع
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 13, color: C.textMuted }}>{c.phone}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 20, color: C.textMuted }}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
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

// ─── SCREEN: MY PROFILE ──────────────────────────────────────────────────────
function ProfileScreen({ navigate }) {
  const [name, setName] = useState(mockProfile.name);
  const [age, setAge] = useState(mockProfile.age);
  const [gender, setGender] = useState(mockProfile.gender);
  const [address, setAddress] = useState(mockProfile.address);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reward, setReward] = useState(null);

  const pct = [name, age, gender, address].filter(Boolean).length * 25;

  const getLocationAuto = async () => {
    setLocating(true);
    await delay(1500);
    setAddress('حي النصر، وهران، الجزائر');
    setLocating(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await apiSaveProfile({ name, age, gender, address });
      if (res.pointsEarned > 0) {
        setReward(res.pointsEarned);
        setTimeout(() => setReward(null), 3000);
      }
    } finally { setSaving(false); }
  };

  const FieldLabel = ({ label, fieldKey }) => {
    const done = mockProfile.completedFields.includes(fieldKey);
    const pts = PROFILE_REWARDS[fieldKey]?.points;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          {done
            ? <View style={{ backgroundColor: '#D1FAE5', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                <Text style={{ fontSize: 11, color: '#16A34A', fontWeight: '700' }}>+{pts} ✓</Text>
              </View>
            : <View style={{ backgroundColor: C.accentLight, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                <Text style={{ fontSize: 11, color: C.primary, fontWeight: '700' }}>+{pts}</Text>
              </View>
          }
        </View>
        <Text style={{ fontSize: 13, fontWeight: '600', color: C.textSecondary }}>{label}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      {/* Reward toast */}
      {reward && (
        <View style={{ position: 'absolute', top: 50, left: 20, right: 20, zIndex: 99,
          backgroundColor: C.primary, borderRadius: 14, padding: 14,
          flexDirection: 'row', alignItems: 'center', gap: 10,
          shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 }}>
          <Text style={{ fontSize: 24 }}>🎉</Text>
          <Text style={{ fontSize: 15, fontWeight: '800', color: C.accent }}>+{reward} نقطة Zidme!</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled">

        {/* Header card */}
        <View style={{ backgroundColor: C.primary, borderRadius: 20, padding: 20, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32,
              backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
              borderWidth: 2.5, borderColor: C.accent }}>
              <Text style={{ fontSize: 32 }}>{gender === 'female' ? '👩' : '👨'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: C.white }}>
                {name || 'اسمك هنا'}
              </Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>0555 123 456</Text>
            </View>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12,
              padding: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: C.accent }}>{myZidmePoints}</Text>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>نقطة</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>اكتمال البروفايل</Text>
              <Text style={{ fontSize: 12, color: C.accent, fontWeight: '700' }}>{pct}%</Text>
            </View>
            <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 99 }}>
              <View style={{ width: `${pct}%`, height: '100%',
                backgroundColor: pct === 100 ? '#22C55E' : C.accent, borderRadius: 99 }} />
            </View>
          </View>
        </View>

        {/* Form */}
        <View style={{ backgroundColor: C.white, borderRadius: 18, padding: 18, gap: 16,
          shadowColor: C.primary, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }}>

          {/* Name */}
          <View>
            <FieldLabel label="الاسم" fieldKey="name" />
            <TextInput value={name} onChangeText={setName}
              placeholder="أدخل اسمك" placeholderTextColor={C.textMuted} maxLength={40}
              style={{ borderWidth: 1.5, borderColor: name ? C.primary : C.border,
                borderRadius: 12, padding: 14, fontSize: 16, color: C.textPrimary,
                backgroundColor: C.background, textAlign: 'right' }} />
          </View>

          {/* Age */}
          <View>
            <FieldLabel label="العمر (اختياري)" fieldKey="age" />
            <TextInput value={age} onChangeText={setAge}
              placeholder="مثال: 28" placeholderTextColor={C.textMuted}
              keyboardType="number-pad" maxLength={3}
              style={{ borderWidth: 1.5, borderColor: age ? C.primary : C.border,
                borderRadius: 12, padding: 14, fontSize: 16, color: C.textPrimary,
                backgroundColor: C.background, textAlign: 'right' }} />
          </View>

          {/* Gender */}
          <View>
            <FieldLabel label="الجنس (اختياري)" fieldKey="gender" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[{ key: 'male', label: 'ذكر', icon: '👨' }, { key: 'female', label: 'أنثى', icon: '👩' }].map(g => (
                <TouchableOpacity key={g.key} onPress={() => setGender(g.key)}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                    gap: 8, padding: 14, borderRadius: 12,
                    backgroundColor: gender === g.key ? C.primarySurface : C.background,
                    borderWidth: 2, borderColor: gender === g.key ? C.primary : C.border }}>
                  <Text style={{ fontSize: 22 }}>{g.icon}</Text>
                  <Text style={{ fontSize: 15, fontWeight: '600',
                    color: gender === g.key ? C.primary : C.textSecondary }}>{g.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Address */}
          <View>
            <FieldLabel label="العنوان (اختياري)" fieldKey="address" />
            <TextInput value={address} onChangeText={setAddress}
              placeholder="حيك أو مدينتك" placeholderTextColor={C.textMuted} multiline
              style={{ borderWidth: 1.5, borderColor: address ? C.primary : C.border,
                borderRadius: 12, padding: 14, fontSize: 15, color: C.textPrimary,
                backgroundColor: C.background, textAlign: 'right', minHeight: 60 }} />
            <TouchableOpacity onPress={getLocationAuto} disabled={locating}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                gap: 8, marginTop: 8, backgroundColor: C.primarySurface, borderRadius: 10,
                padding: 10, opacity: locating ? 0.6 : 1 }}>
              {locating ? <ActivityIndicator size="small" color={C.primary} />
                : <Text style={{ fontSize: 16 }}>📍</Text>}
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.primary }}>
                {locating ? 'جارٍ التحديد...' : 'تحديد تلقائي'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Btn label="حفظ" onPress={handleSave} loading={saving}
          disabled={!name && !age && !gender && !address} />

        {pct === 100 && (
          <View style={{ backgroundColor: '#F0FDF4', borderRadius: 14, padding: 14,
            flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#86EFAC' }}>
            <Text style={{ fontSize: 24 }}>🏆</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#16A34A' }}>بروفايل مكتمل 100%</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── SIDE DRAWER (inDrive style) ─────────────────────────────────────────────
function SideDrawer({ visible, role, onClose, onSwitchRole, onLogout, navigate }) {
  const slideAnim = useRef(new Animated.Value(-340)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: visible ? 0 : -340,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: visible ? 1 : 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  const CUSTOMER_MENU = [
    { icon: '📍', label: 'محلات قريبة', screen: 'Nearby' },
    { icon: '🏷️', label: 'طوابعي', screen: 'StampCard' },
    { icon: '⭐', label: 'نقاطي', screen: 'PointsWallet' },
    { icon: '📷', label: 'مسح QR', screen: 'QRScanner', params: { mode: 'customer' } },
    { icon: '👤', label: 'حسابي', screen: 'Profile' },
  ];

  const MERCHANT_MENU = [
    { icon: '📊', label: 'لوحة التحكم', screen: 'Dashboard' },
    { icon: '⚡', label: 'شاشة الكاشير', screen: 'CashierQueue' },
    { icon: '📷', label: 'مسح QR زبون', screen: 'CashierQRScanner', params: { mode: 'cashier' } },
    { icon: '💰', label: 'إضافة نقاط', screen: 'AddPoints' },
    { icon: '🎁', label: 'إهداء نقاط', screen: 'GiftPoints' },
    { icon: '📋', label: 'عرض QR المحل', screen: 'QRPoster' },
  ];

  const menu = role === 'customer' ? CUSTOMER_MENU : MERCHANT_MENU;

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* Drawer */}
        <Animated.View style={{ width: 300, backgroundColor: C.white, height: '100%',
          transform: [{ translateX: slideAnim }],
          shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 24, elevation: 24 }}>

          {/* Profile header */}
          <View style={{ backgroundColor: C.primary, paddingTop: 44, paddingBottom: 20,
            paddingHorizontal: 20, gap: 12 }}>
            <TouchableOpacity onPress={onClose} style={{ alignSelf: 'flex-end', marginBottom: 4 }}>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8,
                width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 16, color: C.white, fontWeight: '700' }}>✕</Text>
              </View>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.accent }}>
                <Text style={{ fontSize: 28 }}>{role === 'customer' ? '👤' : '🏪'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: C.white }}>
                  {role === 'customer' ? 'زبون زيدني' : (mockMerchant?.name || 'تاجر زيدني')}
                </Text>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>0555 123 456</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10,
                padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: C.accent }}>{mockStamps}</Text>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>طوابع</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10,
                padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: C.accent }}>{myZidmePoints}</Text>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>نقاط</Text>
              </View>
            </View>
          </View>

          {/* Menu items */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 8 }}>
            {menu.map((item, i) => (
              <TouchableOpacity key={i} onPress={() => {
                onClose();
                setTimeout(() => navigate(item.screen, item.params || {}), 250);
              }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 16,
                  paddingVertical: 16, paddingHorizontal: 20,
                  borderBottomWidth: 1, borderBottomColor: C.borderLight }}
                activeOpacity={0.7}>
                <Text style={{ fontSize: 24, width: 32, textAlign: 'center' }}>{item.icon}</Text>
                <Text style={{ fontSize: 16, color: C.textPrimary, flex: 1, textAlign: 'right' }}>{item.label}</Text>
                <Text style={{ fontSize: 18, color: C.textMuted }}>‹</Text>
              </TouchableOpacity>
            ))}

            {/* Switch role */}
            <TouchableOpacity onPress={() => { onClose(); setTimeout(onSwitchRole, 250); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 16,
                paddingVertical: 16, paddingHorizontal: 20,
                borderBottomWidth: 1, borderBottomColor: C.borderLight,
                backgroundColor: C.primarySurface }}
              activeOpacity={0.7}>
              <Text style={{ fontSize: 24, width: 32, textAlign: 'center' }}>
                {role === 'customer' ? '🏪' : '🛍️'}
              </Text>
              <Text style={{ fontSize: 16, color: C.primary, fontWeight: '600', flex: 1, textAlign: 'right' }}>
                التبديل إلى {role === 'customer' ? 'وضع التاجر' : 'وضع الزبون'}
              </Text>
              <Text style={{ fontSize: 18, color: C.primary }}>‹</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Logout */}
          <TouchableOpacity onPress={() => { onClose(); setTimeout(onLogout, 250); }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 16,
              padding: 20, borderTopWidth: 1, borderTopColor: C.border }}
            activeOpacity={0.7}>
            <Text style={{ fontSize: 24, width: 32, textAlign: 'center' }}>🚪</Text>
            <Text style={{ fontSize: 16, color: C.error, fontWeight: '600', flex: 1, textAlign: 'right' }}>
              تسجيل الخروج
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Backdrop */}
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
            onPress={onClose} activeOpacity={1} />
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── CUSTOMER TAB BAR ─────────────────────────────────────────────────────────
function CustomerTabBar({ active, navigate, onMenuPress }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: C.white,
      borderTopWidth: 1, borderTopColor: C.border,
      paddingBottom: 22, paddingTop: 6, alignItems: 'flex-end' }}>

      {/* Home */}
      <TouchableOpacity onPress={() => navigate('Nearby')}
        style={{ flex: 1, alignItems: 'center', gap: 3, paddingTop: 8 }} activeOpacity={0.7}>
        <Text style={{ fontSize: 24 }}>📍</Text>
        <Text style={{ fontSize: 11, color: active === 'Nearby' ? C.primary : C.textMuted,
          fontWeight: active === 'Nearby' ? '700' : '400' }}>محلات</Text>
        {active === 'Nearby' && <View style={{ width: 18, height: 3, borderRadius: 2, backgroundColor: C.primary }} />}
      </TouchableOpacity>

      {/* QR — Center elevated */}
      <TouchableOpacity onPress={() => navigate('QRScanner', { mode: 'customer' })}
        style={{ flex: 1, alignItems: 'center', marginBottom: 8 }} activeOpacity={0.85}>
        <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: C.primary,
          alignItems: 'center', justifyContent: 'center',
          shadowColor: C.primary, shadowOpacity: 0.45, shadowRadius: 10, elevation: 8,
          borderWidth: 3, borderColor: C.white }}>
          <Text style={{ fontSize: 26 }}>📷</Text>
        </View>
        <Text style={{ fontSize: 11, color: C.primary, fontWeight: '700', marginTop: 4 }}>مسح QR</Text>
      </TouchableOpacity>

      {/* Menu */}
      <TouchableOpacity onPress={onMenuPress}
        style={{ flex: 1, alignItems: 'center', gap: 3, paddingTop: 8 }} activeOpacity={0.7}>
        <View style={{ gap: 4, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', gap: 3 }}>
            {[0,1,2].map(i => <View key={i} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.textMuted }} />)}
          </View>
          <View style={{ flexDirection: 'row', gap: 3 }}>
            {[0,1,2].map(i => <View key={i} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.textMuted }} />)}
          </View>
          <View style={{ flexDirection: 'row', gap: 3 }}>
            {[0,1,2].map(i => <View key={i} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.textMuted }} />)}
          </View>
        </View>
        <Text style={{ fontSize: 11, color: C.textMuted }}>القائمة</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── MERCHANT TAB BAR ─────────────────────────────────────────────────────────
function MerchantTabBar({ active, navigate, onMenuPress }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: C.white,
      borderTopWidth: 1, borderTopColor: C.border,
      paddingBottom: 22, paddingTop: 6, alignItems: 'flex-end' }}>

      {/* Dashboard */}
      <TouchableOpacity onPress={() => navigate('Dashboard')}
        style={{ flex: 1, alignItems: 'center', gap: 3, paddingTop: 8 }} activeOpacity={0.7}>
        <Text style={{ fontSize: 24 }}>📊</Text>
        <Text style={{ fontSize: 11, color: active === 'Dashboard' ? C.primary : C.textMuted,
          fontWeight: active === 'Dashboard' ? '700' : '400' }}>لوحة</Text>
        {active === 'Dashboard' && <View style={{ width: 18, height: 3, borderRadius: 2, backgroundColor: C.primary }} />}
      </TouchableOpacity>

      {/* QR — Center elevated */}
      <TouchableOpacity onPress={() => navigate('CashierQRScanner', { mode: 'cashier' })}
        style={{ flex: 1, alignItems: 'center', marginBottom: 8 }} activeOpacity={0.85}>
        <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: C.accent,
          alignItems: 'center', justifyContent: 'center',
          shadowColor: C.accent, shadowOpacity: 0.45, shadowRadius: 10, elevation: 8,
          borderWidth: 3, borderColor: C.white }}>
          <Text style={{ fontSize: 26 }}>📷</Text>
        </View>
        <Text style={{ fontSize: 11, color: C.primary, fontWeight: '700', marginTop: 4 }}>مسح QR</Text>
      </TouchableOpacity>

      {/* Menu */}
      <TouchableOpacity onPress={onMenuPress}
        style={{ flex: 1, alignItems: 'center', gap: 3, paddingTop: 8 }} activeOpacity={0.7}>
        <View style={{ gap: 4, alignItems: 'center' }}>
          {[0,1,2].map(i => <View key={i} style={{ width: 22, height: 3, borderRadius: 2, backgroundColor: C.textMuted }} />)}
        </View>
        <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>القائمة</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
const CUSTOMER_SCREENS = ['Nearby', 'StampCard', 'PointsWallet', 'CustomerEntry', 'StampSuccess', 'RewardReady', 'QRScanner', 'Profile'];
const MERCHANT_SCREENS = ['Dashboard', 'CashierQueue', 'AddPoints', 'GiftPoints', 'QRPoster', 'CashierConfirm', 'CashierQRScanner'];
const AUTH_SCREENS = ['PhoneLogin', 'OTP', 'RoleSelect'];

export default function App() {
  const [screen, setScreen] = useState('PhoneLogin');
  const [params, setParams] = useState({});
  const [role, setRole] = useState(null);
  const [showExitModal, setShowExitModal] = useState(false);

  const navigate = (name, p = {}) => {
    if (name === 'RoleSelect') setRole(null);
    if (CUSTOMER_SCREENS.includes(name)) setRole('customer');
    if (MERCHANT_SCREENS.includes(name) || name === 'MerchantSetup' || name === 'CashierQRScanner') setRole('merchant');
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
    NameSetup: <NameSetupScreen navigate={navigate} params={params} />,
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
    GiftPoints: <GiftPointsScreen navigate={navigate} params={params} />,
    QRScanner: <QRScannerScreen navigate={navigate} params={params} />,
    CashierQRScanner: <QRScannerScreen navigate={navigate} params={{...params, mode: 'cashier'}} />,
    Profile: <ProfileScreen navigate={navigate} params={params} />,
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
      <SideDrawer
        visible={showExitModal}
        role={role}
        onClose={() => setShowExitModal(false)}
        onSwitchRole={handleSwitchRole}
        onLogout={handleLogout}
        navigate={navigate}
      />
    </View>
  );
}
