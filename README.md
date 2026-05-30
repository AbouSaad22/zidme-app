# Zidme — Phase 1: Customer Core Flow

نظام ولاء رقمي للمحلات الصغيرة والمتوسطة.

---

## 🚀 تشغيل سريع

```bash
cd zidme-app
npm install
npx expo start
```

- افتح Expo Go على هاتفك وامسح QR Code
- أو اضغط `a` للتشغيل على Android Emulator

---

## 📱 الشاشات المنجزة (Phase 1)

| # | الشاشة | المرجع |
|---|--------|--------|
| 1 | CustomerEntryScreen | SCR-008 |
| 2 | PhoneLoginScreen | SCR-002 |
| 3 | OTPVerificationScreen | SCR-003 |
| 4 | CustomerStampCardScreen | SCR-009 |
| 5 | StampAddedSuccessScreen | SCR-010 |
| 6 | RewardReadyScreen | SCR-011 |

---

## 🧪 بيانات تجريبية

| الاختبار | القيمة |
|----------|--------|
| رمز OTP | `123456` |
| رموز QR التجريبية | `token-cafe-zidme` / `token-pizza-zidme` / `token-ff-zidme` |
| عدد الطوابع الأولي | 3 من 6 |
| الهدية | "قهوة مجانية" |

---

## 🏗️ هيكل الملفات

```
src/
├── navigation/
│   └── CustomerNavigator.tsx    ← Stack Navigator
├── screens/
│   ├── CustomerEntryScreen.tsx  ← SCR-008
│   ├── PhoneLoginScreen.tsx     ← SCR-002
│   ├── OTPVerificationScreen.tsx ← SCR-003
│   ├── CustomerStampCardScreen.tsx ← SCR-009 (Hero)
│   ├── StampAddedSuccessScreen.tsx ← SCR-010
│   └── RewardReadyScreen.tsx    ← SCR-011
├── components/
│   ├── ui/
│   │   ├── ZidmeButton.tsx
│   │   ├── OTPInput.tsx
│   │   ├── PhoneInput.tsx
│   │   ├── StampGrid.tsx
│   │   ├── StampDot.tsx
│   │   ├── RewardBanner.tsx
│   │   ├── CategoryIcon.tsx
│   │   └── LoadingOverlay.tsx
│   └── layout/
│       └── SafeScreen.tsx
├── services/
│   └── mockApi.ts              ← قابل للاستبدال بـ NestJS
├── types/
│   └── index.ts
└── theme/
    ├── colors.ts               ← ألوان Zidme Brand
    ├── typography.ts
    └── spacing.ts
```

---

## 🔄 استبدال Mock API بـ NestJS

كل دالة في `src/services/mockApi.ts` تعكس endpoint حقيقي:

```typescript
// قبل (Mock)
export async function requestOTP(phone: string): Promise<OTPRequest> {
  await delay(800);
  return { requestId: `req-${Date.now()}`, expiresIn: 300 };
}

// بعد (NestJS)
export async function requestOTP(phone: string): Promise<OTPRequest> {
  const res = await fetch(`${API_BASE}/api/v1/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) throw await res.json();
  return res.json();
}
```

---

## 🎨 الهوية البصرية

| العنصر | القيمة |
|--------|--------|
| اللون الرئيسي | `#0D3D2E` (أخضر غابات) |
| لون التمييز | `#F5A623` (ذهبي) |
| الخلفية | `#F7FAF8` |
| الخط | System (RTL-ready) |

---

## ⏸️ توقف Phase 1 — بانتظار المراجعة

Phase 2 (Merchant + Cashier UI) لن تبدأ قبل اعتمادك.
