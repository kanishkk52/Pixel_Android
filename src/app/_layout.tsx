import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import BrandIntro from '../pixel/BrandIntro';

void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    NohemiRegular: require('../../assets/fonts/Nohemi-Regular.ttf'),
  });

  const [intro, setIntro] = useState(true);

  const finish = useCallback(() => {
    setIntro(false);
  }, []);

  const onLayout = useCallback(() => {
    void SplashScreen.hideAsync().catch(() => {});
  }, []);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <View
        style={{ flex: 1, backgroundColor: '#181A1D' }}
        onLayout={onLayout}
      >
        <View
          style={{ flex: 1 }}
          importantForAccessibility={
            intro ? 'no-hide-descendants' : 'auto'
          }
        >
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'none',
            }}
          />
        </View>

        {intro && <BrandIntro onDone={finish} />}
      </View>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}