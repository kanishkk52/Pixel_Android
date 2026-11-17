import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

type Props = {
  onDone: () => void;
};

export default function BrandIntro({ onDone }: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const veil = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.timing(progress, {
        toValue: 1,
        duration: reduceMotion ? 180 : 780,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(reduceMotion ? 0 : 100),
      Animated.timing(veil, {
        toValue: 0,
        duration: reduceMotion ? 150 : 260,
        useNativeDriver: true,
      }),
    ]);

    animation.start(({ finished }) => {
      if (finished) onDone();
    });

    return () => animation.stop();
  }, [onDone, progress, veil, reduceMotion]);

  return (
    <Animated.View
      accessible
      accessibilityViewIsModal
      accessibilityLabel="Pixel is opening"
      style={[s.overlay, { opacity: veil }]}
    >
      <View style={s.logoFrame}>
        <Animated.Image
          source={require('../../assets/images/pixel-logo.png')}
          resizeMode="contain"
          style={[
            s.logo,
            {
              opacity: progress.interpolate({
                inputRange: [0, 0.25, 1],
                outputRange: [0, 1, 1],
              }),
              transform: [
                {
                  rotate: reduceMotion
                    ? '0deg'
                    : progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['-22deg', '0deg'],
                      }),
                },
                {
                  scale: reduceMotion
                    ? 1
                    : progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.88, 1],
                      }),
                },
              ],
            },
          ]}
        />

        <Animated.Text
          style={[
            s.wordmark,
            {
              opacity: progress.interpolate({
                inputRange: [0, 0.35, 1],
                outputRange: [0, 0, 1],
              }),
            },
          ]}
        >
          Pixel
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    backgroundColor: '#181A1D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoFrame: {
    width: 192,
    height: 192,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    position: 'absolute',
    width: 192,
    height: 192,
  },
  wordmark: {
    fontFamily: 'NohemiRegular',
    fontSize: 24,
    color: '#F7F4EB',
  },
});