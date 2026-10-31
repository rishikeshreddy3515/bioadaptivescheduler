import React, { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Canvas, Points, vec } from '@shopify/react-native-skia';
import { useTheme } from '../../theme/useTheme';

interface DotMatrixBackgroundProps {
  spacing?: number;
  dotSize?: number;
}

export const DotMatrixBackground: React.FC<DotMatrixBackgroundProps> = ({
  spacing = 18,
  dotSize = 1.6,
}) => {
  const { width, height } = useWindowDimensions();
  const { theme, isDark } = useTheme();

  const points = useMemo(() => {
    const pts = [];
    const cols = Math.ceil(width / spacing);
    const rows = Math.ceil(height / spacing);

    for (let c = 0; c <= cols; c++) {
      for (let r = 0; r <= rows; r++) {
        pts.push(vec(c * spacing, r * spacing));
      }
    }
    return pts;
  }, [width, height, spacing]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFill}>
        <Points
          points={points}
          mode="points"
          color={isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'}
          strokeWidth={dotSize}
          strokeCap="round"
        />
      </Canvas>
    </View>
  );
};
