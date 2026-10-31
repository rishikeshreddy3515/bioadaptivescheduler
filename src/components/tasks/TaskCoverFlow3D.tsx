import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import Animated, {
  SharedValue,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../theme/useTheme';
import { FONTS } from '../../theme/typography';
import { CadenceActivity, ACTIVITY_COLORS } from '../../theme/colors';

export interface CoverFlowTaskItem {
  id: string;
  title: string;
  category: CadenceActivity;
  durationMinutes: number;
  bestTime: string;
  windowLabel: string;
  isEmerald?: boolean;
  userCount?: number;
  tabLabel?: string;
  skeletonLines?: number;
}

interface TaskCoverFlow3DProps {
  tasks: CoverFlowTaskItem[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  activeActivity: CadenceActivity;
  activeDuration: number;
  taskTitle: string;
  bestTime?: string;
  windowLabel?: string;
}

const CARD_WIDTH = 205;
const CARD_HEIGHT = 215;
const ITEM_INTERVAL = 120; // Exact overlap from design mockup (Image 1, 2, 3)

export const TaskCoverFlow3D: React.FC<TaskCoverFlow3DProps> = ({
  tasks,
  selectedIndex,
  onSelectIndex,
  activeActivity,
  activeDuration,
  taskTitle,
  bestTime,
  windowLabel,
}) => {
  const { width } = useWindowDimensions();
  const { isDark } = useTheme();
  const scrollX = useSharedValue(selectedIndex * ITEM_INTERVAL);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const idx = Math.round(event.nativeEvent.contentOffset.x / ITEM_INTERVAL);
    if (idx >= 0 && idx < tasks.length && idx !== selectedIndex) {
      onSelectIndex(idx);
    }
  };

  const centerSpacer = (width - CARD_WIDTH) / 2;
  const spec = ACTIVITY_COLORS[activeActivity] || ACTIVITY_COLORS.deep_work;
  const activeColor = isDark ? spec.dark : spec.light;

  return (
    <View style={styles.carouselContainer}>
      <Animated.FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: centerSpacer,
          paddingVertical: 18,
          alignItems: 'center',
        }}
        snapToInterval={ITEM_INTERVAL}
        decelerationRate="fast"
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        renderItem={({ item, index }) => (
          <CoverFlowCard
            item={item}
            index={index}
            scrollX={scrollX}
            isCenter={index === selectedIndex}
            activeColor={activeColor}
            activeActivity={activeActivity}
            activeDuration={activeDuration}
            taskTitle={taskTitle}
            bestTime={bestTime}
            windowLabel={windowLabel}
          />
        )}
      />
    </View>
  );
};

interface CoverFlowCardProps {
  item: CoverFlowTaskItem;
  index: number;
  scrollX: SharedValue<number>;
  isCenter: boolean;
  activeColor: string;
  activeActivity: CadenceActivity;
  activeDuration: number;
  taskTitle: string;
  bestTime?: string;
  windowLabel?: string;
}

const CoverFlowCard: React.FC<CoverFlowCardProps> = ({
  item,
  index,
  scrollX,
  isCenter,
  activeColor,
  activeActivity,
  activeDuration,
  taskTitle,
  bestTime,
  windowLabel,
}) => {
  const { isDark } = useTheme();

  const animatedStyle = useAnimatedStyle(() => {
    const itemPosition = index * ITEM_INTERVAL;
    const diff = (scrollX.value - itemPosition) / ITEM_INTERVAL;

    // 3D Rotation: left cards rotate inward +44deg, right cards rotate inward -44deg
    const rotateY = interpolate(
      diff,
      [-3, -2, -1, 0, 1, 2, 3],
      [-50, -46, -42, 0, 42, 46, 50],
      Extrapolation.CLAMP
    );

    // Scale: center card is enlarged (1.06), side cards scale down
    const scale = interpolate(
      diff,
      [-2, -1, 0, 1, 2],
      [0.80, 0.88, 1.06, 0.88, 0.80],
      Extrapolation.CLAMP
    );

    // Overlap translation along x-axis
    const translateX = interpolate(
      diff,
      [-2, -1, 0, 1, 2],
      [-28, -14, 0, 14, 28],
      Extrapolation.CLAMP
    );

    // Opacity
    const opacity = interpolate(
      diff,
      [-3, -2, -1, 0, 1, 2, 3],
      [0.35, 0.65, 0.92, 1, 0.92, 0.65, 0.35],
      Extrapolation.CLAMP
    );

    // Dynamic zIndex: highest at center
    const zIndex = Math.round(100 - Math.abs(diff) * 12);

    return {
      zIndex,
      opacity,
      transform: [
        { perspective: 1000 },
        { translateX },
        { rotateY: `${rotateY}deg` },
        { scale },
      ],
    };
  });

  const displayTitle = isCenter && taskTitle.trim() ? taskTitle : item.title;
  const displayDuration = isCenter ? activeDuration : item.durationMinutes;
  const displayBestTime = isCenter && bestTime ? bestTime : item.bestTime;
  const displayWindowLabel = isCenter && windowLabel ? windowLabel : item.windowLabel;
  const spec = ACTIVITY_COLORS[isCenter ? activeActivity : item.category] || ACTIVITY_COLORS.deep_work;
  const categoryLabel = spec.label;

  // Render glowing Emerald folder card (from Image 1, 2, 3)
  if (!isCenter && item.isEmerald) {
    return (
      <Animated.View style={[styles.cardWrapper, animatedStyle]}>
        <View style={[styles.glassCard, styles.emeraldCard]}>
          <BlurView
            intensity={25}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />

          {/* Folder Top Header with user badge */}
          <View style={styles.sideCardTop}>
            <View style={styles.userBadgeRow}>
              <Text style={styles.userBadgeIcon}>👤</Text>
              <Text style={styles.emeraldUserCount}>{item.userCount || 4}</Text>
            </View>
          </View>

          {/* Document Skeleton Lines in translucent mint/white */}
          <View style={styles.skeletonContainer}>
            <View style={[styles.skeletonLine, { width: '48%', backgroundColor: 'rgba(255, 255, 255, 0.45)', height: 6 }]} />
            <View style={[styles.skeletonLine, { width: '88%', backgroundColor: 'rgba(255, 255, 255, 0.3)', height: 4 }]} />
            <View style={[styles.skeletonLine, { width: '75%', backgroundColor: 'rgba(255, 255, 255, 0.3)', height: 4 }]} />
            <View style={[styles.skeletonLine, { width: '82%', backgroundColor: 'rgba(255, 255, 255, 0.3)', height: 4 }]} />
          </View>

          {/* Tab Label at bottom */}
          <View style={styles.sideCardBottom}>
            <Text style={[styles.emeraldTabLabel, { fontFamily: FONTS.urbanistBold }]}>
              {item.tabLabel || 'Peak focus'}
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  // Render frosted glass folder card (side cards in Image 1, 2, 3)
  if (!isCenter) {
    return (
      <Animated.View style={[styles.cardWrapper, animatedStyle]}>
        <View
          style={[
            styles.glassCard,
            styles.frostedSideCard,
            {
              backgroundColor: isDark
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(255, 255, 255, 0.75)',
              borderColor: isDark
                ? 'rgba(255, 255, 255, 0.18)'
                : 'rgba(0, 0, 0, 0.1)',
            },
          ]}
        >
          <BlurView
            intensity={20}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />

          {/* Header with user count */}
          <View style={styles.sideCardTop}>
            <View style={styles.userBadgeRow}>
              <Text style={[styles.userBadgeIcon, { color: isDark ? 'rgba(255, 255, 255, 0.7)' : '#333' }]}>👤</Text>
              <Text style={[styles.sideUserCount, { color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#222', fontFamily: FONTS.urbanistSemiBold }]}>
                {item.userCount || 4}
              </Text>
            </View>
          </View>

          {/* Document Skeleton Lines */}
          <View style={styles.skeletonContainer}>
            <View style={[styles.skeletonLine, { width: '45%', backgroundColor: isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.15)', height: 5 }]} />
            <View style={[styles.skeletonLine, { width: '84%', backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)', height: 4 }]} />
            <View style={[styles.skeletonLine, { width: '70%', backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)', height: 4 }]} />
            <View style={[styles.skeletonLine, { width: '78%', backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)', height: 4 }]} />
          </View>

          {/* Bottom Tab Title */}
          <View style={styles.sideCardBottom}>
            <Text
              style={[
                styles.sideTabLabel,
                {
                  color: isDark ? 'rgba(255, 255, 255, 0.8)' : '#222',
                  fontFamily: FONTS.urbanistSemiBold,
                },
              ]}
              numberOfLines={1}
            >
              {item.tabLabel || item.title}
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  // Render Center Interactive Card (Active Card in Image 3)
  return (
    <Animated.View style={[styles.cardWrapper, animatedStyle]}>
      <View
        style={[
          styles.glassCard,
          {
            backgroundColor: isDark
              ? 'rgba(29, 36, 26, 0.76)'
              : 'rgba(252, 251, 247, 0.88)',
            borderColor: activeColor,
            borderWidth: 1.8,
            shadowColor: activeColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.85,
            shadowRadius: 22,
            elevation: 12,
          },
        ]}
      >
        <BlurView
          intensity={25}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />

        {/* Card Header: Title, Category, Circle Arrow */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text
              style={[
                styles.taskTitleText,
                {
                  color: isDark ? '#FCFBF7' : '#161C14',
                  fontFamily: FONTS.urbanistBold,
                },
              ]}
              numberOfLines={1}
            >
              {displayTitle}
            </Text>
            <Text
              style={[
                styles.taskCategoryText,
                {
                  color: activeColor,
                  fontFamily: FONTS.urbanistMedium,
                },
              ]}
            >
              {categoryLabel}
            </Text>
          </View>

          <View style={styles.cardArrowCircle}>
            <Text style={{ fontSize: 13, color: isDark ? '#FFF' : '#000' }}>→</Text>
          </View>
        </View>

        {/* Card Center: Large Doto Duration Display */}
        <View style={styles.cardCenter}>
          <Text
            style={[
              styles.dotoDurationValue,
              {
                color: isDark ? '#FCFBF7' : '#161C14',
                fontFamily: FONTS.dotoBold,
              },
            ]}
          >
            {displayDuration} <Text style={styles.dotoMinUnit}>min</Text>
          </Text>
        </View>

        {/* Card Footer: Best Slot Pill with Colored Dots + Overlapping Avatars */}
        <View style={styles.cardFooter}>
          <View style={styles.slotPillWrapper}>
            <View
              style={[
                styles.slotCapsule,
                {
                  backgroundColor: isDark
                    ? 'rgba(0, 0, 0, 0.45)'
                    : 'rgba(0, 0, 0, 0.08)',
                },
              ]}
            >
              <Text style={styles.slotClockIcon}>🕒 1h</Text>
              {/* 3 Colored status dots */}
              <View style={styles.coloredDotsRow}>
                <View style={[styles.coloredDot, { backgroundColor: '#F59E0B' }]} />
                <View style={[styles.coloredDot, { backgroundColor: '#EF4444' }]} />
                <View style={[styles.coloredDot, { backgroundColor: '#10B981' }]} />
              </View>
              <Text
                style={[
                  styles.slotDetailsText,
                  {
                    color: isDark ? '#FCFBF7' : '#161C14',
                    fontFamily: FONTS.urbanistMedium,
                  },
                ]}
              >
                {displayBestTime} Mon · {displayWindowLabel}
              </Text>
            </View>
          </View>

          {/* Overlapping User Avatars from Image 3 */}
          <View style={styles.avatarRow}>
            <View style={[styles.avatarCircle, { backgroundColor: '#367E87' }]}>
              <Text style={styles.avatarInitial}>R</Text>
            </View>
            <View style={[styles.avatarCircle, { backgroundColor: '#AC5B47', marginLeft: -7 }]}>
              <Text style={styles.avatarInitial}>A</Text>
            </View>
            <View style={[styles.avatarCircle, { backgroundColor: '#4A7C59', marginLeft: -7 }]}>
              <Text style={styles.avatarInitial}>K</Text>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  carouselContainer: {
    height: 250,
    width: '100%',
    justifyContent: 'center',
    marginVertical: 4,
  },
  cardWrapper: {
    width: ITEM_INTERVAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 22,
    padding: 16,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  emeraldCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.42)',
    borderColor: '#34D399',
    borderWidth: 1.5,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.75,
    shadowRadius: 18,
    elevation: 8,
  },
  frostedSideCard: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  sideCardTop: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  userBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userBadgeIcon: {
    fontSize: 12,
  },
  emeraldUserCount: {
    fontSize: 13,
    color: '#FFF',
    fontWeight: '700',
  },
  sideUserCount: {
    fontSize: 12,
  },
  skeletonContainer: {
    marginVertical: 14,
    gap: 6,
  },
  skeletonLine: {
    borderRadius: 2,
  },
  sideCardBottom: {
    marginTop: 'auto',
  },
  emeraldTabLabel: {
    fontSize: 13,
    color: '#FFF',
    letterSpacing: 0.3,
  },
  sideTabLabel: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    marginRight: 8,
  },
  taskTitleText: {
    fontSize: 15,
    marginBottom: 2,
  },
  taskCategoryText: {
    fontSize: 12,
  },
  cardArrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  dotoDurationValue: {
    fontSize: 34,
    lineHeight: 38,
    textAlign: 'center',
  },
  dotoMinUnit: {
    fontSize: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slotPillWrapper: {
    flex: 1,
    marginRight: 6,
  },
  slotCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },
  slotClockIcon: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  coloredDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  coloredDot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
  },
  slotDetailsText: {
    fontSize: 10,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FCFBF7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 9,
    color: '#FCFBF7',
    fontWeight: '700',
  },
});
