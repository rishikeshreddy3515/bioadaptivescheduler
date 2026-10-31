import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import {
  Canvas,
  Path,
  Skia,
  Line,
  Circle,
  Rect,
  vec,
  LinearGradient,
} from '@shopify/react-native-skia';
import { useTheme } from '../../theme/useTheme';
import { FONTS } from '../../theme/typography';

interface CircadianWaveProps {
  currentHour?: number; // default 10.33 (10:20)
  height?: number; // default 190
}

export const CircadianWave: React.FC<CircadianWaveProps> = ({
  currentHour = 10.33,
  height = 190,
}) => {
  const { theme, isDark } = useTheme();
  const [width, setWidth] = useState(340);

  const startHour = 6;
  const endHour = 22;
  const totalHours = endHour - startHour; // 16 hours
  const pad = 16;
  const usableW = Math.max(width - pad * 2, 100);

  const getX = (hour: number) => pad + ((hour - startHour) / totalHours) * usableW;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setWidth(w);
  };

  // Peak window: 08:30 (8.5) to 11:00 (11.0)
  // Slump window: 13:00 (13.0) to 15:30 (15.5)
  const peakLeft = getX(8.5);
  const peakRight = getX(11.0);
  const slumpLeft = getX(13.0);
  const slumpRight = getX(15.5);

  const axisY = height - 36;

  // Key wave control points:
  // 06:00 -> Wake baseline
  // 09:30 -> Morning Peak
  // 14:00 -> Afternoon Slump
  // 17:30 -> Second Wind Peak
  // 21:30 -> Evening Wind-down
  const { wavePath, fillPath, nowPoint } = useMemo(() => {
    const p0 = { x: getX(6.0), y: axisY - 26 };
    const pPeak1 = { x: getX(9.5), y: 32 };
    const pDip = { x: getX(14.0), y: axisY - 20 };
    const pPeak2 = { x: getX(17.5), y: 48 };
    const pEnd = { x: getX(22.0), y: axisY - 14 };

    // Segment 1: p0 to pPeak1 (Rise to morning peak)
    const cp1a = { x: p0.x + (pPeak1.x - p0.x) * 0.45, y: p0.y };
    const cp1b = { x: pPeak1.x - (pPeak1.x - p0.x) * 0.45, y: pPeak1.y };

    // Segment 2: pPeak1 to pDip (Fall into postprandial dip)
    const cp2a = { x: pPeak1.x + (pDip.x - pPeak1.x) * 0.45, y: pPeak1.y };
    const cp2b = { x: pDip.x - (pDip.x - pPeak1.x) * 0.45, y: pDip.y };

    // Segment 3: pDip to pPeak2 (Second wind afternoon surge)
    const cp3a = { x: pDip.x + (pPeak2.x - pDip.x) * 0.45, y: pDip.y };
    const cp3b = { x: pPeak2.x - (pPeak2.x - pDip.x) * 0.45, y: pPeak2.y };

    // Segment 4: pPeak2 to pEnd (Descent into wind-down)
    const cp4a = { x: pPeak2.x + (pEnd.x - pPeak2.x) * 0.45, y: pPeak2.y };
    const cp4b = { x: pEnd.x - (pEnd.x - pPeak2.x) * 0.45, y: pEnd.y };

    const waveSvg = `M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} C ${cp1a.x.toFixed(1)} ${cp1a.y.toFixed(1)}, ${cp1b.x.toFixed(1)} ${cp1b.y.toFixed(1)}, ${pPeak1.x.toFixed(1)} ${pPeak1.y.toFixed(1)} C ${cp2a.x.toFixed(1)} ${cp2a.y.toFixed(1)}, ${cp2b.x.toFixed(1)} ${cp2b.y.toFixed(1)}, ${pDip.x.toFixed(1)} ${pDip.y.toFixed(1)} C ${cp3a.x.toFixed(1)} ${cp3a.y.toFixed(1)}, ${cp3b.x.toFixed(1)} ${cp3b.y.toFixed(1)}, ${pPeak2.x.toFixed(1)} ${pPeak2.y.toFixed(1)} C ${cp4a.x.toFixed(1)} ${cp4a.y.toFixed(1)}, ${cp4b.x.toFixed(1)} ${cp4b.y.toFixed(1)}, ${pEnd.x.toFixed(1)} ${pEnd.y.toFixed(1)}`;

    const fillSvg = `M ${p0.x.toFixed(1)} ${axisY.toFixed(1)} L ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} C ${cp1a.x.toFixed(1)} ${cp1a.y.toFixed(1)}, ${cp1b.x.toFixed(1)} ${cp1b.y.toFixed(1)}, ${pPeak1.x.toFixed(1)} ${pPeak1.y.toFixed(1)} C ${cp2a.x.toFixed(1)} ${cp2a.y.toFixed(1)}, ${cp2b.x.toFixed(1)} ${cp2b.y.toFixed(1)}, ${pDip.x.toFixed(1)} ${pDip.y.toFixed(1)} C ${cp3a.x.toFixed(1)} ${cp3a.y.toFixed(1)}, ${cp3b.x.toFixed(1)} ${cp3b.y.toFixed(1)}, ${pPeak2.x.toFixed(1)} ${pPeak2.y.toFixed(1)} C ${cp4a.x.toFixed(1)} ${cp4a.y.toFixed(1)}, ${cp4b.x.toFixed(1)} ${cp4b.y.toFixed(1)}, ${pEnd.x.toFixed(1)} ${pEnd.y.toFixed(1)} L ${pEnd.x.toFixed(1)} ${axisY.toFixed(1)} Z`;

    const p = Skia.Path.MakeFromSVGString(waveSvg) || Skia.Path.Make();
    const fill = Skia.Path.MakeFromSVGString(fillSvg) || Skia.Path.Make();

    // Estimate Now Y coordinate along curve (for hour ~10.33)
    const t = Math.max(0, Math.min(1, (currentHour - 9.5) / (14.0 - 9.5)));
    const nowY =
      Math.pow(1 - t, 3) * pPeak1.y +
      3 * Math.pow(1 - t, 2) * t * cp2a.y +
      3 * (1 - t) * Math.pow(t, 2) * cp2b.y +
      Math.pow(t, 3) * pDip.y;

    return {
      wavePath: p,
      fillPath: fill,
      nowPoint: { x: getX(currentHour), y: nowY },
    };
  }, [width, usableW, pad, axisY, currentHour]);

  // Compute ruler ticks
  const ticks = useMemo(() => {
    const list = [];
    const steps = totalHours * 2; // Every 30 mins
    for (let s = 0; s <= steps; s++) {
      const h = startHour + s * 0.5;
      const x = getX(h);
      const isMajor = s % 8 === 0; // Every 4 hours (06, 10, 14, 18, 22)
      const isHalf = s % 2 === 0;

      const tickH = isMajor ? 14 : isHalf ? 9 : 5;
      list.push({
        id: s,
        p1: vec(x, axisY),
        p2: vec(x, axisY + tickH),
        color: isMajor
          ? (isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)')
          : (isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.15)'),
        strokeWidth: isMajor ? 1.5 : 1.0,
      });
    }
    return list;
  }, [width, totalHours, startHour, isDark, axisY]);

  return (
    <View style={[styles.container, { height }]} onLayout={onLayout}>
      <Canvas style={StyleSheet.absoluteFill}>
        {/* Shaded Column 1: Peak window (08:30 - 11:00) */}
        <Rect
          x={peakLeft}
          y={18}
          width={peakRight - peakLeft}
          height={axisY - 18}
          color={isDark ? 'rgba(42, 212, 240, 0.12)' : 'rgba(54, 126, 135, 0.12)'}
        />

        {/* Shaded Column 2: Slump window (13:00 - 15:30) */}
        <Rect
          x={slumpLeft}
          y={18}
          width={slumpRight - slumpLeft}
          height={axisY - 18}
          color={isDark ? 'rgba(255, 197, 49, 0.10)' : 'rgba(200, 138, 43, 0.10)'}
        />

        {/* Wave Underfill Gradient */}
        <Path path={fillPath}>
          <LinearGradient
            start={vec(0, 30)}
            end={vec(0, axisY)}
            colors={[
              isDark ? 'rgba(42, 212, 240, 0.22)' : 'rgba(54, 126, 135, 0.18)',
              'transparent',
            ]}
          />
        </Path>

        {/* Main Circadian Wave Curve */}
        <Path
          path={wavePath}
          color={theme.indicators.peak}
          style="stroke"
          strokeWidth={2.8}
          strokeCap="round"
        />

        {/* Axis Baseline */}
        <Line
          p1={vec(pad, axisY)}
          p2={vec(width - pad, axisY)}
          color={isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.12)'}
          strokeWidth={1}
        />

        {/* Ticks */}
        {ticks.map((t) => (
          <Line
            key={t.id}
            p1={t.p1}
            p2={t.p2}
            color={t.color}
            strokeWidth={t.strokeWidth}
          />
        ))}

        {/* Now Vertical Pin Line */}
        <Line
          p1={vec(nowPoint.x, 16)}
          p2={vec(nowPoint.x, axisY)}
          color={theme.primaryOlive}
          strokeWidth={1.8}
        />

        {/* Circular Node on Curve */}
        <Circle
          cx={nowPoint.x}
          cy={nowPoint.y}
          r={6.5}
          color={theme.primaryOlive}
        />
        <Circle
          cx={nowPoint.x}
          cy={nowPoint.y}
          r={3}
          color={isDark ? '#161C14' : '#FCFBF7'}
        />
      </Canvas>

      {/* Floating 'Now' Badge */}
      <View
        style={[
          styles.nowBadge,
          {
            left: Math.max(nowPoint.x - 22, 6),
            backgroundColor: theme.primaryOlive,
          },
        ]}
      >
        <Text style={[styles.nowText, { fontFamily: FONTS.urbanistBold }]}>
          Now
        </Text>
      </View>

      {/* Hour Labels */}
      <View style={[styles.labelsRow, { top: axisY + 16 }]}>
        <Text style={[styles.axisText, { color: theme.secondaryText, fontFamily: FONTS.urbanistMedium }]}>06</Text>
        <Text style={[styles.axisText, { color: theme.secondaryText, fontFamily: FONTS.urbanistMedium }]}>10</Text>
        <Text style={[styles.axisText, { color: theme.secondaryText, fontFamily: FONTS.urbanistMedium }]}>14</Text>
        <Text style={[styles.axisText, { color: theme.secondaryText, fontFamily: FONTS.urbanistMedium }]}>18</Text>
        <Text style={[styles.axisText, { color: theme.secondaryText, fontFamily: FONTS.urbanistMedium }]}>22</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
  },
  nowBadge: {
    position: 'absolute',
    top: 0,
    width: 44,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  nowText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0A0B0D',
  },
  labelsRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  axisText: {
    fontSize: 11,
  },
});
