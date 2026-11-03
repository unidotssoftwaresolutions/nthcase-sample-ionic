/** The four aisles of the shop. The key is what the form's picker stores; the label is what it shows. */
export type CategoryKey = 'kitchen' | 'desk' | 'garden' | 'home';

export const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: 'kitchen', label: 'Kitchen' },
  { key: 'desk', label: 'Desk' },
  { key: 'garden', label: 'Garden' },
  { key: 'home', label: 'Home' },
];

export function categoryLabel(key: CategoryKey): string {
  return CATEGORIES.find((c) => c.key === key)!.label;
}

/** Which original line drawing an item wears (art/glyphs/*.svg). */
export type Glyph = 'mug' | 'notebook' | 'plant' | 'candle' | 'lamp' | 'bottle' | 'clock' | 'tote' | 'pen' | 'bowl';

export interface Item {
  id: number;
  name: string;
  category: CategoryKey;
  glyph: Glyph;
  priceCents: number;
  description: string;
}

/** "No. 007": the item number every screen shows. */
export function itemNumber(id: number): string {
  return `No. ${String(id).padStart(3, '0')}`;
}

/** Fixed US-dollar prices, so every run and every framework shows the same text. */
export function formatPrice(cents: number): string {
  return `$${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

function item(id: number, name: string, category: CategoryKey, glyph: Glyph, priceCents: number, description: string): Item {
  return { id, name, category, glyph, priceCents, description };
}

/**
 * The seeded catalogue: forty invented items, identical in every Mossgrove app (SPEC.md §3). Nothing is fetched; the
 * order here is the order of the list.
 */
export const ITEMS: readonly Item[] = [
  item(1, 'Stoneware Mug', 'kitchen', 'mug', 1400, 'A heavy, speckled mug that keeps tea warm through a long call.'),
  item(2, 'Grid Notebook', 'desk', 'notebook', 950, 'Ninety-six pages of 5 mm grid, stitched to lie flat.'),
  item(3, 'Desk Fern', 'garden', 'plant', 1800, 'A small fern in a glazed pot. Likes shade and a weekly drink.'),
  item(4, 'Cedar Candle', 'home', 'candle', 1600, 'Soy wax with a dry cedar scent. Burns for about forty hours.'),
  item(5, 'Brass Desk Lamp', 'desk', 'lamp', 4200, 'A warm, low lamp with a brass shade and a fabric cable.'),
  item(6, 'Steel Water Bottle', 'kitchen', 'bottle', 2400, 'Double-walled steel. Cold for a day, hot for half of one.'),
  item(7, 'Wall Clock', 'home', 'clock', 3500, 'A quiet sweep movement behind a plain white face.'),
  item(8, 'Canvas Tote', 'home', 'tote', 2200, 'Heavy canvas with long handles and one inside pocket.'),
  item(9, 'Fineliner Pen Set', 'desk', 'pen', 1200, 'Six fineliners in muted inks, 0.4 mm tips.'),
  item(10, 'Serving Bowl', 'kitchen', 'bowl', 2800, 'A wide stoneware bowl for salads, fruit or bread.'),
  item(11, 'Espresso Cup Pair', 'kitchen', 'mug', 1900, 'Two small cups with thick walls and saucers to match.'),
  item(12, 'Dot Journal', 'desk', 'notebook', 1100, 'Dotted pages, numbered, with two ribbon markers.'),
  item(13, 'Succulent Trio', 'garden', 'plant', 2100, 'Three hardy succulents that forgive a missed watering.'),
  item(14, 'Fig Leaf Candle', 'home', 'candle', 1750, 'Green and milky. Smells like a fig tree after rain.'),
  item(15, 'Clip Reading Lamp', 'desk', 'lamp', 2900, 'Clips to a shelf or a bed frame. Three brightness steps.'),
  item(16, 'Glass Carafe', 'kitchen', 'bottle', 2600, 'A litre of water on the table, with a cup for a lid.'),
  item(17, 'Alarm Clock', 'home', 'clock', 2300, 'A silent tick and a gentle rising alarm.'),
  item(18, 'Market Bag', 'home', 'tote', 1500, 'Folds into its own pocket. Holds a week of vegetables.'),
  item(19, 'Fountain Pen', 'desk', 'pen', 3800, 'A steel nib, a converter, and a box of blue cartridges.'),
  item(20, 'Salad Bowl', 'kitchen', 'bowl', 3200, 'Oiled wood, turned from one piece.'),
  item(21, 'Travel Mug', 'kitchen', 'mug', 1800, "Leak-proof lid, fits a car's cup holder."),
  item(22, 'Sketchbook', 'desk', 'notebook', 1350, 'Heavy blank paper that takes ink and light washes.'),
  item(23, 'Herb Planter', 'garden', 'plant', 2700, 'A long planter for a sunny sill. Seeds not included.'),
  item(24, 'Beeswax Taper Set', 'home', 'candle', 1450, 'Four hand-dipped tapers that burn clean and slow.'),
  item(25, 'Floor Lamp', 'home', 'lamp', 8900, 'A tall arc of steel with a linen shade.'),
  item(26, 'Oil Bottle', 'kitchen', 'bottle', 1250, 'A pourer that stops dripping when you stop pouring.'),
  item(27, 'Desk Clock', 'desk', 'clock', 3100, 'A small square clock with a date window.'),
  item(28, 'Laptop Tote', 'desk', 'tote', 3600, 'A padded sleeve with handles for a 14-inch laptop.'),
  item(29, 'Brush Pen', 'desk', 'pen', 750, 'A soft tip for lettering and quick sketches.'),
  item(30, 'Noodle Bowl', 'kitchen', 'bowl', 1600, 'Deep enough for broth, with a rest for chopsticks.'),
  item(31, 'Tea Mug', 'kitchen', 'mug', 1500, 'A tall mug with a steel infuser that sits inside.'),
  item(32, 'Pocket Notebook', 'desk', 'notebook', 600, 'Fits a back pocket. Ruled, sixty-four pages.'),
  item(33, 'Hanging Planter', 'garden', 'plant', 2450, 'A glazed pot on a cotton rope, for trailing plants.'),
  item(34, 'Pine Candle', 'home', 'candle', 1600, 'Resin and needles. Best on a cold evening.'),
  item(35, 'Bedside Lamp', 'home', 'lamp', 4500, 'A touch dimmer and a shade that does not glare.'),
  item(36, 'Vacuum Flask', 'kitchen', 'bottle', 2950, 'Keeps soup hot from breakfast until lunch.'),
  item(37, 'Kitchen Timer', 'kitchen', 'clock', 1950, 'A wind-up timer with a bell you can hear upstairs.'),
  item(38, 'Beach Tote', 'home', 'tote', 2500, 'Striped cotton that shakes clean of sand.'),
  item(39, 'Pencil Set', 'desk', 'pen', 850, 'Twelve graphite pencils, 4H to 6B.'),
  item(40, 'Fruit Bowl', 'kitchen', 'bowl', 3400, 'A wire bowl that lets fruit breathe.'),
];

export function findItem(id: number): Item | undefined {
  return ITEMS[id - 1]?.id === id ? ITEMS[id - 1] : undefined;
}

/**
 * Search by name (case-insensitive, anywhere in the name) or by number: "7", "007" and "No. 007" all find item 7.
 * A blank query matches everything.
 */
export function search(query: string): Item[] {
  const q = query.trim();
  if (q === '') return [...ITEMS];
  const digits = q.replace(/^no\./i, '').trim();
  const number = /^\d+$/.test(digits) ? Number.parseInt(digits, 10) : null;
  const lower = q.toLowerCase();
  return ITEMS.filter((it) => it.name.toLowerCase().includes(lower) || (number !== null && it.id === number));
}

/** The five delivery slots the slow screen shows, in order. */
export const DELIVERY_SLOTS = [
  'Monday · 8:00–10:00',
  'Monday · 18:00–20:00',
  'Wednesday · 12:00–14:00',
  'Friday · 8:00–10:00',
  'Saturday · 10:00–12:00',
] as const;
