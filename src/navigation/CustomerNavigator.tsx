import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { CustomerStackParamList } from '../types';
import CustomerEntryScreen from '../screens/CustomerEntryScreen';
import PhoneLoginScreen from '../screens/PhoneLoginScreen';
import OTPVerificationScreen from '../screens/OTPVerificationScreen';
import CustomerStampCardScreen from '../screens/CustomerStampCardScreen';
import StampAddedSuccessScreen from '../screens/StampAddedSuccessScreen';
import RewardReadyScreen from '../screens/RewardReadyScreen';
import Colors from '../theme/colors';

const Stack = createNativeStackNavigator<CustomerStackParamList>();

export default function CustomerNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="CustomerEntry"
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.white,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 17,
        },
        headerBackTitle: 'رجوع',
        contentStyle: { backgroundColor: Colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="CustomerEntry"
        component={CustomerEntryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PhoneLogin"
        component={PhoneLoginScreen}
        options={{ title: 'تسجيل الدخول', headerBackVisible: true }}
      />
      <Stack.Screen
        name="OTPVerification"
        component={OTPVerificationScreen}
        options={{ title: 'رمز التحقق', headerBackVisible: false }}
      />
      <Stack.Screen
        name="CustomerStampCard"
        component={CustomerStampCardScreen}
        options={({ route }) => ({
          title: route.params?.merchantName ?? 'بطاقتي',
          headerBackVisible: false,
        })}
      />
      <Stack.Screen
        name="StampAddedSuccess"
        component={StampAddedSuccessScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RewardReady"
        component={RewardReadyScreen}
        options={{ title: 'هديتك جاهزة 🎁', headerBackVisible: false }}
      />
    </Stack.Navigator>
  );
}
