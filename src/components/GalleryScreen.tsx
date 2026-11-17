import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    FlatList,
    Image,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from './theme';

const events = [
  {
    id: '1',
    name: 'Cultural Night',
    category: 'Cultural',
    count: 128,
    image:
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=85',
  },
  {
    id: '2',
    name: 'Sports Day',
    category: 'Sports',
    count: 86,
    image:
      'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=85',
  },
  {
    id: '3',
    name: 'Music Fest',
    category: 'Cultural',
    count: 204,
    image:
      'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&q=85',
  },
];

type Event = (typeof events)[number];

export default function GalleryScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState<Event | null>(null);

  const filtered = events.filter(event =>
    event.name.toLowerCase().includes(search.trim().toLowerCase()) &&
    (filter === 'All' || event.category === filter)
  );

  return (
    <View style={styles.screen}>
      <View style={styles.search}>
        <Ionicons
          name="search-outline"
          size={20}
          color={colors.darkMuted}
        />

        <TextInput
          accessibilityLabel="Search event albums"
          placeholder="Search events"
          placeholderTextColor={colors.darkMuted}
          value={search}
          onChangeText={setSearch}
          style={styles.input}
          autoCorrect={false}
        />

        {!!search && (
          <Pressable
            accessibilityLabel="Clear search"
            accessibilityRole="button"
            onPress={() => setSearch('')}
            hitSlop={12}
          >
            <Ionicons
              name="close-circle"
              size={20}
              color={colors.darkMuted}
            />
          </Pressable>
        )}
      </View>

      <View style={styles.filters}>
        {['All', 'Cultural', 'Sports'].map(item => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === item }}
            onPress={() => setFilter(item)}
            style={[
              styles.filter,
              filter === item && styles.activeFilter,
            ]}
          >
            <Text
              style={{
                color:
                  filter === item ? colors.ivory : colors.darkMuted,
                fontWeight: '600',
              }}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        numColumns={2}
        keyExtractor={item => item.id}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${item.name}`}
            onPress={() => setSelected(item)}
            style={({ pressed }) => [
              styles.album,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <View>
              <Image
                source={{ uri: item.image }}
                style={styles.cover}
              />
              <View style={styles.count}>
                <Ionicons
                  name="images-outline"
                  size={12}
                  color={colors.ivory}
                />
                <Text style={styles.countText}>{item.count}</Text>
              </View>
            </View>

            <Text style={styles.albumTitle}>{item.name}</Text>
            <Text style={styles.albumSubtitle}>{item.category}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name="search-outline"
              size={32}
              color={colors.darkMuted}
            />
            <Text style={styles.albumTitle}>No matching events</Text>
            <Text style={styles.albumSubtitle}>
              Try another name or category.
            </Text>
          </View>
        }
      />

      <Modal
        visible={selected !== null}
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <View
          style={[
            styles.screen,
            {
              paddingTop: insets.top + 12,
              paddingBottom: insets.bottom + 20,
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close album"
              onPress={() => setSelected(null)}
              style={styles.close}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={colors.ivory}
              />
            </Pressable>

            <Text style={styles.albumTitle}>{selected?.name}</Text>
          </View>

          {selected && (
            <Image
              source={{ uri: selected.image }}
              style={{ flex: 1, width: '100%' }}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.charcoal },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.darkSurface,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    minHeight: 48,
  },
  input: {
    flex: 1,
    color: colors.ivory,
    fontSize: 15,
    paddingVertical: 12,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  filter: {
    paddingHorizontal: 18,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: colors.darkSurface,
  },
  activeFilter: { backgroundColor: colors.blue },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  album: { width: '48%', marginBottom: 24 },
  cover: {
    width: '100%',
    aspectRatio: 0.9,
    borderRadius: 18,
    backgroundColor: colors.darkSurface,
  },
  count: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.charcoal,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
  },
  countText: { color: colors.ivory, fontSize: 11 },
  albumTitle: {
    color: colors.ivory,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 10,
  },
  albumSubtitle: {
    color: colors.darkMuted,
    fontSize: 12,
    marginTop: 5,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 48,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  close: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});