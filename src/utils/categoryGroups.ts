import type { Category } from '../types/inventory';

export const PRESET_GROUPS = [
  {
    key: 'monitor',
    label: 'Monitor',
    keywords: ['monitor', 'display', 'screen'],
  },
  {
    key: 'computer',
    label: 'Komputer / PC',
    keywords: ['pc', 'komputer', 'laptop', 'desktop', 'server', 'all-in-one', 'aio'],
  },
  {
    key: 'printer',
    label: 'Printer & Scanner',
    keywords: ['printer', 'scanner', 'cetak', 'thermal', 'barcode scanner'],
  },
  {
    key: 'network',
    label: 'Network & Perangkat',
    keywords: ['switch', 'router', 'access point', 'ap', 'network', 'hub', 'wifi', 'cctv', 'camera', 'ups'],
  },
];

export interface CategoryGroup {
  label: string;
  items: Category[];
}

export function groupCategories(categories: Category[]): CategoryGroup[] {
  const groups: CategoryGroup[] = PRESET_GROUPS.map((p) => ({ label: p.label, items: [] }));
  const unassigned: Category[] = [];

  categories.forEach((cat) => {
    const nameLower = cat.name.toLowerCase();
    const matchedPresetIndex = PRESET_GROUPS.findIndex((p) =>
      p.keywords.some((kw) => nameLower.includes(kw))
    );
    if (matchedPresetIndex !== -1) {
      groups[matchedPresetIndex].items.push(cat);
    } else {
      unassigned.push(cat);
    }
  });

  const activeGroups = groups.filter((g) => g.items.length > 0);
  if (unassigned.length > 0) {
    activeGroups.push({ label: 'Lainnya', items: unassigned });
  }

  return activeGroups;
}
