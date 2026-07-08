// Goal category metadata — id must match the backend CATEGORIES enum.
export interface CategoryMeta {
  id: string;
  label: string;
  emoji: string;
  chip: string; // tailwind classes for the tag chip
}

export const CATEGORIES: CategoryMeta[] = [
  { id: 'personal_growth', label: 'Personal Growth', emoji: '🌱', chip: 'text-emerald-300 border-emerald-400/30' },
  { id: 'career', label: 'Career', emoji: '🚀', chip: 'text-sky-300 border-sky-400/30' },
  { id: 'business', label: 'Business', emoji: '💼', chip: 'text-amber-300 border-amber-400/30' },
  { id: 'financial', label: 'Financial', emoji: '💰', chip: 'text-gold border-gold/30' },
  { id: 'learning', label: 'Learning', emoji: '📚', chip: 'text-cyan-300 border-cyan-400/30' },
  { id: 'health_fitness', label: 'Health & Fitness', emoji: '💪', chip: 'text-flame border-flame/30' },
  { id: 'relationships', label: 'Relationships', emoji: '❤️', chip: 'text-pink-300 border-pink-400/30' },
  { id: 'other', label: 'Goal', emoji: '✦', chip: 'text-slate-300 border-white/15' },
];

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function categoryMeta(id: string | null | undefined): CategoryMeta {
  return (id && BY_ID.get(id)) || CATEGORIES[CATEGORIES.length - 1];
}
