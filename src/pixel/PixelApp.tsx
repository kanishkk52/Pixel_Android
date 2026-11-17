import { Feather, Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';

import {
  BackHandler,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedScrollHandler,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  NotificationButton,
  NotificationDrawer,
  NotificationIsland,
  usePixelNotifications,
  type PixelNotification
} from './Notifications';

import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import {
  albums,
  palette,
  photoSizes,
  tabs,
  type Tab,
} from './data';
import {
  GlassScene,
  hiddenBox,
  type Box,
  type PhotoSlot,
} from './GlassScene';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type Comment = {
  id: string;
  text: string;
  name: string;
};

const categories = ['All', 'Culture', 'Sports', 'Campus'];
const MAX_WIDTH = 600;

function IconButton({
  name,
  label,
  onPress,
  color,
  selected = false,
}: {
  name: IconName;
  label: string;
  onPress: () => void;
  color: string;
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        s.iconButton,
        { opacity: pressed ? 0.55 : 1 },
      ]}
    >
      <Ionicons name={name} size={23} color={color} />
    </Pressable>
  );
}

export default function PixelApp() {
  const safe = useSafeAreaInsets();
  const notifications = usePixelNotifications();
  const [size, setSize] = useState({ width: 390, height: 844 });
  const { width: w, height: h } = size;

  const [tab, setTab] = useState<Tab>('Gallery');
  const [dark, setDark] = useState(true);
  const [refraction, setRefraction] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [saved, setSaved] = useState<number[]>([]);
  const [liked, setLiked] = useState<number[]>([]);
  const [album, setAlbum] = useState<number | null>(null);
  const [settings, setSettings] = useState(false);
  const [eventInfo, setEventInfo] = useState<number | null>(null);
  const [commentPost, setCommentPost] = useState<number | null>(null);
  const [comments, setComments] = useState<Record<number, Comment[]>>({});
  const [keyboard, setKeyboard] = useState(false);

  const scroll = useSharedValue(0);
  const nativeScroll =
    useRef<React.ComponentRef<typeof ScrollView>>(null);

  const reduceMotion = useReducedMotion();
  const theme = dark ? palette.dark : palette.light;
  const top = safe.top;

  const dockWidth = Math.min(w - 36, 440);
  const dockX = (w - dockWidth) / 2;
  const dockY = h - Math.max(safe.bottom, 12) - 86;
  const cell = (dockWidth - 16) / 5;
  const circle = Math.min(50, cell - 8);

  const iconNames = [
    'home',
    'image',
    'play',
    'compass',
    'user',
  ] as const;

  const selectedX = useSharedValue(
    dockX + 8 + cell + (cell - circle) / 2
  );

  const select = (next: Tab) => {
    Keyboard.dismiss();
    setTab(next);
    scroll.value = 0;
    nativeScroll.current?.scrollTo({ y: 0, animated: false });
  };

  const scrollGesture = Gesture.Native();

const changeTabBySwipe = (direction: number) => {
  const currentIndex = tabs.findIndex(
    item => item.name === tab
  );

  const nextIndex = currentIndex + direction;

  if (nextIndex >= 0 && nextIndex < tabs.length) {
    select(tabs[nextIndex].name);
  }
};

const swipeGesture = Gesture.Pan()
  .enabled(!keyboard)
  .activeOffsetX([-24, 24])
  .failOffsetY([-20, 20])
  .simultaneousWithExternalGesture(scrollGesture)
  .onEnd(event => {
    if (Math.abs(event.translationX) < 65) return;

    runOnJS(changeTabBySwipe)(
      event.translationX < 0 ? 1 : -1
    );
  });

  const openNotification = (item: PixelNotification) => {
  notifications.markRead(item.id);

  if (item.kind === 'event') {
    select('Discover');
    setEventInfo(item.target);
  } else {
    select('Feed');

    // Add the demo reply to its comment thread.
    setComments(previous => ({
      ...previous,
      [item.target]: [
        ...(previous[item.target] || []).filter(
          comment => comment.id !== item.id
        ),
        {
          id: item.id,
          text: item.body,
          name: item.actor || 'Pixel member',
        },
      ],
    }));

    setCommentPost(item.target);
  }
};

  const toggleSave = (id: number) => {
    setSaved(previous =>
      previous.includes(id)
        ? previous.filter(value => value !== id)
        : [...previous, id]
    );
  };

  const toggleLike = (id: number) => {
    setLiked(previous =>
      previous.includes(id)
        ? previous.filter(value => value !== id)
        : [...previous, id]
    );
  };

  useEffect(() => {
    selectedX.value = withTiming(
      dockX +
        8 +
        cell * tabs.findIndex(item => item.name === tab) +
        (cell - circle) / 2,
      { duration: reduceMotion ? 0 : 230 }
    );
  }, [tab, dockX, cell, circle, reduceMotion, selectedX]);

  useEffect(() => {
    const show = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboard(true)
    );
    const hide = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboard(false)
    );

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (tab !== 'Gallery') {
          select('Gallery');
          return true;
        }
        return false;
      }
    );

    return () => subscription.remove();
  }, [tab]);

  const onScroll = useAnimatedScrollHandler(event => {
    scroll.value = Math.max(0, event.contentOffset.y);
  });

  const isGallery = tab === 'Gallery';
  const isProfile = tab === 'Profile';
  const isFeed = tab === 'Feed';
  const isDiscover = tab === 'Discover';

  const start = isGallery
    ? top + 178
    : isFeed
      ? top + 64
      : isProfile
        ? top + 272
        : top + 76;

  const gap = 12;
  const cardWidth = (w - 32 - gap) / 2;
  const cardHeight = cardWidth * 1.32;

  const ids = isGallery
    ? albums
        .map((_, i) => i)
        .filter(
          i =>
            (category === 'All' ||
              albums[i].category === category) &&
            albums[i].title
              .toLowerCase()
              .includes(query.trim().toLowerCase())
        )
    : isProfile
      ? saved
      : isFeed
        ? [0, 1, 2, 4]
        : isDiscover
          ? [3, 4]
          : [];

  const slots: PhotoSlot[] = ids.map((id, index) => {
    if (isFeed) {
      return {
        photo: id,
        box: [
          16,
          start + index * (w + 184) + 62,
          w - 32,
          w - 32,
        ],
      };
    }

    if (isDiscover) {
      return {
        photo: id,
        box: [16, start + index * 300, w - 32, 220],
      };
    }

    return {
      photo: id,
      box: [
        16 + (index % 2) * (cardWidth + gap),
        start + Math.floor(index / 2) * (cardHeight + 14),
        cardWidth,
        cardHeight,
      ],
    };
  });

  const clipTop = top;

  const bottom = slots.length
    ? Math.max(...slots.map(slot => slot.box[1] + slot.box[3]))
    : start + 180;

  const contentHeight = Math.max(
    dockY - 8,
    bottom + (isFeed ? 190 : 32)
  );

  const surfaces: Box[] = [
    hiddenBox,
    hiddenBox,
    hiddenBox,
    hiddenBox,
    hiddenBox,
    hiddenBox,
    keyboard ? hiddenBox : [dockX, dockY, dockWidth, 72],
    hiddenBox,
    hiddenBox,
  ];

  const selection: Box = keyboard
    ? hiddenBox
    : [0, dockY + (72 - circle) / 2, circle, circle];

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar
        barStyle={dark ? 'light-content' : 'dark-content'}
      />

      <View
        style={s.stage}
        onLayout={event => {
          const { width, height } = event.nativeEvent.layout;
          setSize({ width, height });
        }}
      >
        <GestureDetector gesture={swipeGesture}>
        <View
  style={s.stage}
  onLayout={event => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  }}
></View>
</GestureDetector>
        <GlassScene
          width={w}
          height={h}
          slots={slots}
          surfaces={surfaces}
          radii={[24, 20, 22, 22, 22, 22, 36, 24, 18]}
          scroll={scroll}
          selectedX={selectedX}
          selection={selection}
          dark={dark}
          refraction={refraction}
          captions={!isFeed}
          dock
          topInset={top}
        />
        <GestureDetector gesture={scrollGesture}>
        <Animated.ScrollView
          key={tab}
          ref={nativeScroll}
          style={[
            StyleSheet.absoluteFill,
            {
              top: clipTop,
              bottom: keyboard ? 0 : h - dockY + 8,
            },
          ]}
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          bounces={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            height: contentHeight - clipTop,
          }}
        >
          <View
            style={{
              height: contentHeight,
              marginTop: -clipTop,
            }}
          >
            {slots.map((slot, index) => {
              const item = albums[slot.photo];
              const [x, y, cw, ch] = slot.box;

              if (isFeed) {
                return (
                  <View
                    key={item.id}
                    style={[
                      s.absolute,
                      { left: x, top: y - 62, width: cw },
                    ]}
                  >
                    <View style={[s.row, { height: 62, gap: 10 }]}>
                      <View
                        style={[
                          s.avatarSmall,
                          { backgroundColor: theme.surface },
                        ]}
                      >
                        <Text
                          style={{
                            color: palette.blue,
                            fontWeight: '800',
                          }}
                        >
                          p.
                        </Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={[s.medium, { color: theme.text }]}>
                          {item.author}
                        </Text>
                        <Text
                          style={[
                            s.small,
                            { color: theme.muted, marginTop: 3 },
                          ]}
                        >
                          Campus · {item.date}
                        </Text>
                      </View>

                      <Text style={[s.small, { color: theme.muted }]}>
                        •••
                      </Text>
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${item.title}`}
                      onPress={() => setAlbum(slot.photo)}
                      style={{ height: ch }}
                    />

                    <View
                      style={[
                        s.row,
                        {
                          justifyContent: 'space-between',
                          marginTop: 6,
                        },
                      ]}
                    >
                      <View style={s.row}>
                        <IconButton
                          name={
                            liked.includes(slot.photo)
                              ? 'heart'
                              : 'heart-outline'
                          }
                          label={
                            liked.includes(slot.photo)
                              ? 'Unlike post'
                              : 'Like post'
                          }
                          color={
                            liked.includes(slot.photo)
                              ? palette.blue
                              : theme.text
                          }
                          selected={liked.includes(slot.photo)}
                          onPress={() => toggleLike(slot.photo)}
                        />

                        <IconButton
                          name="chatbubble-outline"
                          label="Open comments"
                          color={theme.text}
                          onPress={() => setCommentPost(slot.photo)}
                        />

                        <IconButton
                          name="paper-plane-outline"
                          label="Share post"
                          color={theme.text}
                          onPress={() => {
                            void Share.share({
                              message:
                                `${item.title} — ${item.caption} · Pixel`,
                            }).catch(() => {});
                          }}
                        />
                      </View>

                      <IconButton
                        name={
                          saved.includes(slot.photo)
                            ? 'bookmark'
                            : 'bookmark-outline'
                        }
                        label={
                          saved.includes(slot.photo)
                            ? 'Unsave collection'
                            : 'Save collection'
                        }
                        color={
                          saved.includes(slot.photo)
                            ? palette.blue
                            : theme.text
                        }
                        selected={saved.includes(slot.photo)}
                        onPress={() => toggleSave(slot.photo)}
                      />
                    </View>

                    <Text style={[s.medium, { color: theme.text }]}>
                      {item.likes +
                        (liked.includes(slot.photo) ? 1 : 0)}{' '}
                      likes
                    </Text>

                    <Text
                      numberOfLines={2}
                      style={[
                        s.body,
                        { color: theme.text, marginTop: 6 },
                      ]}
                    >
                      <Text style={{ fontWeight: '700' }}>
                        {item.author}{' '}
                      </Text>
                      {item.caption}
                    </Text>

                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setCommentPost(slot.photo)}
                    >
                      <Text
                        style={[
                          s.small,
                          { color: theme.muted, marginTop: 8 },
                        ]}
                      >
                        View comments
                        {comments[slot.photo]?.length
                          ? ` (${comments[slot.photo].length})`
                          : ''}
                      </Text>
                    </Pressable>
                  </View>
                );
              }

              return (
                <View
                  key={item.id}
                  style={[
                    s.absolute,
                    { left: x, top: y, width: cw, height: ch },
                  ]}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      `Open ${item.title}, ${item.count} photos`
                    }
                    onPress={() =>
                      isDiscover
                        ? setEventInfo(slot.photo)
                        : setAlbum(slot.photo)
                    }
                    style={StyleSheet.absoluteFill}
                  >
                    <View style={s.photoBadge}>
                      <View style={s.dot} />
                      <Text style={s.photoBadgeText}>
                        {isDiscover
                          ? 'UPCOMING'
                          : item.category.toUpperCase()}
                      </Text>
                    </View>

                    <View style={s.caption}>
                      <Text numberOfLines={1} style={s.captionTitle}>
                        {isDiscover
                          ? index === 0
                            ? 'The makers’ meetup'
                            : 'Live on campus'
                          : item.title}
                      </Text>

                      <View style={[s.row, { gap: 4, marginTop: 5 }]}>
                        <Ionicons
                          name={
                            isDiscover
                              ? 'calendar-outline'
                              : 'images-outline'
                          }
                          size={11}
                          color="#646B77"
                        />
                        <Text style={s.captionMeta}>
                          {isDiscover
                            ? 'Details coming soon'
                            : `${item.count} photos`}
                        </Text>
                      </View>
                    </View>
                  </Pressable>

                  {isDiscover && (
                    <Text
                      style={[
                        s.body,
                        {
                          position: 'absolute',
                          top: ch + 12,
                          color: theme.muted,
                        },
                      ]}
                    >
                      {index === 0
                        ? 'Meet your next collaborator.'
                        : 'Good music. Familiar faces.'}
                    </Text>
                  )}
                </View>
              );
            })}

            {!slots.length && tab !== 'Moments' && (
              <View
                style={[s.empty, { top: start + 36, width: w }]}
              >
                <Ionicons
                  name={
                    isProfile ? 'bookmark-outline' : 'search-outline'
                  }
                  color={theme.muted}
                  size={34}
                />
                <Text
                  style={[
                    s.sectionTitle,
                    { color: theme.text, marginTop: 16 },
                  ]}
                >
                  {isProfile
                    ? 'Keep a little of everything'
                    : 'Nothing here yet'}
                </Text>
                <Text
                  style={[
                    s.body,
                    {
                      color: theme.muted,
                      textAlign: 'center',
                      marginTop: 8,
                      paddingHorizontal: 32,
                    },
                  ]}
                >
                  {isProfile
                    ? 'Save a collection or a post. You’ll find it here.'
                    : 'Try another event name or category.'}
                </Text>
              </View>
            )}

            {tab === 'Moments' && (
              <View
                style={[s.empty, { top: start + 90, width: w }]}
              >
                <View
                  style={[
                    s.emptyOrb,
                    { backgroundColor: theme.surface },
                  ]}
                >
                  <Ionicons name="play" size={34} color={palette.blue} />
                </View>
                <Text
                  style={[
                    s.sectionTitle,
                    { color: theme.text, marginTop: 24 },
                  ]}
                >
                  A moment worth replaying
                </Text>
                <Text
                  style={[
                    s.body,
                    {
                      color: theme.muted,
                      textAlign: 'center',
                      paddingHorizontal: 44,
                      marginTop: 10,
                    },
                  ]}
                >
                  Campus videos will live here. Check back for the next
                  drop.
                </Text>
              </View>
            )}

            {/* The header is inside the scroll view. */}
            <View
              style={[
                s.topBar,
                {
                  height: top + 60,
                  backgroundColor: theme.background,
                },
              ]}
            >
              <View
                style={[
                  s.header,
                  { left: 20, top: top + 6, width: w - 40 },
                ]}
              >
                <View style={s.brandRow}>
                  <Image
                    source={require('../../assets/images/pixel-logo.png')}
                    style={s.brandMark}
                    resizeMode="contain"
                  />
                  <Text
                    accessibilityLabel="Pixel"
                    style={[s.wordmark, { color: theme.text }]}
                  >
                    Pixel
                  </Text>
                </View>

                <View style={s.row}>
                  <Text
                    style={[
                      s.medium,
                      { color: theme.muted, marginRight: 4 },
                    ]}
                  >
                    {tab}
                  </Text>
                  <NotificationButton
                    color={theme.text}
                    unread={notifications.unread}
                    onPress={() => {
                      Keyboard.dismiss();
                      setSettings(true);
                    }}
                  />
                </View>
              </View>
            </View>

            {isGallery && (
              <>
                <View
                  style={[
                    s.search,
                    {
                      top: top + 68,
                      width: w - 32,
                      backgroundColor: theme.surface,
                      borderColor: theme.text,
                    },
                  ]}
                >
                  <Ionicons
                    name="search-outline"
                    size={20}
                    color={theme.muted}
                  />
                  <TextInput
                    testID="gallery-search"
                    accessibilityLabel="Search collections"
                    value={query}
                    onChangeText={value => {
                      setQuery(value);
                      scroll.value = 0;
                      nativeScroll.current?.scrollTo({
                        y: 0,
                        animated: false,
                      });
                    }}
                    placeholder="Find your next memory"
                    placeholderTextColor={theme.muted}
                    style={[s.searchInput, { color: theme.text }]}
                    returnKeyType="search"
                    onSubmitEditing={Keyboard.dismiss}
                    autoCorrect={false}
                  />
                  {!!query && (
                    <IconButton
                      name="close"
                      label="Clear search"
                      color={theme.muted}
                      onPress={() => setQuery('')}
                    />
                  )}
                </View>

                <View
                  style={[
                    s.filters,
                    { top: top + 122, width: w - 32 },
                  ]}
                >
                  {categories.map(item => (
                    <Pressable
                      key={item}
                      accessibilityRole="button"
                      accessibilityLabel={`Filter ${item}`}
                      accessibilityState={{
                        selected: category === item,
                      }}
                      onPress={() => {
                        setCategory(item);
                        scroll.value = 0;
                        nativeScroll.current?.scrollTo({
                          y: 0,
                          animated: false,
                        });
                      }}
                      style={[
                        s.filter,
                        {
                          backgroundColor:
                            category === item
                              ? palette.ivory
                              : palette.blue,
                        },
                      ]}
                    >
                      {({ pressed }) => (
                        <View
                          style={[
                            s.filterFace,
                            {
                              backgroundColor:
                                category === item
                                  ? palette.blue
                                  : palette.ivory,
                              transform: [
                                { translateX: pressed ? 0 : -3 },
                                { translateY: pressed ? 0 : -3 },
                              ],
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color:
                                category === item
                                  ? palette.ivory
                                  : palette.charcoal,
                              fontSize: 12,
                              fontWeight: '700',
                            }}
                          >
                            {item}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {isProfile && (
              <>
                <View
                  style={[s.profileIntro, { top: top + 80 }]}
                >
                  <View
                    style={[
                      s.profileAvatar,
                      { backgroundColor: palette.blue },
                    ]}
                  >
                    <Ionicons
                      name="person"
                      size={28}
                      color={palette.ivory}
                    />
                  </View>
                  <View>
                    <Text
                      style={[s.sectionTitle, { color: theme.text }]}
                    >
                      Pixel member
                    </Text>
                    <Text
                      style={[
                        s.small,
                        { color: theme.muted, marginTop: 4 },
                      ]}
                    >
                      Your campus, your collection
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    s.stats,
                    {
                      top: top + 142,
                      width: w - 32,
                      backgroundColor: theme.surface,
                      borderColor: theme.text,
                    },
                  ]}
                >
                  {[
                    [String(saved.length), 'Saved'],
                    ['0', 'Followers'],
                    ['0', 'Following'],
                  ].map(([count, label]) => (
                    <View
                      key={label}
                      style={{ flex: 1, alignItems: 'center' }}
                    >
                      <Text
                        style={[s.sectionTitle, { color: theme.text }]}
                      >
                        {count}
                      </Text>
                      <Text
                        style={[
                          s.small,
                          { color: theme.muted, marginTop: 4 },
                        ]}
                      >
                        {label}
                      </Text>
                    </View>
                  ))}
                </View>

                <Text
                  style={[
                    s.medium,
                    {
                      position: 'absolute',
                      top: top + 238,
                      left: 18,
                      color: theme.text,
                    },
                  ]}
                >
                  Saved collections
                </Text>
              </>
            )}
          </View>
        </Animated.ScrollView>
        </GestureDetector>

        {/* Only the safe-area cover and navbar stay fixed. */}
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: top,
              backgroundColor: theme.background,
            }}
          />

          {!keyboard && (
            <View
              accessibilityRole="tablist"
              style={[
                s.nav,
                {
                  left: dockX + 8,
                  top: dockY,
                  width: dockWidth - 16,
                },
              ]}
            >
              {tabs.map((item, index) => (
                <Pressable
                  key={item.name}
                  accessibilityRole="tab"
                  accessibilityLabel={item.name}
                  accessibilityState={{
                    selected: tab === item.name,
                  }}
                  onPress={() => select(item.name)}
                  style={s.navItem}
                >
                  {({ pressed }) => (
                    <View
                      style={{
                        width: circle,
                        height: circle,
                        borderRadius: circle / 2,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'transparent',
                          
                      }}
                    >
                      <Feather
                        name={iconNames[index]}
                        size={23}
                        color={
                          tab === item.name
                            ? palette.ivory
                            : theme.text
                        }
                      />
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>

      {eventInfo !== null && (
        <EventModal
          photo={eventInfo}
          dark={dark}
          refraction={refraction}
          close={() => setEventInfo(null)}
        />
      )}

      {album !== null && (
        <CollectionModal
          initial={album}
          dark={dark}
          refraction={refraction}
          saved={saved}
          toggleSave={toggleSave}
          close={() => setAlbum(null)}
        />
      )}

      {settings && (
  <NotificationDrawer
    dark={dark}
    refraction={refraction}
    setDark={setDark}
    setRefraction={setRefraction}
    items={notifications.items}
    onClose={() => setSettings(false)}
    onOpen={openNotification}
    onDelete={notifications.remove}
    onMarkAllRead={notifications.markAllRead}
    onPreviewReply={notifications.previewReply}
  />
)}

{!settings &&
  album === null &&
  eventInfo === null &&
  commentPost === null &&
  !keyboard &&
  notifications.current && (
    <NotificationIsland
      key={notifications.current.id}
      item={notifications.current}
      onDismiss={notifications.dismiss}
      onOpen={openNotification}
    />
  )}

      {commentPost !== null && (
        <CommentsModal
          dark={dark}
          comments={comments[commentPost] || []}
          close={() => setCommentPost(null)}
          submit={text => {
            setComments(previous => ({
              ...previous,
              [commentPost]: [
                ...(previous[commentPost] || []),
                {
                  id: String(Date.now()),
                  text,
                  name: 'You',
                },
              ],
            }));
          }}
        />
      )}
    </View>
  );
}

function CollectionModal({
  initial,
  dark,
  refraction,
  saved,
  toggleSave,
  close,
}: {
  initial: number;
  dark: boolean;
  refraction: boolean;
  saved: number[];
  toggleSave: (id: number) => void;
  close: () => void;
}) {
  const safe = useSafeAreaInsets();
  const theme = dark ? palette.dark : palette.light;
  const [size, setSize] = useState({ width: 390, height: 844 });
  const { width: w, height: h } = size;

  const [photo, setPhoto] = useState<number | null>(null);
  const scroll = useSharedValue(0);
  const selected = useSharedValue(0);

  const handler = useAnimatedScrollHandler(event => {
    scroll.value = Math.max(0, event.contentOffset.y);
  });

  const ids = [
    initial,
    ...albums.map((_, i) => i).filter(i => i !== initial),
  ];

  const cw = (w - 44) / 2;
  const ch = cw * 1.22;
  const start = safe.top + 116;
  const availableHeight = Math.max(
    180,
    h - safe.top - safe.bottom - 200
  );

  const [iw, ih] = photoSizes[photo ?? initial];
  const scale = Math.min(w / iw, availableHeight / ih);

  const fitted: Box = [
    (w - iw * scale) / 2,
    safe.top + 80 + (availableHeight - ih * scale) / 2,
    iw * scale,
    ih * scale,
  ];

  const slots: PhotoSlot[] =
    photo === null
      ? ids.map((id, i) => ({
          photo: id,
          box: [
            16 + (i % 2) * (cw + 12),
            start + Math.floor(i / 2) * (ch + 12),
            cw,
            ch,
          ],
        }))
      : [{ photo, box: fitted }];

  const toolbar: Box =
    photo === null
      ? [16, h - Math.max(safe.bottom, 12) - 72, w - 32, 56]
      : [32, h - Math.max(safe.bottom, 12) - 76, w - 64, 56];

  const onBack = () => {
    if (photo !== null) {
      setPhoto(null);
      scroll.value = 0;
    } else {
      close();
    }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onBack}>
      <View
        style={[s.stage, { backgroundColor: theme.background }]}
        onLayout={event => {
          const { width, height } = event.nativeEvent.layout;
          setSize({ width, height });
        }}
      >
        <StatusBar
          barStyle={dark ? 'light-content' : 'dark-content'}
        />

        <GlassScene
          width={w}
          height={h}
          slots={slots}
          surfaces={[[16, safe.top + 8, w - 32, 56], toolbar]}
          radii={[26, 28]}
          scroll={scroll}
          selectedX={selected}
          selection={hiddenBox}
          dark={dark}
          refraction={refraction}
          captions={false}
        />

        {photo === null ? (
          <Animated.ScrollView
            onScroll={handler}
            scrollEventThrottle={16}
            bounces={false}
            overScrollMode="never"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              height: start + 3 * (ch + 12) + 120,
            }}
          >
            {slots.map(slot => (
              <Pressable
                key={slot.photo}
                accessibilityRole="button"
                accessibilityLabel={`View photo ${slot.photo + 1}`}
                onPress={() => {
                  setPhoto(slot.photo);
                  scroll.value = 0;
                }}
                style={{
                  position: 'absolute',
                  left: slot.box[0],
                  top: slot.box[1],
                  width: slot.box[2],
                  height: slot.box[3],
                }}
              />
            ))}
          </Animated.ScrollView>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        <View
          style={[
            s.header,
            {
              left: 22,
              top: safe.top + 8,
              width: w - 44,
              height: 56,
            },
          ]}
        >
          <IconButton
            name="arrow-back"
            label={
              photo === null ? 'Close collection' : 'Back to collection'
            }
            color={theme.text}
            onPress={onBack}
          />
          <Text
            numberOfLines={1}
            style={[
              s.medium,
              { flex: 1, color: theme.text, marginLeft: 8 },
            ]}
          >
            {albums[initial].title}
          </Text>
          <Text
            style={[
              s.small,
              { color: theme.muted, marginRight: 12 },
            ]}
          >
            {photo === null
              ? '6 photos'
              : `${ids.indexOf(photo) + 1} / 6`}
          </Text>
        </View>

        {photo === null && (
          <Text
            style={[
              s.small,
              {
                position: 'absolute',
                left: 18,
                top: safe.top + 83,
                color: theme.muted,
              },
            ]}
          >
            Demo collection · curated campus photography
          </Text>
        )}

        <View
          style={[
            s.absolute,
            s.row,
            {
              left: toolbar[0] + 8,
              top: toolbar[1],
              width: toolbar[2] - 16,
              height: 56,
              justifyContent: 'space-around',
            },
          ]}
        >
          {photo !== null && (
            <IconButton
              name="chevron-back"
              label="Previous photo"
              color={theme.text}
              onPress={() =>
                setPhoto(ids[(ids.indexOf(photo) + 5) % 6])
              }
            />
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              saved.includes(initial)
                ? 'Unsave collection'
                : 'Save collection'
            }
            accessibilityState={{
              selected: saved.includes(initial),
            }}
            onPress={() => toggleSave(initial)}
            style={[s.row, { gap: 8, padding: 12 }]}
          >
            <Ionicons
              name={
                saved.includes(initial)
                  ? 'bookmark'
                  : 'bookmark-outline'
              }
              color={
                saved.includes(initial)
                  ? palette.blue
                  : theme.text
              }
              size={21}
            />
            <Text style={[s.medium, { color: theme.text }]}>
              {saved.includes(initial) ? 'Saved' : 'Save collection'}
            </Text>
          </Pressable>

          {photo !== null && (
            <IconButton
              name="chevron-forward"
              label="Next photo"
              color={theme.text}
              onPress={() =>
                setPhoto(ids[(ids.indexOf(photo) + 1) % 6])
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

function EventModal({
  photo,
  dark,
  refraction,
  close,
}: {
  photo: number;
  dark: boolean;
  refraction: boolean;
  close: () => void;
}) {
  const safe = useSafeAreaInsets();
  const theme = dark ? palette.dark : palette.light;
  const [size, setSize] = useState({ width: 390, height: 844 });
  const { width: w, height: h } = size;

  const scroll = useSharedValue(0);
  const selected = useSharedValue(0);

  const title =
    photo === 3 ? 'The makers’ meetup' : 'Live on campus';

  const button: Box = [
    24,
    h - Math.max(safe.bottom, 12) - 76,
    w - 48,
    56,
  ];

  return (
    <Modal visible animationType="slide" onRequestClose={close}>
      <View
        style={[s.stage, { backgroundColor: theme.background }]}
        onLayout={event => {
          const { width, height } = event.nativeEvent.layout;
          setSize({ width, height });
        }}
      >
        <GlassScene
          width={w}
          height={h}
          slots={[
            {
              photo,
              box: [16, safe.top + 84, w - 32, 230],
            },
          ]}
          surfaces={[[16, safe.top + 8, w - 32, 52], button]}
          radii={[24, 28]}
          scroll={scroll}
          selectedX={selected}
          selection={hiddenBox}
          dark={dark}
          refraction={refraction}
          captions={false}
        />

        <View
          style={[
            s.header,
            { left: 22, top: safe.top + 8, width: w - 44 },
          ]}
        >
          <IconButton
            name="arrow-back"
            label="Close event details"
            color={theme.text}
            onPress={close}
          />
          <Text
            style={[
              s.medium,
              { color: theme.text, marginRight: 12 },
            ]}
          >
            Spotlight
          </Text>
        </View>

        <View
          style={{
            position: 'absolute',
            left: 24,
            right: 24,
            top: safe.top + 340,
          }}
        >
          <Text
            style={[
              s.small,
              {
                color: palette.blue,
                fontWeight: '700',
                letterSpacing: 1,
              },
            ]}
          >
            ON THE HORIZON
          </Text>
          <Text
            style={[
              s.title,
              { color: theme.text, marginTop: 12 },
            ]}
          >
            {title}
          </Text>
          <Text
            style={[
              s.body,
              { color: theme.muted, marginTop: 14 },
            ]}
          >
            {photo === 3
              ? 'An afternoon of making, sharing ideas, and meeting your next collaborator.'
              : 'A night for familiar faces, new favourites, and music that stays with you.'}
          </Text>
          <View style={[s.row, { gap: 8, marginTop: 24 }]}>
            <Ionicons
              name="calendar-outline"
              size={19}
              color={palette.blue}
            />
            <Text style={[s.body, { color: theme.text }]}>
              Date and venue to be announced
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to Discover"
          onPress={close}
          style={{
            position: 'absolute',
            left: button[0],
            top: button[1],
            width: button[2],
            height: 56,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={[s.medium, { color: theme.text }]}>
            Back to Discover
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function CommentsModal({
  dark,
  comments,
  close,
  submit,
}: {
  dark: boolean;
  comments: Comment[];
  close: () => void;
  submit: (text: string) => void;
}) {
  const [text, setText] = useState('');
  const theme = dark ? palette.dark : palette.light;
  const safe = useSafeAreaInsets();

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={close}
    >
      <KeyboardAvoidingView
        style={s.scrim}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close comments"
          onPress={close}
          style={StyleSheet.absoluteFill}
        />

        <View
          style={[
            s.sheet,
            {
              backgroundColor: theme.background,
              paddingBottom: safe.bottom + 16,
              maxHeight: '75%',
            },
          ]}
        >
          <View
            style={[s.row, { justifyContent: 'space-between' }]}
          >
            <Text style={[s.sectionTitle, { color: theme.text }]}>
              Comments
            </Text>
            <IconButton
              name="close"
              label="Close comments"
              color={theme.text}
              onPress={close}
            />
          </View>

          <ScrollView
            style={{ maxHeight: 300 }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingVertical: 16 }}
          >
            {comments.length ? (
              comments.map(comment => (
                <View
                  key={comment.id}
                  style={{ marginBottom: 20 }}
                >
                  <Text style={[s.medium, { color: theme.text }]}>
                    {comment.name}
                  </Text>
                  <Text
                    style={[
                      s.body,
                      { color: theme.text, marginTop: 4 },
                    ]}
                  >
                    {comment.text}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[s.body, { color: theme.muted }]}>
                Start the conversation.
              </Text>
            )}
          </ScrollView>

          <View
            style={[
              s.row,
              {
                gap: 8,
                backgroundColor: theme.surface,
                borderRadius: 24,
                paddingLeft: 16,
              },
            ]}
          >
            <TextInput
              accessibilityLabel="Write a comment"
              value={text}
              onChangeText={setText}
              placeholder="Add a comment…"
              placeholderTextColor={theme.muted}
              style={[s.searchInput, { color: theme.text }]}
              maxLength={500}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Post comment"
              disabled={!text.trim()}
              onPress={() => {
                submit(text.trim());
                setText('');
                Keyboard.dismiss();
              }}
              style={[
                s.iconButton,
                { opacity: text.trim() ? 1 : 0.35 },
              ]}
            >
              <Ionicons
                name="arrow-up-circle"
                color={palette.blue}
                size={32}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  stage: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  absolute: { position: 'absolute' },
  row: { flexDirection: 'row', alignItems: 'center' },

  header: {
    position: 'absolute',
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandMark: { width: 30, height: 30 },
  wordmark: {
    fontFamily: 'NohemiRegular',
    fontSize: 26,
    letterSpacing: -0.7,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 27,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  medium: { fontSize: 14, fontWeight: '600' },
  small: { fontSize: 11 },
  body: { fontSize: 14, lineHeight: 21 },

  search: {
    borderWidth: 2,
    borderRadius: 24,
    position: 'absolute',
    left: 16,
    height: 48,
    paddingLeft: 16,
    paddingRight: 5,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    minHeight: 48,
    fontSize: 14,
    paddingVertical: 10,
  },
  filters: {
    position: 'absolute',
    left: 16,
    flexDirection: 'row',
    gap: 8,
    height: 44,
  },
  filter: {
  flex: 1,
  borderRadius: 0,
  height: 44,
},

filterFace: {
  flex: 1,
  borderRadius: 0,
  borderWidth: 2,
  borderColor: '#181A1D',
  alignItems: 'center',
  justifyContent: 'center',
},
  photoBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#2563EB',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#181A1D',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#A8C5FF',
  },
  photoBadgeText: {
    color: '#F7F4EB',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  caption: {
    position: 'absolute',
    left: 19,
    right: 17,
    bottom: 18,
  },
  captionTitle: {
    color: '#181A1D',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  captionMeta: { color: '#646B77', fontSize: 10 },

  nav: {
    position: 'absolute',
    height: 72,
    flexDirection: 'row',
  },
  navItem: {
    flex: 1,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    position: 'absolute',
    alignItems: 'center',
  },
  emptyOrb: {
    width: 88,
    height: 88,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIntro: {
    position: 'absolute',
    left: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: {
    position: 'absolute',
    left: 16,
    flexDirection: 'row',
    height: 76,
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 28,
  },
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#181A1D99',
  },
  sheet: {
    padding: 24,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 2,
    borderColor: palette.blue,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
});
