import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme/useTheme';
import { FONTS } from '../theme/typography';
import { DotMatrixBackground } from '../components/common/DotMatrixBackground';
import { STORAGE_KEYS, storage } from '../utils/storage';
import { syncService, ConnectedSourcesConfig } from '../services/syncService';

interface ConnectionItem {
  id: string;
  badge: string;
  name: string;
  description: string;
  enabled: boolean;
}

interface ConnectScreenProps {
  onComplete?: () => void;
}

export const ConnectScreen: React.FC<ConnectScreenProps> = ({ onComplete }) => {
  const { theme, isDark, toggleTheme } = useTheme();

  const [isSyncing, setIsSyncing] = useState(false);
  const [connections, setConnections] = useState<ConnectionItem[]>([
    {
      id: 'health',
      badge: 'H',
      name: 'Health Connect',
      description: 'Sleep, HRV, heart rate',
      enabled: true,
    },
    {
      id: 'gcal',
      badge: 'G',
      name: 'Google Calendar',
      description: 'Two-way sync',
      enabled: true,
    },
    {
      id: 'todoist',
      badge: 'T',
      name: 'Todoist',
      description: 'Pull in your tasks',
      enabled: false,
    },
    {
      id: 'glucose',
      badge: 'N',
      name: 'Glucose sensor',
      description: 'NFC scan, optional',
      enabled: false,
    },
  ]);

  useEffect(() => {
    syncService.getConnectedSources().then((cfg) => {
      setConnections((prev) =>
        prev.map((c) => ({
          ...c,
          enabled: cfg[c.id as keyof ConnectedSourcesConfig] ?? c.enabled,
        }))
      );
    });
  }, []);

  const toggleConnection = (id: string) => {
    setConnections((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item));
      const config: ConnectedSourcesConfig = {
        health: updated.find((c) => c.id === 'health')?.enabled ?? true,
        gcal: updated.find((c) => c.id === 'gcal')?.enabled ?? true,
        todoist: updated.find((c) => c.id === 'todoist')?.enabled ?? false,
        glucose: updated.find((c) => c.id === 'glucose')?.enabled ?? false,
      };
      syncService.setConnectedSources(config);
      return updated;
    });
  };

  const handleBuildCurve = async () => {
    setIsSyncing(true);
    try {
      await syncService.syncAll();
      await storage.set(STORAGE_KEYS.hasCompletedOnboarding, true);
    } catch (e) {
      console.warn('Failed executing sync on onboarding complete:', e);
    } finally {
      setIsSyncing(false);
      onComplete?.();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <DotMatrixBackground />

      <SafeAreaView style={styles.safeArea}>
        {/* Top Header with Theme Switcher Pill */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[
              styles.themeToggle,
              { backgroundColor: theme.primarySurface, borderColor: theme.border },
            ]}
            onPress={toggleTheme}
            activeOpacity={0.8}
          >
            <Text style={[styles.themeToggleText, { color: theme.secondaryText }]}>
              {isDark ? '🌙 Moonlight' : '☀️ Daylight'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Text style={[styles.brandLabel, { color: theme.secondaryText, fontFamily: FONTS.urbanistSemiBold }]}>
            CADENCE
          </Text>

          <Text style={[styles.heading, { color: theme.text, fontFamily: FONTS.urbanistLight }]}>
            Let your body set the schedule
          </Text>

          <Text style={[styles.subheading, { color: theme.secondaryText, fontFamily: FONTS.urbanistRegular }]}>
            Connect the data that shapes your daily energy curve.
          </Text>

          {/* Connection Cards */}
          <View style={styles.cardsContainer}>
            {connections.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.primarySurface,
                    borderColor: theme.border,
                  },
                ]}
                activeOpacity={0.85}
                onPress={() => toggleConnection(item.id)}
              >
                <View style={styles.cardInner}>
                  {/* Badge */}
                  <View
                    style={[
                      styles.badgeCircle,
                      {
                        backgroundColor: theme.secondarySurface,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Text style={[styles.badgeText, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                      {item.badge}
                    </Text>
                  </View>

                  {/* Info */}
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardTitle, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.cardDescription, { color: theme.secondaryText, fontFamily: FONTS.urbanistRegular }]}>
                      {item.description}
                    </Text>
                  </View>

                  {/* Toggle Pill */}
                  <View
                    style={[
                      styles.switchPill,
                      {
                        backgroundColor: item.enabled
                          ? theme.primaryOlive
                          : isDark
                          ? '#2F2F33'
                          : '#DDD8CE',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.switchKnob,
                        {
                          left: item.enabled ? 22 : 3,
                        },
                      ]}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Privacy Note */}
          <Text style={[styles.privacyNote, { color: theme.secondaryText, fontFamily: FONTS.urbanistRegular }]}>
            Biometrics are processed on this device and never leave it.
          </Text>
        </ScrollView>

        {/* CTA Bottom Button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.primaryOlive }]}
            onPress={handleBuildCurve}
            disabled={isSyncing}
            activeOpacity={0.88}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#0A0B0D" />
            ) : (
              <Text style={[styles.primaryButtonText, { fontFamily: FONTS.urbanistBold }]}>
                Build my energy curve
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  themeToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  themeToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 110,
  },
  brandLabel: {
    fontSize: 13,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  heading: {
    fontSize: 35,
    lineHeight: 41,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  subheading: {
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 26,
  },
  cardsContainer: {
    gap: 12,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  badgeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 13,
  },
  switchPill: {
    width: 48,
    height: 28,
    borderRadius: 14,
    position: 'relative',
    justifyContent: 'center',
  },
  switchKnob: {
    position: 'absolute',
    top: 3,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  privacyNote: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 18,
    paddingHorizontal: 4,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 28,
    left: 20,
    right: 20,
  },
  primaryButton: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0A0B0D',
  },
});

