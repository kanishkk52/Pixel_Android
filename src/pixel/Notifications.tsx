import { Feather } from '@expo/vector-icons';
import {
    Canvas,
    LinearGradient,
    rect,
    RoundedRect,
    rrect,
    vec
} from '@shopify/react-native-skia';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    AccessibilityInfo,
    Image,
    Modal,
    Animated as NativeAnimated,
    PanResponder,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    useWindowDimensions,
    View
} from 'react-native';
import Animated, {
    Easing,
    runOnJS,
    useAnimatedStyle,
    useDerivedValue,
    useReducedMotion,
    useSharedValue,
    withDelay,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette } from './data';

export type PixelNotification = {
  id: string;
  kind: 'event' | 'reply';
  title: string;
  body: string;
  target: number;
  createdAt: number;
  actor?: string;
  read: boolean;
};

export type IncomingNotification = Omit<
  PixelNotification,
  'read'
>;

// Turn this off when real notifications are connected.
const DEMO_NOTIFICATIONS = true;

export function usePixelNotifications() {
  const [items, setItems] = useState<PixelNotification[]>([]);
  const [queue, setQueue] = useState<string[]>([]);

  const seen = useRef(new Set<string>());
  const previewNumber = useRef(0);

  const receive = useCallback((item: IncomingNotification) => {
    if (seen.current.has(item.id)) return;

    seen.current.add(item.id);

    setItems(previous => [
      { ...item, read: false },
      ...previous,
    ]);

    setQueue(previous => [...previous, item.id]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setQueue(previous => previous.filter(value => value !== id));
  }, []);

  const markRead = useCallback(
    (id: string) => {
      setItems(previous =>
        previous.map(item =>
          item.id === id ? { ...item, read: true } : item
        )
      );

      dismiss(id);
    },
    [dismiss]
  );

  const markAllRead = useCallback(() => {
    setItems(previous =>
      previous.map(item => ({ ...item, read: true }))
    );

    setQueue([]);
  }, []);

  const remove = useCallback(
  (id: string) => {
    setItems(previous =>
      previous.filter(item => item.id !== id)
    );

    dismiss(id);
  },
  [dismiss]
);

  const previewReply = useCallback(() => {
    previewNumber.current += 1;

    receive({
      id: `demo-reply-${previewNumber.current}`,
      kind: 'reply',
      title: 'Maya replied to your comment',
      body: 'Thanks! See you at the next campus event.',
      actor: 'Maya',
      target: 0,
      createdAt: Date.now(),
    });
  }, [receive]);

  useEffect(() => {
    if (!DEMO_NOTIFICATIONS) return;

    const timer = setTimeout(() => {
      receive({
        id: 'demo-event-makers',
        kind: 'event',
        title: 'A new event just landed',
        body: 'The makers’ meetup has been added to Discover.',
        target: 3,
        createdAt: Date.now(),
      });
    }, 1800);
    

    return () => clearTimeout(timer);
  }, [receive]);

  return {
    items,
    current: items.find(item => item.id === queue[0]),
    unread: items.filter(item => !item.read).length,
    receive,
    dismiss,
    markRead,
    markAllRead,
    remove,
    previewReply: DEMO_NOTIFICATIONS ? previewReply : undefined,
  };
}

export function NotificationButton({
  color,
  unread,
  onPress,
}: {
  color: string;
  unread: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open notifications, ${unread} unread`}
      onPress={onPress}
      style={({ pressed }) => [
        s.iconButton,
        { opacity: pressed ? 0.5 : 1 },
      ]}
    >
      <View style={[s.sidebarIcon, { borderColor: color }]}>
        <View
          style={[s.sidebarRail, { backgroundColor: color }]}
        />
        <View
          style={[s.sidebarLine, { backgroundColor: color }]}
        />
        <View
          style={[
            s.sidebarLine,
            {
              top: 13,
              width: 5,
              backgroundColor: color,
            },
          ]}
        />
      </View>

      {unread > 0 && <View style={s.unreadDot} />}
    </Pressable>
  );
}

export function NotificationIsland({
  item,
  onDismiss,
  onOpen,
}: {
  item: PixelNotification;
  onDismiss: (id: string) => void;
  onOpen: (item: PixelNotification) => void;
}) {
  const safe = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();

  const fullWidth = Math.min(width - 48, 330);
  const pop = useSharedValue(0);
  const expand = useSharedValue(0);
  const content = useSharedValue(0);
  const closing = useRef(false);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;

    content.value = withTiming(0, { duration: 90 });

    expand.value = withDelay(
      90,
      withTiming(0, {
        duration: reduceMotion ? 0 : 340,
        easing: Easing.inOut(Easing.cubic),
      })
    );

    pop.value = withDelay(
      reduceMotion ? 90 : 440,
      withTiming(0, { duration: 180 }, finished => {
        if (finished) {
          runOnJS(onDismiss)(item.id);
        }
      })
    );
  }, [
    content,
    expand,
    pop,
    reduceMotion,
    onDismiss,
    item.id,
  ]);

  useEffect(() => {
    pop.value = withTiming(1, {
      duration: reduceMotion ? 120 : 200,
    });

    expand.value = withDelay(
      reduceMotion ? 0 : 160,
      reduceMotion
        ? withTiming(1, { duration: 0 })
        : withSpring(1, {
            damping: 17,
            stiffness: 150,
            mass: 0.85,
          })
    );

    content.value = withDelay(
      reduceMotion ? 100 : 480,
      withTiming(1, { duration: 180 })
    );

    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    void AccessibilityInfo.isScreenReaderEnabled().then(enabled => {
      if (!disposed && !enabled) {
        timer = setTimeout(close, 6200);
      }
    });

    const announce = setTimeout(() => {
      AccessibilityInfo.announceForAccessibility(
        `${item.title}. ${item.body}`
      );
    }, 750);

    return () => {
      disposed = true;
      clearTimeout(timer);
      clearTimeout(announce);
    };
  }, [
    item.id,
    item.title,
    item.body,
    close,
    pop,
    expand,
    content,
    reduceMotion,
  ]);

  const shellStyle = useAnimatedStyle(() => ({
    width: Math.max(
      36,
      36 + (fullWidth - 36) * expand.value
    ),
    height:
      36 + 24 * Math.min(1, Math.max(0, expand.value)),
    borderRadius: 999,
    opacity: pop.value,
    transform: [
      {
        scale: reduceMotion ? 1 : 0.2 + pop.value * 0.8,
      },
      {
        scaleY: reduceMotion
          ? 1
          : 1 -
            Math.sin(
              Math.min(1, Math.max(0, expand.value)) * Math.PI
            ) * 0.13,
      },
    ],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: content.value,
  }));

  // This hook belongs directly inside the component,
  // alongside the animation hooks above.
  const glassRim = useDerivedValue(() => {
    const currentWidth = Math.max(
      36,
      36 + (fullWidth - 36) * expand.value
    );

    const currentHeight =
      36 + 24 * Math.min(1, Math.max(0, expand.value));

    const radius = (currentHeight - 1.5) / 2;

    return rrect(
      rect(
        0.75,
        0.75,
        currentWidth - 1.5,
        currentHeight - 1.5
      ),
      radius,
      radius
    );
  });

  return (
    <View
      pointerEvents="box-none"
      style={[
        s.islandPosition,
        { top: safe.top + 6 },
      ]}
    >
      <Animated.View
        style={[
          {
            backgroundColor: '#000000',
            overflow: 'hidden',
          },
          shellStyle,
        ]}
      >
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: 0,
              top: 0,
              width: fullWidth,
              height: 60,
              flexDirection: 'row',
              alignItems: 'center',
              paddingLeft: 10,
            },
            contentStyle,
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              `${item.title}. ${item.body}. Open notification`
            }
            onPress={() => onOpen(item)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 9,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#202023',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {item.kind === 'event' ? (
                <Image
                  source={require('../../assets/images/pixel-logo.png')}
                  style={{ width: 28, height: 28 }}
                  resizeMode="contain"
                />
              ) : (
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: '600',
                  }}
                >
                  {(item.actor || 'P').slice(0, 1)}
                </Text>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.15}
                style={{
                  color: '#96969D',
                  fontSize: 10,
                  marginBottom: 3,
                }}
              >
                {item.kind === 'event'
                  ? 'Pixel · Discover'
                  : `${item.actor || 'Pixel'} · Reply`}
              </Text>

              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.15}
                style={{
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: '500',
                }}
              >
                {item.body}
              </Text>
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss notification popup"
            onPress={close}
            style={s.iconButton}
          >
            <Feather name="x" size={15} color="#85858D" />
          </Pressable>
        </Animated.View>

        <Canvas
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        >
          <RoundedRect
            rect={glassRim}
            style="stroke"
            strokeWidth={1.25}
          >
            <LinearGradient
              start={vec(0, 0)}
              end={vec(fullWidth, 60)}
              colors={[
                '#FFFFFFCC',
                '#DCEAFF55',
                '#FFFFFF12',
                '#A8C5FF66',
                '#FFFFFF99',
              ]}
              positions={[0, 0.22, 0.48, 0.76, 1]}
            />
          </RoundedRect>
        </Canvas>
      </Animated.View>
    </View>
  );
}

export function SwipeNotification({
  children,
  onDelete,
  label,
}: {
  children: React.ReactNode;
  onDelete: () => void;
  label: string;
}) {
  const translate = useRef(
    new NativeAnimated.Value(0)
  ).current;

  const offset = useRef(0);
  const origin = useRef(0);
  const [revealed, setRevealed] = useState(false);
  const reduceMotion = useReducedMotion();

  const isHorizontal = (
    dx: number,
    dy: number
  ) => Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5;

  const responder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) =>
      isHorizontal(gesture.dx, gesture.dy),

    onMoveShouldSetPanResponderCapture: (_, gesture) =>
      isHorizontal(gesture.dx, gesture.dy),

    onPanResponderGrant: () => {
      translate.stopAnimation();
      origin.current = offset.current;
    },

    onPanResponderMove: (_, gesture) => {
      const value = Math.max(
        -64,
        Math.min(0, origin.current + gesture.dx)
      );

      offset.current = value;
      translate.setValue(value);
    },

    onPanResponderRelease: (_, gesture) => {
      const open =
        offset.current < -28 || gesture.vx < -0.5;

      offset.current = open ? -64 : 0;
      setRevealed(open);

      NativeAnimated.spring(translate, {
        toValue: offset.current,
        speed: 24,
        bounciness: 0,
        useNativeDriver: true,
      }).start();
    },

    onPanResponderTerminate: () => {
      offset.current = revealed ? -64 : 0;

      NativeAnimated.timing(translate, {
        toValue: offset.current,
        duration: reduceMotion ? 0 : 120,
        useNativeDriver: true,
      }).start();
    },
  });

  return (
    <View
      style={{
        overflow: 'hidden',
        paddingTop: 3,
        paddingLeft: 3,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete notification: ${label}`}
        accessibilityElementsHidden={!revealed}
        importantForAccessibility={
          revealed ? 'auto' : 'no-hide-descendants'
        }
        pointerEvents={revealed ? 'auto' : 'none'}
        onPress={onDelete}
        style={{
          position: 'absolute',
          right: 0,
          top: 3,
          bottom: 0,
          width: 60,
          backgroundColor: palette.blue,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Feather name="x" size={23} color={palette.ivory} />
      </Pressable>

      <NativeAnimated.View
        {...responder.panHandlers}
        accessibilityActions={[
          { name: 'delete', label: 'Delete notification' },
        ]}
        onAccessibilityAction={event => {
          if (event.nativeEvent.actionName === 'delete') {
            onDelete();
          }
        }}
        style={{
          touchAction: 'pan-y',
          transform: [{ translateX: translate }],
        }}
      >
        {children}
      </NativeAnimated.View>
    </View>
  );
}

type DrawerProps = {
  dark: boolean;
  refraction: boolean;
  setDark: (value: boolean) => void;
  setRefraction: (value: boolean) => void;
  items: PixelNotification[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onOpen: (item: PixelNotification) => void;
  onMarkAllRead: () => void;
  onPreviewReply?: () => void;
};

export function NotificationDrawer({
  dark,
  refraction,
  setDark,
  setRefraction,
  items,
  onClose,
  onOpen,
  onDelete,
  onMarkAllRead,
  onPreviewReply,
}: DrawerProps) {
  const safe = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const panelWidth = Math.min(width - 24, 390);
  const theme = dark ? palette.dark : palette.light;
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const closing = useRef(false);
  const unread = items.filter(item => !item.read).length;

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: reduceMotion ? 0 : 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, reduceMotion]);

  const closeThen = (action?: () => void) => {
    if (closing.current) return;
    closing.current = true;

    const finish = () => {
      onClose();
      action?.();
    };

    progress.value = withTiming(
      0,
      { duration: reduceMotion ? 0 : 220 },
      finished => {
        if (finished) runOnJS(finish)();
      }
    );
  };

  const panelStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: (1 - progress.value) * panelWidth },
    ],
  }));

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.45,
  }));

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={() => closeThen()}
    >
      <View style={{ flex: 1 }}>
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: palette.charcoal },
            scrimStyle,
          ]}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close notifications backdrop"
          style={StyleSheet.absoluteFill}
          onPress={() => closeThen()}
        />

        <Animated.View
          accessibilityViewIsModal
          style={[
            s.drawer,
            {
              width: panelWidth,
              paddingTop: safe.top + 6,
              paddingBottom: safe.bottom + 12,
              backgroundColor: theme.background,
            },
            panelStyle,
          ]}
        >
         <View
  style={[
    s.row,
    {
      height: 52,
      justifyContent: 'space-between',
      paddingLeft: 18,
      paddingRight: 20,
    },
  ]}
>
            <View>
              <Text
                style={[s.drawerTitle, { color: theme.text }]}
              >
                Your inbox
              </Text>
              <Text style={[s.small, { color: theme.muted }]}>
                {unread
                  ? `${unread} unread`
                  : 'You’re all caught up'}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close notifications"
              style={s.iconButton}
              onPress={() => closeThen()}
            >
              <Feather
                name="x"
                size={23}
                color={theme.text}
              />
            </Pressable>
          </View>

          <View
            style={[
              s.preferences,
              {
                borderColor: theme.text,
                backgroundColor: theme.surface,
              },
            ]}
          >
            <View style={s.preferenceRow}>
              <View style={s.row}>
                <Feather
                  name={dark ? 'moon' : 'sun'}
                  size={18}
                  color={theme.text}
                />
                <Text
                  style={[
                    s.label,
                    { color: theme.text, marginLeft: 10 },
                  ]}
                >
                  Toggle Theme
                </Text>
              </View>

              <Switch
                accessibilityLabel="Charcoal appearance"
                value={dark}
                onValueChange={setDark}
                trackColor={{ true: palette.blue }}
              />
            </View>

            <View
              style={[
                s.preferenceRow,
                {
                  borderTopWidth: 1,
                  borderTopColor: theme.line,
                },
              ]}
            >
              <View style={s.row}>
                <Feather
                  name="droplet"
                  size={18}
                  color={theme.text}
                />
                <Text
                  style={[
                    s.label,
                    { color: theme.text, marginLeft: 10 },
                  ]}
                >
                  Liquid Glass Effect
                </Text>
              </View>

              <Switch
                accessibilityLabel="Liquid refraction"
                value={refraction}
                onValueChange={setRefraction}
                trackColor={{ true: palette.blue }}
              />
            </View>
          </View>

          <View
            style={[
              s.row,
              {
                paddingHorizontal: 18,
                justifyContent: 'space-between',
              },
            ]}
          >
            <Text style={[s.label, { color: theme.text }]}>
              Notifications
            </Text>

            <Pressable
              accessibilityRole="button"
              disabled={!unread}
              onPress={onMarkAllRead}
              style={{
                paddingVertical: 14,
                opacity: unread ? 1 : 0.4,
              }}
            >
              <Text
                style={{
                  color: palette.blue,
                  fontSize: 12,
                  fontWeight: '700',
                }}
              >
                Mark all read
              </Text>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              padding: 18,
              paddingTop: 4,
              gap: 16,
            }}
          >
            {items.map(item => (
                <SwipeNotification
    key={item.id}
    label={item.title}
    onDelete={() => onDelete(item.id)}
  >
              <View key={item.id} style={s.cardShadow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    `Open notification: ${item.title}` +
                    (item.read ? '' : ', unread')
                  }
                  onPress={() =>
                    closeThen(() => onOpen(item))
                  }
                  style={({ pressed }) => [
                    s.notificationCard,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.text,
                      transform: [
                        { translateX: pressed ? 0 : -3 },
                        { translateY: pressed ? 0 : -3 },
                      ],
                    },
                  ]}
                >
                    
                  <View
                    style={[
                      s.row,
                      { justifyContent: 'space-between' },
                    ]}
                  >
                    <Text style={s.kind}>
                      {item.kind === 'event' ? 'DISCOVER' : 'REPLY'}
                    </Text>
                    {!item.read && <View style={s.cardDot} />}
                  </View>

                  <Text
                    style={[
                      s.notificationTitle,
                      { color: theme.text },
                    ]}
                  >
                    {item.title}
                  </Text>

                  <Text
                    style={[
                      s.notificationBody,
                      { color: theme.muted },
                    ]}
                  >
                    {item.body}
                  </Text>

                  <View
                    style={[
                      s.row,
                      {
                        justifyContent: 'space-between',
                        marginTop: 14,
                      },
                    ]}
                  >
                    <Text
                      style={[s.small, { color: theme.muted }]}
                    >
                      {new Date(item.createdAt).toLocaleTimeString(
                        [],
                        {
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )}
                    </Text>
                    <Feather
                      name="arrow-up-right"
                      size={19}
                      color={palette.blue}
                    />
                  </View>
                </Pressable>
              </View>
              </SwipeNotification>
            ))}

            {!items.length && (
              <Text
                style={[
                  s.notificationBody,
                  {
                    color: theme.muted,
                    paddingVertical: 24,
                  },
                ]}
              >
                New events and replies will appear here.
              </Text>
            )}

            {onPreviewReply && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Preview a reply notification"
                onPress={() => closeThen(onPreviewReply)}
                style={[
                  s.preview,
                  { borderColor: palette.blue },
                ]}
              >
                <Text
                  style={{
                    color: palette.blue,
                    fontWeight: '700',
                  }}
                >
                  Preview reply · demo
                </Text>
              </Pressable>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarIcon: {
    width: 25,
    height: 23,
    borderWidth: 2,
    borderRadius: 5,
  },
  sidebarRail: {
    position: 'absolute',
    right: 5,
    top: 0,
    bottom: 0,
    width: 2,
  },
  sidebarLine: {
    position: 'absolute',
    left: 3,
    top: 6,
    width: 8,
    height: 2,
    borderRadius: 1,
  },
  unreadDot: {
    position: 'absolute',
    right: 5,
    top: 5,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: palette.blue,
    borderWidth: 1,
    borderColor: palette.ivory,
  },
  islandPosition: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  island: {
    backgroundColor: palette.charcoal,
    borderWidth: 2,
    borderColor: palette.blue,
    overflow: 'hidden',
  },
  seed: {
    position: 'absolute',
    width: 40,
    height: 40,
    left: '50%',
    marginLeft: -20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  islandContent: {
    position: 'absolute',
    left: -2,
    top: -2,
    height: 88,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
  },
  islandMessage: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  islandIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: palette.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  islandTitle: {
    color: palette.ivory,
    fontSize: 13,
    fontWeight: '700',
  },
  islandBody: {
    color: '#C8CED8',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  drawer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    borderLeftWidth: 3,
    borderLeftColor: palette.blue,
  },
  drawerTitle: {
    fontFamily: 'NohemiRegular',
    fontSize: 25,
    marginBottom: 4,
  },
  small: {
    fontSize: 11,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  preferences: {
    margin: 18,
    marginBottom: 6,
    borderWidth: 2,
    paddingHorizontal: 12,
  },
  preferenceRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardShadow: {
    backgroundColor: palette.blue,
    marginLeft: 3,
    marginTop: 3,
  },
  notificationCard: {
    padding: 14,
    borderWidth: 2,
  },
  kind: {
    color: palette.blue,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cardDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: palette.blue,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 10,
  },
  notificationBody: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  preview: {
    borderWidth: 2,
    padding: 14,
    alignItems: 'center',
  },
});