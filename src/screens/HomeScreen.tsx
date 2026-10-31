import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useAuthStore } from '../store/useAuthStore';
import { useCalendarStore } from '../store/useCalendarStore';
import { useEnergyStore } from '../store/useEnergyStore';
import { useTaskStore } from '../store/useTaskStore';
import { CalendarHeader } from '../components/calendar/CalendarHeader';
import { AllDayEventsBar } from '../components/calendar/AllDayEventsBar';
import { EnergyCurveWidget } from '../components/energy/EnergyCurveWidget';
import { CalendarTimeline } from '../components/calendar/CalendarTimeline';
import { TaskPriorityBoard } from '../components/tasks/TaskPriorityBoard';

export const HomeScreen: React.FC = () => {
  const { user, profile, signOut, openAuthScreen, isLoading: authLoading } = useAuthStore();
  const { hydrate: hydrateCalendar } = useCalendarStore();
  const { hydrate: hydrateEnergy } = useEnergyStore();
  const { hydrate: hydrateTasks, overdueTasksCountSelector } = useTaskStore();

  const taskBoardModalRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    hydrateCalendar();
    hydrateEnergy();
    hydrateTasks();
  }, [hydrateCalendar, hydrateEnergy, hydrateTasks]);

  const isGuest = profile?.isGuest ?? (user?.user_metadata?.isGuest ?? false);
  const userDisplay = isGuest ? 'Guest Explorer' : (user?.email || profile?.email || 'User');
  const overdueCount = overdueTasksCountSelector();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top App Bar */}
        <View style={styles.topBar}>
          <View style={styles.brandingBox}>
            <View style={styles.brandDot} />
            <Text style={styles.brandTitle}>LIFESTACK</Text>
            <Text style={styles.userSubtitle} numberOfLines={1}>
              • {userDisplay}
            </Text>
          </View>

          <View style={styles.topRightActions}>
            {/* Task Priority Board Trigger */}
            <TouchableOpacity
              style={styles.taskBoardTrigger}
              onPress={() => taskBoardModalRef.current?.present()}
              activeOpacity={0.7}
            >
              <Text style={styles.taskBoardTriggerText}>📋 Tasks</Text>
              {overdueCount > 0 && (
                <View style={styles.overdueBadgeIndicator}>
                  <Text style={styles.overdueBadgeNumber}>{overdueCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={isGuest ? styles.signInBtn : styles.signOutBtn}
              onPress={isGuest ? openAuthScreen : signOut}
              disabled={authLoading}
              activeOpacity={0.7}
            >
              {authLoading ? (
                <ActivityIndicator size="small" color={isGuest ? '#38BDF8' : '#F87171'} />
              ) : (
                <Text style={isGuest ? styles.signInText : styles.signOutText}>
                  {isGuest ? 'Sign In' : 'Sign Out'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Calendar Navigation Header & Filter Bar */}
        <CalendarHeader />

        {/* All-Day Milestones Strip */}
        <AllDayEventsBar />

        {/* Circadian Energy Curve & Protocol Widget (Section 2 & 5) */}
        <EnergyCurveWidget />

        {/* Main Hardware-Accelerated Skia Timeline */}
        <CalendarTimeline />

        {/* Floating Quick Action: Task Priority Board */}
        <TouchableOpacity
          style={styles.floatingTaskBtn}
          onPress={() => taskBoardModalRef.current?.present()}
          activeOpacity={0.85}
        >
          <Text style={styles.floatingTaskIcon}>📋</Text>
          <Text style={styles.floatingTaskBtnText}>Task Board</Text>
          {overdueCount > 0 && (
            <View style={styles.floatingOverdueDot} />
          )}
        </TouchableOpacity>

        {/* Task Priority Board Modal Sheet (Section 2 & Section 5) */}
        <TaskPriorityBoard ref={taskBoardModalRef} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  brandingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#38BDF8',
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 1.2,
  },
  userSubtitle: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskBoardTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: '#38BDF8',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 5,
  },
  taskBoardTriggerText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  overdueBadgeIndicator: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  overdueBadgeNumber: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  floatingTaskBtn: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: '#38BDF8',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 24,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    gap: 6,
  },
  floatingTaskIcon: {
    fontSize: 15,
  },
  floatingTaskBtnText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
  },
  floatingOverdueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  signInBtn: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: '#38BDF8',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  signInText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  signOutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  signOutText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '700',
  },
});
