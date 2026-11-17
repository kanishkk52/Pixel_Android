import { Ionicons } from '@expo/vector-icons';
import {
  Canvas,
  Fill,
  ImageShader,
  Shader,
  Skia,
  useClock,
  useImage,
} from '@shopify/react-native-skia';
import { useState } from 'react';
import {
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BLUE = '#2563EB';
const CHARCOAL = '#181A1D';
const IVORY = '#F7F4EB';

const PHOTO =
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=85&fit=crop';

const uniforms = `
uniform float2 size;
uniform float4 dock;
uniform float time;
uniform float enabled;
uniform float dark;
`;

const gridScene = `
half4 scene(float2 p) {
  p.x += sin(time * 0.0004) * 70.0;

  float2 tile = mod(p, 44.0);
  float line = 1.0 - smoothstep(
    0.8, 1.8, min(tile.x, tile.y)
  );
  float stripe = smoothstep(
    0.47, 0.53, fract((p.x + p.y * 0.45) / 200.0)
  );

  half3 base = mix(
    half3(0.094, 0.102, 0.114),
    half3(0.969, 0.957, 0.922),
    1.0 - dark
  );
  half3 color = mix(
    base, half3(0.145, 0.388, 0.922), stripe * 0.48
  );

  return half4(
    mix(color, half3(0.55, 0.70, 0.95), line * 0.65),
    1.0
  );
}
`;

const photoScene = `
uniform shader photo;

half4 scene(float2 p) {
  p.x += sin(time * 0.0004) * 16.0;
  return photo.eval(clamp(p, float2(0.0), size - 1.0));
}
`;

// The lens samples displaced coordinates from the same background.
const lens = `
half4 main(float2 p) {
  half4 original = scene(p);

  float r = dock.w * 0.5;
  float2 center = float2(
    clamp(p.x, dock.x + r, dock.x + dock.z - r),
    dock.y + r
  );
  float2 delta = p - center;
  float radius = length(delta);
  float sdf = radius - r;
  float mask =
    (1.0 - smoothstep(-0.8, 0.8, sdf)) * enabled;

  if (mask <= 0.0) return original;

  float2 normal = delta / max(radius, 0.001);
  float bend = pow(clamp(radius / r, 0.0, 1.0), 5.0);
  float2 sampleAt = p - normal * (bend * 18.0 + 1.5);

  half4 glass = scene(sampleAt);
  glass.r = scene(sampleAt - normal * bend * 0.7).r;
  glass.b = scene(sampleAt + normal * bend * 0.7).b;

  half3 tint = mix(
    half3(0.969, 0.957, 0.922),
    half3(0.094, 0.102, 0.114),
    dark
  );
  glass.rgb = mix(glass.rgb, tint, 0.16);

  float edge = exp(-abs(sdf) * 1.3);
  float light = pow(
    max(dot(normal, normalize(float2(-0.6, -0.8))), 0.0),
    2.0
  );

  glass.rgb +=
    half3(0.969, 0.957, 0.922) *
    edge * (0.12 + light * 0.48);

  glass.rgb +=
    half3(0.145, 0.388, 0.922) *
    edge * (1.0 - light) * 0.16;

  return mix(original, half4(glass.rgb, 1.0), mask);
}
`;

const gridEffect = Skia.RuntimeEffect.Make(
  uniforms + gridScene + lens
);
const photoEffect = Skia.RuntimeEffect.Make(
  uniforms + photoScene + lens
);

const tabs = [
  { name: 'Feed', icon: 'home-outline' },
  { name: 'Gallery', icon: 'images-outline' },
  { name: 'Moments', icon: 'play-circle-outline' },
  { name: 'Discover', icon: 'compass-outline' },
  { name: 'Profile', icon: 'person-outline' },
] as const;

export default function GlassPreview() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const clock = useClock();

  const [dark, setDark] = useState(true);
  const [glass, setGlass] = useState(true);
  const [grid, setGrid] = useState(true);
  const [active, setActive] = useState('Gallery');
  const [imageError, setImageError] = useState(false);

  const image = useImage(PHOTO, () => setImageError(true));

  const dockWidth = Math.min(width - 32, 440);
  const dockX = (width - dockWidth) / 2;
  const dockY = height - Math.max(insets.bottom, 16) - 80;

  const showPhoto = !grid && !!image;
  const effect = showPhoto ? photoEffect : gridEffect;
  const ink = dark ? IVORY : CHARCOAL;
  const surface = dark ? CHARCOAL : IVORY;

  const values = useDerivedValue(
    () => ({
      size: [width, height],
      dock: [dockX, dockY, dockWidth, 76],
      time: clock.value,
      enabled: glass ? 1 : 0,
      dark: dark ? 1 : 0,
    }),
    [width, height, dockX, dockY, dockWidth, glass, dark]
  );

  return (
    <View style={[styles.screen, { backgroundColor: surface }]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />

      {effect && (
        <Canvas
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Fill>
            <Shader source={effect} uniforms={values}>
              {showPhoto && image && (
                <ImageShader
                  image={image}
                  fit="cover"
                  rect={{ x: 0, y: 0, width, height }}
                />
              )}
            </Shader>
          </Fill>
        </Canvas>
      )}

      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 20 },
        ]}
      >
        <View style={styles.row}>
          <Text
            style={[
              styles.logo,
              { color: ink, backgroundColor: surface },
            ]}
          >
            pixel<Text style={{ color: BLUE }}>.</Text>
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Switch color theme"
            onPress={() => setDark(!dark)}
            style={[styles.theme, { backgroundColor: surface }]}
          >
            <Ionicons
              name={dark ? 'sunny-outline' : 'moon-outline'}
              size={22}
              color={ink}
            />
          </Pressable>
        </View>

        <View
          style={[styles.titleCard, { backgroundColor: surface }]}
        >
          <Text style={styles.eyebrow}>
            PIXEL / MATERIAL STUDY 01
          </Text>

          <Text style={[styles.title, { color: ink }]}>
            A little closer.{'\n'}A little more alive.
          </Text>

          <Text style={[styles.description, { color: ink }]}>
            Watch the lines bend through the dock. Switch to a
            photo to see the material over an image.
          </Text>
        </View>

        <View style={styles.controls}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: glass }}
            onPress={() => setGlass(!glass)}
            style={[styles.chip, { backgroundColor: surface }]}
          >
            <Text style={{ color: ink, fontWeight: '600' }}>
              Refraction: {glass ? 'ON' : 'OFF'}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => setGrid(!grid)}
            style={[styles.chip, { backgroundColor: surface }]}
          >
            <Text style={{ color: ink, fontWeight: '600' }}>
              {grid ? 'Show photo' : 'Show test grid'}
            </Text>
          </Pressable>
        </View>

        {!grid && !image && (
          <Text
            style={[
              styles.notice,
              { color: ink, backgroundColor: surface },
            ]}
          >
            {imageError
              ? 'Photo unavailable. Test grid remains available offline.'
              : 'Loading photo…'}
          </Text>
        )}

        {!effect && (
          <Text style={{ color: ink, backgroundColor: surface }}>
            Shader unavailable on this device.
          </Text>
        )}
      </View>

      <View
        style={[
          styles.caption,
          {
            bottom: height - dockY + 14,
            backgroundColor: surface,
          },
        ]}
      >
        <Text style={{ color: ink, fontSize: 12 }}>
          Material preview · tabs show selection only
        </Text>
      </View>

      <View
        style={[
          styles.dock,
          { left: dockX, top: dockY, width: dockWidth },
        ]}
      >
        {tabs.map(tab => {
          const selected = active === tab.name;

          return (
            <Pressable
              key={tab.name}
              accessibilityRole="tab"
              accessibilityLabel={tab.name}
              accessibilityState={{ selected }}
              onPress={() => setActive(tab.name)}
              style={({ pressed }) => [
                styles.tab,
                { transform: [{ scale: pressed ? 0.93 : 1 }] },
              ]}
            >
              <View
                style={[
                  styles.tabPill,
                  {
                    backgroundColor: selected ? BLUE : 'transparent',
                  },
                ]}
              >
                <Ionicons
                  name={tab.icon}
                  size={21}
                  color={selected ? IVORY : ink}
                />
                <Text
                  style={{
                    color: selected ? IVORY : ink,
                    fontSize: 9,
                    fontWeight: '600',
                  }}
                >
                  {tab.name}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 24, gap: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -2,
    borderRadius: 14,
    paddingHorizontal: 10,
  },
  theme: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCard: { padding: 20, borderRadius: 24 },
  eyebrow: {
    color: BLUE,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -1,
    fontWeight: '700',
    marginTop: 16,
  },
  description: { fontSize: 14, lineHeight: 22, marginTop: 14 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16,
    minHeight: 46,
    justifyContent: 'center',
    borderRadius: 23,
  },
  notice: { padding: 12, borderRadius: 12, fontSize: 12 },
  caption: {
    position: 'absolute',
    alignSelf: 'center',
    borderRadius: 16,
    padding: 10,
  },
  dock: {
    position: 'absolute',
    height: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  tab: {
    flex: 1,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPill: {
    minWidth: 48,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
});