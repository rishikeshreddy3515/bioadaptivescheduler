import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import Animated, {
  SharedValue,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
  runOnJS,
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
  showFloatingCorporateBadge?: boolean;
}

const CARD_WIDTH = 210;
const CARD_HEIGHT = 220;
const ITEM_INTERVAL = 115; // Overlap spacing matching Image 1, 2, and 3

export const TaskCoverFlow3D: React.FC<TaskCoverFlow3DProps> = ({
  tasks,
  selectedIndex,
  onSelectIndex,
  activeActivity,
  activeDuration,
  taskTitle,
  bestTime,
  windowLabel,
  showFloatingCorporateBadge = false,
}) => {
  const { width } = useWindowDimensions();
  const { isDark } = useTheme();
  const flatListRef = useRef<FlatList>(null);
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
    const clamped = Math.max(0, Math.min(tasks.length - 1, idx));
    if (clamped !== selectedIndex) {
      onSelectIndex(clamped);
    }
  };

  const handleCardPress = (index: number) => {
    if (index === selectedIndex) return;
    flatListRef.current?.scrollToOffset({
      offset: index * ITEM_INTERVAL,
      animated: true,
    });
    onSelectIndex(index);
  };

  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({
        offset: selectedIndex * ITEM_INTERVAL,
        animated: true,
      });
    }
  }, [selectedIndex]);

  const centerSpacer = (width - CARD_WIDTH) / 2;
  const spec = ACTIVITY_COLORS[activeActivity] || ACTIVITY_COLORS.deep_work;
  const activeColor = isDark ? spec.dark : spec.light;

  return (
    <View style={styles.carouselContainer}>
      {/* Optional Floating Corporate 87% Glass Badge (from Image 1 & 2) */}
      {showFloatingCorporateBadge && (
        <View style={styles.floatingCorporateBadge}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.corporateHeaderRow}>
            <View>
              <Text style={styles.corporateTitle}>Corporate</Text>
              <Text style={styles.corporateSubtitle}>Jan 01 - Mar 31</Text>
            </View>
            <View style={styles.corporateArrowBtn}>
              <Text style={styles.corporateArrowText}>→</Text>
            </View>
          </View>
          <View style={styles.corporateMetricRow}>
            <Text style={styles.corporateMetricText}>87%</Text>
            <View style={styles.corporateGreenDotWrapper}>
              <View style={styles.corporateGreenDotOuter}>
                <View style={styles.corporateGreenDotInner} />
              </View>
            </View>
          </View>
        </View>
      )}

      <Animated.FlatList
        ref={flatListRef as any}
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
        getItemLayout={(_, index) => ({
          length: ITEM_INTERVAL,
          offset: ITEM_INTERVAL * index,
          index,
        })}
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
            onPress={() => handleCardPress(index)}
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
  onPress: () => void;
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
  onPress,
}) => {
  const { isDark } = useTheme();

  const animatedStyle = useAnimatedStyle(() => {
    const itemPosition = index * ITEM_INTERVAL;
    const diff = (scrollX.value - itemPosition) / ITEM_INTERVAL;

    // 3D Perspective Rotation:
    // Left cards (diff > 0): left edge swings into screen (-Z), right edge closer to viewer (-38deg to -46deg)
    // Right cards (diff < 0): right edge swings into screen (-Z), left edge closer to viewer (+38deg to +46deg)
    // Center card (diff = 0): 0deg facing squarely forward!
    const rotateY = interpolate(
      diff,
      [-3, -2, -1, 0, 1, 2, 3],
      [46, 42, 38, 0, -38, -42, -46],
      Extrapolation.CLAMP
    );

    // Scale: center card is elevated (1.08), side cards scale down gracefully
    const scale = interpolate(
      diff,
      [-2, -1, 0, 1, 2],
      [0.82, 0.90, 1.08, 0.90, 0.82],
      Extrapolation.CLAMP
    );

    // Overlap translation along x-axis to tighten the deck
    const translateX = interpolate(
      diff,
      [-3, -2, -1, 0, 1, 2, 3],
      [-32, -22, -10, 0, 10, 22, 32],
      Extrapolation.CLAMP
    );

    // Subtle Opacity curve
    const opacity = interpolate(
      diff,
      [-3, -2, -1, 0, 1, 2, 3],
      [0.42, 0.72, 0.95, 1, 0.95, 0.72, 0.42],
      Extrapolation.CLAMP
    );

    // Dynamic zIndex: highest at center
    const zIndex = Math.round(100 - Math.abs(diff) * 15);

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

  // 1. Render glowing Emerald folder card (from Image 1, 2, 3)
  if (!isCenter && item.isEmerald) {
    return (
      <Animated.View style={[styles.cardWrapper, animatedStyle]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onPress}
          style={[styles.glassCard, styles.emeraldCard]}
        >
          <BlurView
            intensity={35}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />

          {/* Top Edge Specular Shine */}
          <View style={styles.topRimHighlight} />

          {/* Folder Top Header with user badge */}
          <View style={styles.sideCardTop}>
            <View style={styles.userBadgeCapsule}>
              <Text style={styles.userBadgeIcon}>👤</Text>
              <Text style={styles.emeraldUserCount}>{item.userCount || 4}</Text>
            </View>
          </View>

          {/* Document Skeleton Lines in translucent mint/white */}
          <View style={styles.skeletonContainer}>
            <View style={[styles.skeletonLine, { width: '48%', backgroundColor: 'rgba(255, 255, 255, 0.55)', height: 6 }]} />
            <View style={[styles.skeletonLine, { width: '88%', backgroundColor: 'rgba(255, 255, 255, 0.35)', height: 4.5 }]} />
            <View style={[styles.skeletonLine, { width: '74%', backgroundColor: 'rgba(255, 255, 255, 0.35)', height: 4.5 }]} />
            <View style={[styles.skeletonLine, { width: '82%', backgroundColor: 'rgba(255, 255, 255, 0.35)', height: 4.5 }]} />
          </View>

          {/* Tab Label at bottom */}
          <View style={styles.sideCardBottom}>
            <Text style={[styles.emeraldTabLabel, { fontFamily: FONTS.urbanistBold }]}>
              {item.tabLabel || 'Peak focus'}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // 2. Render frosted glass folder card (side cards in Image 1, 2, 3)
  if (!isCenter) {
    return (
      <Animated.View style={[styles.cardWrapper, animatedStyle]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onPress}
          style={[
            styles.glassCard,
            styles.frostedSideCard,
            {
              backgroundColor: isDark
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(255, 255, 255, 0.75)',
              borderColor: isDark
                ? 'rgba(255, 255, 255, 0.22)'
                : 'rgba(0, 0, 0, 0.1)',
            },
          ]}
        >
          <BlurView
            intensity={25}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />

          {/* Top Edge Specular Shine */}
          <View style={styles.topRimHighlight} />

          {/* Header with user count */}
          <View style={styles.sideCardTop}>
            <View
              style={[
                styles.userBadgeCapsule,
                {
                  backgroundColor: isDark ? 'rgba(0, 0, 0, 0.35)' : 'rgba(0, 0, 0, 0.06)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
                },
              ]}
            >
              <Text style={[styles.userBadgeIcon, { color: isDark ? 'rgba(255, 255, 255, 0.75)' : '#333' }]}>👤</Text>
              <Text style={[styles.sideUserCount, { color: isDark ? 'rgba(255, 255, 255, 0.9)' : '#222', fontFamily: FONTS.urbanistSemiBold }]}>
                {item.userCount || 4}
              </Text>
            </View>
          </View>

          {/* Document Skeleton Lines */}
          <View style={styles.skeletonContainer}>
            <View style={[styles.skeletonLine, { width: '46%', backgroundColor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.18)', height: 5.5 }]} />
            <View style={[styles.skeletonLine, { width: '85%', backgroundColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.09)', height: 4.5 }]} />
            <View style={[styles.skeletonLine, { width: '70%', backgroundColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.09)', height: 4.5 }]} />
            <View style={[styles.skeletonLine, { width: '78%', backgroundColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.09)', height: 4.5 }]} />
          </View>

          {/* Bottom Tab Title */}
          <View style={styles.sideCardBottom}>
            <Text
              style={[
                styles.sideTabLabel,
                {
                  color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#222',
                  fontFamily: FONTS.urbanistSemiBold,
                },
              ]}
              numberOfLines={1}
            >
              {item.tabLabel || item.title}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // 3. Render Center Interactive Card (Active Card in Image 3)
  return (
    <Animated.View style={[styles.cardWrapper, animatedStyle]}>
      <View
        style={[
          styles.glassCard,
          {
            backgroundColor: isDark
              ? 'rgba(25, 33, 24, 0.82)'
              : 'rgba(252, 251, 247, 0.92)',
            borderColor: activeColor,
            borderWidth: 1.8,
            shadowColor: activeColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: 26,
            elevation: 16,
          },
        ]}
      >
        <BlurView
          intensity={30}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />

        {/* Top Edge Specular Shine */}
        <View style={[styles.topRimHighlight, { backgroundColor: 'rgba(255, 255, 255, 0.35)' }]} />

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

        {/* Card Center: Large Doto Dot-Matrix Duration Display */}
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
                    ? 'rgba(0, 0, 0, 0.52)'
                    : 'rgba(0, 0, 0, 0.08)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)',
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
                numberOfLines={1}
              >
                {displayBestTime} Mon · {displayWindowLabel}
              </Text>
            </View>
          </View>

          {/* Overlapping User Avatars from Image 3 */}
          <View style={styles.avatarRow}>
            <View style={[styles.avatarCircle, { backgroundColor: '#2A7B88' }]}>
              <Text style={styles.avatarInitial}>R</Text>
            </View>
            <View style={[styles.avatarCircle, { backgroundColor: '#C25E42', marginLeft: -7 }]}>
              <Text style={styles.avatarInitial}>A</Text>
            </View>
            <View style={[styles.avatarCircle, { backgroundColor: '#3B8256', marginLeft: -7 }]}>
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
    height: 260,
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 24,
  },
  topRimHighlight: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 1.2,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderRadius: 1,
  },
  emeraldCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.52)',
    borderColor: '#34D399',
    borderWidth: 1.8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.88,
    shadowRadius: 22,
    elevation: 12,
  },
  frostedSideCard: {
    borderWidth: 1.2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  sideCardTop: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  userBadgeCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  userBadgeIcon: {
    fontSize: 11,
  },
  emeraldUserCount: {
    fontSize: 12,
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
    borderRadius: 2.5,
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
    letterSpacing: -0.2,
  },
  taskCategoryText: {
    fontSize: 12,
  },
  cardArrowCircle: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  cardCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  dotoDurationValue: {
    fontSize: 38,
    lineHeight: 42,
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  dotoMinUnit: {
    fontSize: 16,
    fontFamily: 'Urbanist_500Medium',
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
    borderWidth: 1,
    gap: 4,
  },
  slotClockIcon: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  coloredDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
  },
  coloredDot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
  },
  slotDetailsText: {
    fontSize: 9.5,
    flexShrink: 1,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarInitial: {
    fontSize: 9,
    color: '#FCFBF7',
    fontWeight: '700',
  },

  // Floating Corporate Stats Badge (from Image 1 & 2)
  floatingCorporateBadge: {
    position: 'absolute',
    top: 8,
    left: 20,
    zIndex: 150,
    width: 140,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    backgroundColor: 'rgba(30, 35, 30, 0.65)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  corporateHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  corporateTitle: {
    fontSize: 13,
    color: '#FCFBF7',
    fontFamily: 'Urbanist_700Bold',
  },
  corporateSubtitle: {
    fontSize: 9.5,
    color: 'rgba(255, 255, 255, 0.65)',
    fontFamily: 'Urbanist_400Regular',
  },
  corporateArrowBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corporateArrowText: {
    fontSize: 10,
    color: '#FFF',
  },
  corporateMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  corporateMetricText: {
    fontSize: 22,
    color: '#FCFBF7',
    fontFamily: 'Urbanist_700Bold',
  },
  corporateGreenDotWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  corporateGreenDotOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  corporateGreenDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0F172A',
  },
});
