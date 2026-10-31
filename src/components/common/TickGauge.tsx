import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Canvas, Line, vec } from '@shopify/react-native-skia';
import { useTheme } from '../../theme/useTheme';

interface TickGaugeProps {
  percentage?: number; // 0 to 100, e.g. 82
  size?: number; // default 84
  needleColor?: string;
  totalTicks?: number; // default 44
}

export const TickGauge: React.FC<TickGaugeProps> = ({
  percentage = 82,
  size = 84,
  needleColor,
  totalTicks = 44,
}) => {
  const { theme, isDark } = useTheme();
  const activeColor = needleColor || theme.primaryOlive;
  const inactiveColor = isDark ? 'rgba(255, 255, 255, 0.28)' : 'rgba(0, 0, 0, 0.20)';

  const center = size / 2;
  const rOuter = size * 0.46; // ~38.6
  const rInner = size * 0.36; // ~30.2
  const needleInner = size * 0.28; // longer for needle

  const ticks = useMemo(() => {
    const list = [];
    // Convert percentage (0-100) to tick index (0 to totalTicks-1)
    const activeIndex = Math.round((percentage / 100) * totalTicks) % totalTicks;

    for (let i = 0; i < totalTicks; i++) {
      // 0 is at 12 o'clock (-90 degrees)
      const angleDeg = (i / totalTicks) * 360 - 90;
      const angleRad = (angleDeg * Math.PI) / 180;
      const cos = Math.cos(angleRad);
      const sin = Math.sin(angleRad);

      const isActive = i === activeIndex;

      const p1 = vec(center + rOuter * cos, center + rOuter * sin);
      const p2 = vec(
        center + (isActive ? needleInner : rInner) * cos,
        center + (isActive ? needleInner : rInner) * sin
      );

      list.push({
        id: i,
        p1,
        p2,
        color: isActive ? activeColor : inactiveColor,
        strokeWidth: isActive ? 2.8 : 1.5,
      });
    }
    return list;
  }, [percentage, size, totalTicks, activeColor, inactiveColor, center, rOuter, rInner, needleInner]);

  return (
    <View style={{ width: size, height: size }}>
      <Canvas style={{ width: size, height: size }}>
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
      </Canvas>
    </View>
  );
};

