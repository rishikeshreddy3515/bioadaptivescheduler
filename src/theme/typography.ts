/**
 * CADENCE Typography Definition
 * Loads and standardizes Urbanist and Doto font families
 */

import { Platform } from 'react-native';

export const FONTS = {
  urbanistLight: Platform.select({
    ios: 'Urbanist_300Light',
    android: 'Urbanist_300Light',
    default: 'Urbanist, sans-serif',
  }),
  urbanistRegular: Platform.select({
    ios: 'Urbanist_400Regular',
    android: 'Urbanist_400Regular',
    default: 'Urbanist, sans-serif',
  }),
  urbanistMedium: Platform.select({
    ios: 'Urbanist_500Medium',
    android: 'Urbanist_500Medium',
    default: 'Urbanist, sans-serif',
  }),
  urbanistSemiBold: Platform.select({
    ios: 'Urbanist_600SemiBold',
    android: 'Urbanist_600SemiBold',
    default: 'Urbanist, sans-serif',
  }),
  urbanistBold: Platform.select({
    ios: 'Urbanist_700Bold',
    android: 'Urbanist_700Bold',
    default: 'Urbanist, sans-serif',
  }),
  dotoRegular: Platform.select({
    ios: 'Doto_400Regular',
    android: 'Doto_400Regular',
    default: 'Doto, monospace',
  }),
  dotoSemiBold: Platform.select({
    ios: 'Doto_600SemiBold',
    android: 'Doto_600SemiBold',
    default: 'Doto, monospace',
  }),
  dotoBold: Platform.select({
    ios: 'Doto_700Bold',
    android: 'Doto_700Bold',
    default: 'Doto, monospace',
  }),
};

