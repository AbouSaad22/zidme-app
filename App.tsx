import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import CustomerNavigator from './src/navigation/CustomerNavigator';

/**
 * Zidme — Phase 1: Customer Core Flow
 *
 * Mock QR token used for demo: "token-cafe-zidme"
 * To simulate a different merchant, change initialParams.merchantToken
 */

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <CustomerNavigator />
    </NavigationContainer>
  );
}
