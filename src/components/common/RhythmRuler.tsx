import React, { useMemo } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Canvas, Line, Circle, Rect, vec } from '@shopify/react-native-skia';
import { useTheme } from '../../theme/useTheme';
import { FONTS } from '../../theme/typography';

interface RhythmPhase {
  timeHours: number; // e.g. 8.5 = 08:30
  color: string;
  label: string;
}

interface RhythmRulerProps {
  currentHour?: number; // e.g. 9.25 = 09:15
}

export const RhythmRuler: React.FC<RhythmRulerProps> = ({ currentHour = 9.4 }) => {
  const { theme, isDark } = useTheme();
  const [containerWidth, setContainerWidth] = React.useState(320);

  const startHour = 6;
  const endHour = 22;
  const totalHours = endHour - startHour; // 16 hours

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setContainerWidth(w);
  };

  const phases: RhythmPhase[] = useMemo(() => [
    { timeHours: 8.0, color: theme.indicators.peak, label: 'Peak' },
    { timeHours: 10.5, color: theme.indicators.peak, label: 'Peak' },
    { timeHours: 12.5, color: theme.indicators.meal, label: 'Meal' },
    { timeHours: 14.0, color: theme.indicators.slump, label: 'Slump' },
    { timeHours: 15.0, color: theme.indicators.caffeineCutoff, label: 'Caffeine cutoff' },
    { timeHours: 19.5, color: theme.indicators.peak, label: 'Peak' },
  ], [theme]);

  // Compute tick lines
  const { ticks, nowX, phaseDots } = useMemo(() => {
    const tickList = [];
    const pad = 12;
    const usableW = Math.max(containerWidth - pad * 2, 100);

    const getX = (hour: number) => pad + ((hour - startHour) / totalHours) * usableW;

    // Tick every 30 mins (total 32 steps)
    const steps = totalHours * 2;
    const axisY = 66;

    for (let s = 0; s <= steps; s++) {
      const h = startHour + s * 0.5;
      const x = getX(h);
      const isMajor = s % 8 === 0; // Every 4 hours (06, 10, 14, 18, 22)
      const isHalf = s % 2 === 0;

      const tickH = isMajor ? 18 : isHalf ? 12 : 7;
      const p1 = vec(x, axisY - tickH);
      const p2 = vec(x, axisY);

      tickList.push({
        id: s,
        p1,
        p2,
        color: isMajor
          ? (isDark ? 'rgba(255, 255, 255, 0.75)' : 'rgba(0, 0, 0, 0.65)')
          : (isDark ? 'rgba(255, 255, 255, 0.28)' : 'rgba(0, 0, 0, 0.18)'),
        strokeWidth: isMajor ? 1.6 : 1.1,
      });
    }

    const calculatedNowX = getX(currentHour);

    const dots = phases.map((p, idx) => ({
      id: idx,
      cx: getX(p.timeHours),
      cy: 36,
      r: 4.8,
      color: p.color,
    }));

    return { ticks: tickList, nowX: calculatedNowX, phaseDots: dots };
  }, [containerWidth, startHour, totalHours, currentHour, isDark, phases]);

  return (
    <View style={styles.container} onLayout={onLayout}>
      {/* Skia Canvas for Ticks, Phase Dots & Now Pin Line */}
      <View style={{ height: 80, width: '100%' }}>
        <Canvas style={StyleSheet.absoluteFill}>
          {/* Ticks */}
          {ticks.map((t) => (
            <Line
              key={t.id}
              p1={t.p1}
              p2={t.p2}
              color={t.color}
              strokeWidth={t.strokeWidth}
              strokeCap="round"
            />
          ))}

          {/* Phase circles */}
          {phaseDots.map((dot) => (
            <Circle
              key={dot.id}
              cx={dot.cx}
              cy={dot.cy}
              r={dot.r}
              color={dot.color}
            />
          ))}

          {/* Now vertical indicator pin line */}
          <Line
            p1={vec(nowX, 22)}
            p2={vec(nowX, 66)}
            color={theme.primaryOlive}
            strokeWidth={1.8}
          />
        </Canvas>

        {/* 'Now' Pill Badge Floating Over Canvas */}
        <View
          style={[
            styles.nowBadge,
            {
              left: Math.max(nowX - 22, 6),
              backgroundColor: theme.primaryOlive,
            },
          ]}
        >
          <Text style={[styles.nowText, { fontFamily: FONTS.urbanistBold }]}>
            Now
          </Text>
        </View>
      </View>

      {/* Axis Hour Labels (06, 10, 14, 18, 22) */}
      <View style={styles.axisLabelsRow}>
        <Text style={[styles.axisLabel, { color: theme.secondaryText, fontFamily: FONTS.urbanistRegular }]}>06</Text>
        <Text style={[styles.axisLabel, { color: theme.secondaryText, fontFamily: FONTS.urbanistRegular }]}>10</Text>
        <Text style={[styles.axisLabel, { color: theme.secondaryText, fontFamily: FONTS.urbanistRegular }]}>14</Text>
        <Text style={[styles.axisLabel, { color: theme.secondaryText, fontFamily: FONTS.urbanistRegular }]}>18</Text>
        <Text style={[styles.axisLabel, { color: theme.secondaryText, fontFamily: FONTS.urbanistRegular }]}>22</Text>
      </View>

      {/* Legend Row */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.indicators.peak }]} />
          <Text style={[styles.legendText, { color: theme.secondaryText, fontFamily: FONTS.urbanistMedium }]}>
            Peak
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.indicators.meal }]} />
          <Text style={[styles.legendText, { color: theme.secondaryText, fontFamily: FONTS.urbanistMedium }]}>
            Meal
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.indicators.slump }]} />
          <Text style={[styles.legendText, { color: theme.secondaryText, fontFamily: FONTS.urbanistMedium }]}>
            Slump
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.indicators.caffeineCutoff }]} />
          <Text style={[styles.legendText, { color: theme.secondaryText, fontFamily: FONTS.urbanistMedium }]}>
            Caffeine cutoff
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 4,
  },
  nowBadge: {
    position: 'absolute',
    top: 2,
    width: 44,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  nowText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0A0B0D',
  },
  axisLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginTop: -8,
  },
  axisLabel: {
    fontSize: 11,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
  },
});
