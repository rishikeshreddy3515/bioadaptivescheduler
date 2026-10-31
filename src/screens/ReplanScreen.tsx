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
import { useTaskStore } from '../store/useTaskStore';
import { useEnergyStore } from '../store/useEnergyStore';
import { aiScheduler, ReplanResult } from '../services/aiScheduler';

interface ReplanScreenProps {
  onClose?: () => void;
  onApplyReplan?: () => void;
  slipReason?: string;
  overdueMinutes?: number;
}

export const ReplanScreen: React.FC<ReplanScreenProps> = ({
  onClose,
  onApplyReplan,
  slipReason = 'Design review ran 30 min over',
  overdueMinutes = 30,
}) => {
  const { theme, isDark } = useTheme();
  const { tasks, scheduleTaskToTimeline } = useTaskStore();
  const { activeRoutineAtom } = useEnergyStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [replanData, setReplanData] = useState<ReplanResult | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const fetchAiReplan = async () => {
      try {
        const remaining = tasks.filter((t) => !t.isCompleted);
        const result = await aiScheduler.getReplan({
          triggerReason: slipReason,
          overdueMinutes,
          routine: activeRoutineAtom,
          remainingSchedule: remaining.map((t) => ({
            id: t.id,
            title: t.title,
            category: t.taskCategory,
            scheduledStartTime: t.scheduledStartTime,
            scheduledEndTime: t.scheduledEndTime,
            durationMinutes: t.durationMinutes || t.estimatedDurationMinutes,
            priority: t.priority,
            isCompleted: t.isCompleted,
          })),
        });

        if (isMounted) {
          setReplanData(result);
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchAiReplan();

    return () => {
      isMounted = false;
    };
  }, [slipReason, overdueMinutes, activeRoutineAtom, tasks]);

  const handleApply = async () => {
    if (replanData && replanData.suggested_changes) {
      setIsApplying(true);
      const today = new Date().toISOString().split('T')[0];
      for (const change of replanData.suggested_changes) {
        const target = tasks.find(
          (t) =>
            t.id === change.taskId ||
            t.title.toLowerCase().includes(change.title.toLowerCase())
        );
        if (target) {
          await scheduleTaskToTimeline(target.id, `${today}T${change.newStartTime}:00`);
        }
      }
      setIsApplying(false);
    }
    onApplyReplan?.();
    onClose?.();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <DotMatrixBackground />

      <SafeAreaView style={styles.safeArea}>
        {/* Top Header */}
        <View style={styles.topNavRow}>
          <TouchableOpacity
            style={[
              styles.navCircleBtn,
              { backgroundColor: theme.primarySurface, borderColor: theme.border },
            ]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={[styles.backArrow, { color: theme.text, fontFamily: FONTS.urbanistBold }]}>
              ←
            </Text>
          </TouchableOpacity>

          <Text style={[styles.navTitle, { color: theme.text, fontFamily: FONTS.urbanistRegular }]}>
            Replan
          </Text>

          <View style={styles.navCirclePlaceholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Alert Banner in peachTint */}
          <View
            style={[
              styles.alertBanner,
              {
                backgroundColor: theme.tints.peachTint.bg,
                borderColor: theme.indicators.caffeineCutoff,
              },
            ]}
          >
            <View
              style={[
                styles.alertDot,
                { backgroundColor: theme.indicators.caffeineCutoff },
              ]}
            />
            <View style={styles.alertContent}>
              <Text
                style={[
                  styles.alertLabel,
                  {
                    color: isDark ? theme.tints.peachTint.text : theme.tints.peachTint.text,
                    fontFamily: FONTS.urbanistRegular,
                  },
                ]}
              >
                Running behind
              </Text>
              <Text
                style={[
                  styles.alertTitle,
                  {
                    color: theme.text,
                    fontFamily: FONTS.urbanistSemiBold,
                  },
                ]}
              >
                {replanData?.headline || slipReason}
              </Text>
            </View>
          </View>

          {/* Section: Suggested Changes */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.secondaryText, fontFamily: FONTS.urbanistMedium }]}>
              Suggested changes
            </Text>
          </View>

          {/* Loading State Spinner */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primaryOlive} />
              <Text style={[styles.loadingText, { color: theme.secondaryText, fontFamily: FONTS.urbanistMedium }]}>
                Cadence AI is chronobiologically optimizing your schedule with Gemini...
              </Text>
            </View>
          )}

          {/* Dynamically Rendered Diff Cards from Gemini */}
          {!isLoading &&
            replanData?.suggested_changes?.map((change, index) => {
              const dotColor =
                change.indicator === 'peak' || change.indicator === 'secondWind'
                  ? theme.indicators.peak
                  : change.indicator === 'slump'
                  ? theme.indicators.slump
                  : change.indicator === 'meal'
                  ? theme.indicators.meal
                  : theme.indicators.caffeineCutoff;

              return (
                <View
                  key={`${change.title}-${index}`}
                  style={[
                    styles.diffCard,
                    { backgroundColor: theme.primarySurface, borderColor: theme.border },
                  ]}
                >
                  <View style={styles.diffCardHeader}>
                    <View style={[styles.diffDot, { backgroundColor: dotColor }]} />
                    <Text style={[styles.diffTitle, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                      {change.title}
                    </Text>
                  </View>

                  <View style={styles.timeDiffRow}>
                    <Text style={[styles.timeOld, { color: theme.secondaryText, fontFamily: FONTS.dotoBold }]}>
                      {change.originalStartTime}
                    </Text>
                    <Text style={[styles.arrowSym, { color: theme.secondaryText, fontFamily: FONTS.urbanistMedium }]}>
                      →
                    </Text>
                    <Text style={[styles.timeNew, { color: theme.text, fontFamily: FONTS.dotoBold }]}>
                      {change.newStartTime}
                    </Text>
                  </View>

                  <Text style={[styles.diffReason, { color: theme.secondaryText, fontFamily: FONTS.urbanistRegular }]}>
                    {change.reason}
                  </Text>
                </View>
              );
            })}
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.applyBtn, { backgroundColor: theme.primaryOlive }]}
            onPress={handleApply}
            disabled={isApplying || isLoading}
            activeOpacity={0.88}
          >
            {isApplying ? (
              <ActivityIndicator size="small" color="#0A0B0D" />
            ) : (
              <Text style={[styles.applyBtnText, { fontFamily: FONTS.urbanistBold }]}>
                Apply replan
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.keepBtn,
              { backgroundColor: theme.secondarySurface, borderColor: theme.border },
            ]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={[styles.keepBtnText, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
              Keep my schedule
            </Text>
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
  topNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  navCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 20,
  },
  navTitle: {
    fontSize: 18,
  },
  navCirclePlaceholder: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 160,
  },
  alertBanner: {
    borderRadius: 24,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  alertDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  alertContent: {
    flex: 1,
  },
  alertLabel: {
    fontSize: 13,
    marginBottom: 2,
  },
  alertTitle: {
    fontSize: 17,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 20,
  },
  diffCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 12,
  },
  diffCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  diffDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  diffTitle: {
    fontSize: 16,
  },
  timeDiffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 22,
    marginBottom: 4,
  },
  timeOld: {
    fontSize: 20,
    opacity: 0.5,
  },
  arrowSym: {
    fontSize: 16,
  },
  timeNew: {
    fontSize: 20,
  },
  diffReason: {
    fontSize: 13,
    marginLeft: 22,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    gap: 10,
  },
  applyBtn: {
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  applyBtnText: {
    fontSize: 16,
    color: '#0A0B0D',
  },
  keepBtn: {
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepBtnText: {
    fontSize: 16,
  },
});
