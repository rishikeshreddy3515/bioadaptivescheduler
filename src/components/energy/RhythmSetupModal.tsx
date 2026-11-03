import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../theme/useTheme';
import { FONTS } from '../../theme/typography';
import { useEnergyStore } from '../../store/useEnergyStore';
import { Chronotype, RoutineModel } from '../../types/energy';

interface RhythmSetupModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: (routine: RoutineModel) => void;
}

const WAKE_TIMES = ['05:30', '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00'];
const SLEEP_TIMES = ['21:00', '21:30', '22:00', '22:30', '23:00', '23:30', '00:00', '00:30'];
const SLUMP_WINDOWS = [
  { label: '13:00 – 15:00', start: '13:00', end: '15:00' },
  { label: '13:30 – 15:30', start: '13:30', end: '15:30' },
  { label: '14:00 – 16:00', start: '14:00', end: '16:00' },
];
const SECOND_WINDS = [
  { label: '16:30 – 18:00', start: '16:30', end: '18:00' },
  { label: '17:00 – 18:30', start: '17:00', end: '18:30' },
  { label: '18:00 – 19:30', start: '18:00', end: '19:30' },
];

export const RhythmSetupModal: React.FC<RhythmSetupModalProps> = ({
  visible,
  onClose,
  onSaved,
}) => {
  const { theme, isDark } = useTheme();
  const { activeRoutineAtom, setActiveRoutine } = useEnergyStore();

  const [wakeTime, setWakeTime] = useState(activeRoutineAtom?.wakeTime || '06:30');
  const [sleepTime, setSleepTime] = useState(activeRoutineAtom?.sleepTime || '22:30');
  const [chronotype, setChronotype] = useState<Chronotype>(activeRoutineAtom?.chronotype || 'MODERATE');
  const [slumpWindow, setSlumpWindow] = useState('13:00 – 15:00');
  const [secondWind, setSecondWind] = useState(
    `${activeRoutineAtom?.secondWindStart || '16:30'} – ${activeRoutineAtom?.secondWindEnd || '18:00'}`
  );
  const [caffeineCutoff, setCaffeineCutoff] = useState(activeRoutineAtom?.caffeineCutoff || '14:00');
  const [isSaving, setIsSaving] = useState(false);

  const chronotypes: { key: Chronotype; icon: string; title: string; desc: string; peak: string }[] = [
    {
      key: 'EARLY_BIRD',
      icon: '🌅',
      title: 'Morning Lark',
      desc: 'Wake up naturally early; peak mental focus happens 2–4 hours after sunrise.',
      peak: '08:30 – 11:30',
    },
    {
      key: 'MODERATE',
      icon: '☀️',
      title: 'Intermediate',
      desc: 'Standard balanced diurnal cycle; peak mental focus mid-morning into midday.',
      peak: '09:30 – 12:30',
    },
    {
      key: 'NIGHT_OWL',
      icon: '🌙',
      title: 'Night Owl',
      desc: 'Later rise & sleep times; second wind and primary focus surge in afternoon/evening.',
      peak: '14:00 – 18:00',
    },
  ];

  const handleSave = async () => {
    setIsSaving(true);

    const [wakeH, wakeM] = wakeTime.split(':').map(Number);
    const [sleepH, sleepM] = sleepTime.split(':').map(Number);

    let sleepDuration = (sleepH + sleepM / 60) - (wakeH + wakeM / 60);
    if (sleepDuration < 0) sleepDuration += 24;
    const targetSleep = Math.max(6, Math.min(10, Math.round(24 - sleepDuration)));

    const windDownH = (sleepH - 1 + 24) % 24;
    const windDownStr = `${String(windDownH).padStart(2, '0')}:${String(sleepM).padStart(2, '0')}`;

    const secondWindParts = secondWind.split('–').map((s) => s.trim());
    const secondWindStart = secondWindParts[0] || '16:30';
    const secondWindEnd = secondWindParts[1] || '18:00';

    const newRoutine: RoutineModel = {
      ...activeRoutineAtom,
      name: 'Personalized Circadian Routine',
      wakeTime,
      sleepTime,
      windDownTime: windDownStr,
      targetSleepHours: targetSleep,
      chronotype,
      caffeineCutoff,
      secondWindStart,
      secondWindEnd,
    };

    try {
      await setActiveRoutine(newRoutine);
      onSaved?.(newRoutine);
      onClose();
    } catch (e) {
      console.warn('Error saving routine:', e);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <BlurView intensity={25} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />

        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? '#141A13' : '#FCFBF7', borderColor: theme.border }]}>
            {/* Header */}
            <View style={styles.headerRow}>
              <View>
                <Text style={[styles.badgeText, { color: theme.primaryOlive, fontFamily: FONTS.urbanistBold }]}>
                  CIRCADIAN PERSONALIZATION
                </Text>
                <Text style={[styles.modalTitle, { color: theme.text, fontFamily: FONTS.urbanistBold }]}>
                  Your Sleeping Habits & Routine
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: theme.primarySurface, borderColor: theme.border }]}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={[styles.closeIcon, { color: theme.text, fontFamily: FONTS.urbanistBold }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              <Text style={[styles.introText, { color: theme.secondaryText, fontFamily: FONTS.urbanistRegular }]}>
                CADENCE uses your natural biological rhythm to schedule deep work in peak cognitive windows and administrative work in energy dips.
              </Text>

              {/* Question 1: What time do you usually wake up? */}
              <View style={styles.questionSection}>
                <Text style={[styles.questionLabel, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                  1. What time do you usually wake up?
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                  {WAKE_TIMES.map((time) => {
                    const isSelected = wakeTime === time;
                    return (
                      <TouchableOpacity
                        key={time}
                        style={[
                          styles.timeChip,
                          {
                            backgroundColor: isSelected ? theme.primaryOlive : (isDark ? 'rgba(255,255,255,0.06)' : '#EBE7DE'),
                            borderColor: isSelected ? theme.primaryOlive : theme.border,
                          },
                        ]}
                        onPress={() => setWakeTime(time)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.timeChipText,
                            {
                              color: isSelected ? '#0D130C' : theme.text,
                              fontFamily: isSelected ? FONTS.dotoBold : FONTS.urbanistMedium,
                            },
                          ]}
                        >
                          {time}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Question 2: What is your Chronotype? */}
              <View style={styles.questionSection}>
                <Text style={[styles.questionLabel, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                  2. What is your natural Chronotype?
                </Text>

                {chronotypes.map((item) => {
                  const isSelected = chronotype === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[
                        styles.chronotypeCard,
                        {
                          backgroundColor: isSelected
                            ? isDark ? 'rgba(42, 212, 240, 0.12)' : 'rgba(54, 126, 135, 0.12)'
                            : (isDark ? 'rgba(255, 255, 255, 0.04)' : '#F2EFE9'),
                          borderColor: isSelected ? theme.indicators.peak : theme.border,
                          borderWidth: isSelected ? 1.8 : 1,
                        },
                      ]}
                      onPress={() => setChronotype(item.key)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.chronotypeHeader}>
                        <Text style={{ fontSize: 20, marginRight: 8 }}>{item.icon}</Text>
                        <Text style={[styles.chronoTitle, { color: theme.text, fontFamily: FONTS.urbanistBold }]}>
                          {item.title}
                        </Text>
                        <View style={[styles.peakBadge, { backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : '#E0DCD3' }]}>
                          <Text style={[styles.peakBadgeText, { color: theme.indicators.peak, fontFamily: FONTS.dotoBold }]}>
                            {item.peak}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.chronoDesc, { color: theme.secondaryText, fontFamily: FONTS.urbanistRegular }]}>
                        {item.desc}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Question 3: Bedtime / Wind-down time */}
              <View style={styles.questionSection}>
                <Text style={[styles.questionLabel, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                  3. What time do you wind down and go to sleep?
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                  {SLEEP_TIMES.map((time) => {
                    const isSelected = sleepTime === time;
                    return (
                      <TouchableOpacity
                        key={time}
                        style={[
                          styles.timeChip,
                          {
                            backgroundColor: isSelected ? theme.primaryOlive : (isDark ? 'rgba(255,255,255,0.06)' : '#EBE7DE'),
                            borderColor: isSelected ? theme.primaryOlive : theme.border,
                          },
                        ]}
                        onPress={() => setSleepTime(time)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.timeChipText,
                            {
                              color: isSelected ? '#0D130C' : theme.text,
                              fontFamily: isSelected ? FONTS.dotoBold : FONTS.urbanistMedium,
                            },
                          ]}
                        >
                          {time}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Question 4: Afternoon Slump */}
              <View style={styles.questionSection}>
                <Text style={[styles.questionLabel, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                  4. When do you feel your afternoon energy dip?
                </Text>
                <View style={styles.optionsWrap}>
                  {SLUMP_WINDOWS.map((item) => {
                    const isSelected = slumpWindow === item.label;
                    return (
                      <TouchableOpacity
                        key={item.label}
                        style={[
                          styles.optionPill,
                          {
                            backgroundColor: isSelected ? theme.indicators.slump : (isDark ? 'rgba(255,255,255,0.06)' : '#EBE7DE'),
                            borderColor: isSelected ? theme.indicators.slump : theme.border,
                          },
                        ]}
                        onPress={() => setSlumpWindow(item.label)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.optionPillText,
                            {
                              color: isSelected ? '#1A1100' : theme.text,
                              fontFamily: isSelected ? FONTS.urbanistBold : FONTS.urbanistMedium,
                            },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Question 5: Evening Second Wind */}
              <View style={styles.questionSection}>
                <Text style={[styles.questionLabel, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                  5. Evening second wind window
                </Text>
                <View style={styles.optionsWrap}>
                  {SECOND_WINDS.map((item) => {
                    const isSelected = secondWind === item.label;
                    return (
                      <TouchableOpacity
                        key={item.label}
                        style={[
                          styles.optionPill,
                          {
                            backgroundColor: isSelected ? theme.indicators.peak : (isDark ? 'rgba(255,255,255,0.06)' : '#EBE7DE'),
                            borderColor: isSelected ? theme.indicators.peak : theme.border,
                          },
                        ]}
                        onPress={() => setSecondWind(item.label)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.optionPillText,
                            {
                              color: isSelected ? '#0B2B26' : theme.text,
                              fontFamily: isSelected ? FONTS.urbanistBold : FONTS.urbanistMedium,
                            },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Question 6: Caffeine Cutoff */}
              <View style={styles.questionSection}>
                <Text style={[styles.questionLabel, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                  6. Daily Caffeine Cutoff (Protects tonight's deep sleep)
                </Text>
                <View style={styles.optionsWrap}>
                  {['13:00', '13:30', '14:00', '14:30', '15:00'].map((time) => {
                    const isSelected = caffeineCutoff === time;
                    return (
                      <TouchableOpacity
                        key={time}
                        style={[
                          styles.timeChip,
                          {
                            backgroundColor: isSelected ? theme.indicators.caffeineCutoff : (isDark ? 'rgba(255,255,255,0.06)' : '#EBE7DE'),
                            borderColor: isSelected ? theme.indicators.caffeineCutoff : theme.border,
                          },
                        ]}
                        onPress={() => setCaffeineCutoff(time)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.timeChipText,
                            {
                              color: isSelected ? '#FFF' : theme.text,
                              fontFamily: isSelected ? FONTS.dotoBold : FONTS.urbanistMedium,
                            },
                          ]}
                        >
                          {time}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            {/* Save Button */}
            <View style={styles.footerRow}>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: theme.primaryOlive }]}
                onPress={handleSave}
                disabled={isSaving}
                activeOpacity={0.85}
              >
                {isSaving ? (
                  <ActivityIndicator color="#0D130C" />
                ) : (
                  <Text style={[styles.saveBtnText, { fontFamily: FONTS.urbanistBold }]}>
                    Save Personalized Rhythm
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  safeArea: {
    maxHeight: '92%',
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
    height: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 20,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 13,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  introText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  questionSection: {
    marginBottom: 20,
  },
  questionLabel: {
    fontSize: 14,
    marginBottom: 10,
  },
  chipsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  timeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  timeChipText: {
    fontSize: 13,
  },
  chronotypeCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  chronotypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  chronoTitle: {
    fontSize: 15,
    flex: 1,
  },
  peakBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  peakBadgeText: {
    fontSize: 11,
  },
  chronoDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  optionPillText: {
    fontSize: 12.5,
  },
  footerRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  saveBtn: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  saveBtnText: {
    fontSize: 16,
    color: '#0D130C',
  },
});
