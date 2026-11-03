import React, { useMemo, useState, useEffect } from 'react';
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
import { RoutineModel } from '../../types/energy';

interface CircadianWaveProps {
  currentHour?: number; // e.g. 11.3 for 11:18
  routine?: RoutineModel;
  height?: number; // default 190
}

function timeToDecimalHour(timeStr: string): number {
  if (!timeStr) return 6.5;
  const parts = timeStr.split(':').map(Number);
  return (parts[0] || 0) + (parts[1] || 0) / 60;
}

function evalCubicBezier(p0: number, cp1: number, cp2: number, p1: number, t: number): number {
  const u = 1 - t;
  return (
    u * u * u * p0 +
    3 * u * u * t * cp1 +
    3 * u * t * t * cp2 +
    t * t * t * p1
  );
}

export const CircadianWave: React.FC<CircadianWaveProps> = ({
  currentHour: propCurrentHour,
  routine,
  height = 190,
}) => {
  const { theme, isDark } = useTheme();
  const [width, setWidth] = useState(340);

  // Dynamic real-time device clock state
  const [liveHour, setLiveHour] = useState(() => {
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60;
  });

  const [liveTimeString, setLiveTimeString] = useState(() => {
    const d = new Date();
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setLiveHour(d.getHours() + d.getMinutes() / 60);
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      setLiveTimeString(`${h}:${m}`);
    }, 15000); // refresh every 15s

    return () => clearInterval(timer);
  }, []);

  const activeHour = propCurrentHour !== undefined ? propCurrentHour : liveHour;

  const displayTime = useMemo(() => {
    if (propCurrentHour !== undefined) {
      const h = Math.floor(propCurrentHour);
      const m = Math.round((propCurrentHour - h) * 60);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return liveTimeString;
  }, [propCurrentHour, liveTimeString]);

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

  // Dynamic routine-based key anchors
  const wakeH = timeToDecimalHour(routine?.wakeTime || '06:30');
  const sleepH = timeToDecimalHour(routine?.sleepTime || '22:30');

  // Peak window: +2.0h to +4.5h after wake
  const peakStart = wakeH + 2.0;
  const peakEnd = wakeH + 4.5;
  const peakLeft = getX(peakStart);
  const peakRight = getX(peakEnd);

  // Slump window: +6.5h to +9.0h after wake
  const slumpStart = wakeH + 6.5;
  const slumpEnd = wakeH + 9.0;
  const slumpLeft = getX(slumpStart);
  const slumpRight = getX(slumpEnd);

  const axisY = height - 36;

  // Key wave control points based on the user's specific routine
  const { wavePath, fillPath, nowPoint } = useMemo(() => {
    const hPeak1 = wakeH + 3.0; // Morning Peak
    const hDip = wakeH + 7.5;   // Afternoon Slump
    const hPeak2 = Math.min(20.0, sleepH - 4.5); // Second Wind
    const hEnd = Math.min(22.0, timeToDecimalHour(routine?.windDownTime || '21:30'));

    const p0 = { x: getX(Math.max(6.0, wakeH - 0.5)), y: axisY - 26 };
    const pPeak1 = { x: getX(hPeak1), y: 32 };
    const pDip = { x: getX(hDip), y: axisY - 20 };
    const pPeak2 = { x: getX(hPeak2), y: 48 };
    const pEnd = { x: getX(hEnd), y: axisY - 14 };

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

    // Exact Bezier evaluation of Now Y coordinate across the 4 segments
    const clampedH = Math.max(6.0, Math.min(22.0, activeHour));
    let nowY = axisY - 20;

    if (clampedH <= hPeak1) {
      const t = Math.max(0, Math.min(1, (clampedH - 6.0) / Math.max(0.1, hPeak1 - 6.0)));
      nowY = evalCubicBezier(p0.y, cp1a.y, cp1b.y, pPeak1.y, t);
    } else if (clampedH <= hDip) {
      const t = Math.max(0, Math.min(1, (clampedH - hPeak1) / Math.max(0.1, hDip - hPeak1)));
      nowY = evalCubicBezier(pPeak1.y, cp2a.y, cp2b.y, pDip.y, t);
    } else if (clampedH <= hPeak2) {
      const t = Math.max(0, Math.min(1, (clampedH - hDip) / Math.max(0.1, hPeak2 - hDip)));
      nowY = evalCubicBezier(pDip.y, cp3a.y, cp3b.y, pPeak2.y, t);
    } else {
      const t = Math.max(0, Math.min(1, (clampedH - hPeak2) / Math.max(0.1, hEnd - hPeak2)));
      nowY = evalCubicBezier(pPeak2.y, cp4a.y, cp4b.y, pEnd.y, t);
    }

    return {
      wavePath: p,
      fillPath: fill,
      nowPoint: { x: getX(clampedH), y: nowY },
    };
  }, [width, usableW, pad, axisY, activeHour, wakeH, sleepH, routine]);

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
        {/* Shaded Column 1: Peak window */}
        <Rect
          x={peakLeft}
          y={18}
          width={Math.max(4, peakRight - peakLeft)}
          height={axisY - 18}
          color={isDark ? 'rgba(42, 212, 240, 0.14)' : 'rgba(54, 126, 135, 0.14)'}
        />

        {/* Shaded Column 2: Slump window */}
        <Rect
          x={slumpLeft}
          y={18}
          width={Math.max(4, slumpRight - slumpLeft)}
          height={axisY - 18}
          color={isDark ? 'rgba(255, 197, 49, 0.12)' : 'rgba(200, 138, 43, 0.12)'}
        />

        {/* Wave Underfill Gradient */}
        <Path path={fillPath}>
          <LinearGradient
            start={vec(0, 30)}
            end={vec(0, axisY)}
            colors={[
              isDark ? 'rgba(42, 212, 240, 0.24)' : 'rgba(54, 126, 135, 0.18)',
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

      {/* Floating 'Now' Badge with Live Device Time */}
      <View
        style={[
          styles.nowBadge,
          {
            left: Math.max(pad, Math.min(width - pad - 84, nowPoint.x - 42)),
            backgroundColor: theme.primaryOlive,
          },
        ]}
      >
        <Text style={[styles.nowText, { fontFamily: FONTS.urbanistBold }]}>
          Now · {displayTime}
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
    paddingHorizontal: 10,
    height: 22,
    borderRadius: 11,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  nowText: {
    fontSize: 10.5,
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
