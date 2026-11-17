export const albums = [
  {
    id: 'after-hours',
    title: 'After hours',
    category: 'Culture',
    count: 128,
    date: 'Oct 24',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1000&q=85&fit=crop',
    author: 'Pixel Collective',
    caption: 'The lights went down. The memories stayed.',
    likes: 248,
  },
  {
    id: 'on-the-court',
    title: 'On the court',
    category: 'Sports',
    count: 86,
    date: 'Oct 20',
    image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1000&q=85&fit=crop',
    author: 'Campus Sports',
    caption: 'Every finish line has a story. Here’s ours.',
    likes: 186,
  },
  {
    id: 'class-of-26',
    title: 'Class of ’26',
    category: 'Campus',
    count: 204,
    date: 'Oct 18',
    image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=1000&q=85&fit=crop',
    author: 'Pixel Collective',
    caption: 'A chapter worth keeping forever.',
    likes: 392,
  },
  {
    id: 'ideas-in-motion',
    title: 'Ideas in motion',
    category: 'Campus',
    count: 64,
    date: 'Oct 12',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1000&q=85&fit=crop',
    author: 'The Makers Club',
    caption: 'Small teams. Big ideas. A very good afternoon.',
    likes: 97,
  },
  {
    id: 'front-row',
    title: 'Front row',
    category: 'Culture',
    count: 156,
    date: 'Oct 08',
    image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1000&q=85&fit=crop',
    author: 'Pixel Collective',
    caption: 'Wish we could replay this feeling.',
    likes: 321,
  },
  {
    id: 'campus-days',
    title: 'Campus days',
    category: 'Campus',
    count: 72,
    date: 'Oct 04',
    image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1000&q=85&fit=crop',
    author: 'Around Campus',
    caption: 'The everyday moments deserve a place here, too.',
    likes: 112,
  },
] as const;

export type Tab =
  | 'Feed'
  | 'Gallery'
  | 'Moments'
  | 'Discover'
  | 'Profile';

export const tabs = [
  { name: 'Feed', icon: 'home-outline', selected: 'home' },
  { name: 'Gallery', icon: 'images-outline', selected: 'images' },
  {
    name: 'Moments',
    icon: 'play-circle-outline',
    selected: 'play-circle',
  },
  {
    name: 'Discover',
    icon: 'compass-outline',
    selected: 'compass',
  },
  { name: 'Profile', icon: 'person-outline', selected: 'person' },
] as const;

export const palette = {
  blue: '#2563EB',
  charcoal: '#181A1D',
  ivory: '#f4edd9',
  dark: {
    background: '#000000',
    text: '#F7F4EB',
    muted: '#A9B0BC',
    surface: '#252A33',
    line: '#383E48',
  },
  light: {
    background: '#f4edd9',
    text: '#181A1D',
    muted: '#646B77',
    surface: '#EAE7DF',
    line: '#D5D3CD',
  },
};

export const photoSizes = [
  [1000, 667],
  [1000, 667],
  [1000, 667],
  [1000, 667],
  [1000, 667],
  [1000, 667],
];