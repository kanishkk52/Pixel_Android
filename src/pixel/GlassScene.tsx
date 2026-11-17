import {
    Canvas,
    ColorShader,
    Fill,
    Group,
    ImageShader,
    Rect,
    RoundedRect,
    Shader,
    Skia,
    Image as SkiaImage,
    rect,
    rrect,
    useImage,
} from '@shopify/react-native-skia';
import { StyleSheet } from 'react-native';
import {
    useDerivedValue,
    type SharedValue,
} from 'react-native-reanimated';

import { albums, palette } from './data';
import { glassShader } from './glassShader';

export type Box = [number, number, number, number];

export type PhotoSlot = {
  photo: number;
  box: Box;
};

export const hiddenBox: Box = [0, 0, 0, 0];

const effect = Skia.RuntimeEffect.Make(glassShader);

type Props = {
  width: number;
  height: number;
  slots: PhotoSlot[];
  surfaces: Box[];
  radii: number[];
  scroll: SharedValue<number>;
  selectedX: SharedValue<number>;
  selection: Box;
  dark: boolean;
  refraction: boolean;
  captions?: boolean;
  dock?: boolean;
  topInset?: number;
};

export function GlassScene({
  width,
  height,
  slots,
  surfaces,
  radii,
  scroll,
  selectedX,
  selection,
  dark,
  refraction,
  captions = true,
  dock = false,
  topInset = 0,
}: Props) {
  const images = [
    useImage(albums[0].image),
    useImage(albums[1].image),
    useImage(albums[2].image),
    useImage(albums[3].image),
    useImage(albums[4].image),
    useImage(albums[5].image),
  ];

  const theme = dark ? palette.dark : palette.light;

  const padded = Array.from(
    { length: 6 },
    (_, i) => slots[i] || { photo: 0, box: hiddenBox }
  );

  const cards = padded.flatMap(item => item.box);

  const panels = Array.from(
    { length: 9 },
    (_, i) => surfaces[i] || hiddenBox
  ).flat();

  const rs = Array.from(
    { length: 9 },
    (_, i) => radii[i] || 20
  );

  const lens = dock
    ? surfaces[6] || hiddenBox
    : hiddenBox;

  const transform = useDerivedValue(() => [
    { translateY: -scroll.value },
  ]);

  const values = useDerivedValue(
    () => ({
      viewport: [width, height],
      scroll: scroll.value,
      dark: dark ? 1 : 0,
      refraction: refraction ? 1 : 0,
      captions: captions ? 1 : 0,
      cards,
      surfaces: panels,
      radii: rs,
      active: [
        selectedX.value,
        selection[1],
        selection[2],
        selection[3],
      ],
    }),
    [
      width,
      height,
      dark,
      refraction,
      captions,
      cards.join(','),
      panels.join(','),
      rs.join(','),
      selection.join(','),
    ]
  );

  return (
    <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Fill color={theme.background} />

      <Group
        clip={rect(
          0,
          topInset,
          width,
          Math.max(0, height - topInset)
        )}
      >
        <Group transform={transform}>
          {slots.map((slot, i) => {
            const [x, y, w, h] = slot.box;
            const clip = rrect(rect(x, y, w, h), 0, 0);

            return (
              <Group key={i}>
                <RoundedRect
                  x={x + 4}
                  y={y + 5}
                  width={w}
                  height={h}
                  r={0}
                  color={palette.blue}
                />

                <Group clip={clip}>
                  <Fill color={theme.surface} />

                  {images[slot.photo] && (
                    <SkiaImage
                      image={images[slot.photo]}
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      fit="cover"
                    />
                  )}

                  {captions && (
                    <>
                      <Rect
                        x={x}
                        y={y + h - 66}
                        width={w}
                        height={66}
                        color={palette.ivory}
                      />
                      <Rect
                        x={x}
                        y={y + h - 66}
                        width={w}
                        height={3}
                        color={palette.charcoal}
                      />
                    </>
                  )}
                </Group>

                <RoundedRect
                  x={x + 1.5}
                  y={y + 1.5}
                  width={w - 3}
                  height={h - 3}
                  r={0}
                  color={palette.charcoal}
                  style="stroke"
                  strokeWidth={3}
                />
              </Group>
            );
          })}
        </Group>
      </Group>

      {!dock &&
        surfaces.map((box, i) =>
          box[2] > 0 ? (
            <Group key={i}>
              <RoundedRect
                x={box[0] + 3}
                y={box[1] + 4}
                width={box[2]}
                height={box[3]}
                r={box[3] / 2}
                color={palette.blue}
              />
              <RoundedRect
                x={box[0]}
                y={box[1]}
                width={box[2]}
                height={box[3]}
                r={box[3] / 2}
                color={theme.background}
              />
              <RoundedRect
                x={box[0]}
                y={box[1]}
                width={box[2]}
                height={box[3]}
                r={box[3] / 2}
                color={theme.text}
                style="stroke"
                strokeWidth={2}
              />
            </Group>
          ) : null
        )}

      {dock && lens[2] > 0 && (
        <>
          {effect && refraction ? (
            <Group
              clip={rrect(
                rect(...lens),
                lens[3] / 2,
                lens[3] / 2
              )}
            >
              <Fill>
                <Shader source={effect} uniforms={values}>
                  {padded.map((slot, i) =>
                    images[slot.photo] ? (
                      <ImageShader
                        key={i}
                        image={images[slot.photo]}
                        fit="cover"
                        tx="clamp"
                        ty="clamp"
                        rect={{
                          x: 0,
                          y: 0,
                          width: Math.max(slot.box[2], 1),
                          height: Math.max(slot.box[3], 1),
                        }}
                      />
                    ) : (
                      <ColorShader
                        key={i}
                        color={theme.surface}
                      />
                    )
                  )}
                </Shader>
              </Fill>
            </Group>
          ) : (
            <>
              <RoundedRect
                x={lens[0]}
                y={lens[1]}
                width={lens[2]}
                height={lens[3]}
                r={lens[3] / 2}
                color={theme.surface}
              />
              <RoundedRect
                x={selectedX}
                y={selection[1]}
                width={selection[2]}
                height={selection[3]}
                r={selection[2] / 2}
                color={palette.blue}
              />
            </>
          )}

          <RoundedRect
            x={lens[0] + 0.5}
            y={lens[1] + 0.5}
            width={lens[2] - 1}
            height={lens[3] - 1}
            r={(lens[3] - 1) / 2}
            color={dark ? '#F7F4EB66' : '#181A1D44'}
            style="stroke"
            strokeWidth={1}
          />
        </>
      )}
    </Canvas>
  );
}