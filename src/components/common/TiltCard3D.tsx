import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

interface TiltCard3DProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  maxTiltDeg?: number; // default 14
  onPress?: () => void;
}

export const TiltCard3D: React.FC<TiltCard3DProps> = ({
  children,
  style,
  maxTiltDeg = 14,
  onPress,
}) => {
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const scale = useSharedValue(1);

  const springConfig = {
    damping: 15,
    stiffness: 180,
    mass: 0.6,
  };

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(0.97, springConfig);
    })
    .onUpdate((e) => {
      'worklet';
      // Normalize translation to angle range
      const clampX = Math.max(-120, Math.min(120, e.translationX));
      const clampY = Math.max(-80, Math.min(80, e.translationY));

      rotateY.value = (clampX / 120) * maxTiltDeg;
      rotateX.value = -(clampY / 80) * maxTiltDeg;
    })
    .onEnd(() => {
      'worklet';
      rotateX.value = withSpring(0, springConfig);
      rotateY.value = withSpring(0, springConfig);
      scale.value = withSpring(1, springConfig);
      if (onPress) {
        runOnJS(onPress)();
      }
    })
    .onFinalize(() => {
      'worklet';
      rotateX.value = withSpring(0, springConfig);
      rotateY.value = withSpring(0, springConfig);
      scale.value = withSpring(1, springConfig);
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { perspective: 800 },
        { rotateX: `${rotateX.value}deg` },
        { rotateY: `${rotateY.value}deg` },
        { scale: scale.value },
      ],
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[style, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
};

