import type { CollectionEntry } from 'astro:content';
import { withBase } from '../../lib/url';

/** Flat, render-ready shape for one row of PostList. */
export interface PostItem {
  id: string;
  /** Site-absolute href, base path already applied. */
  href: string;
  title: string;
  description: string;
  date: Date;
  tags: string[];
  readingMinutes: number;
}

const dateFormat = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** 30 Oktober 2026 */
export function formatDate(date: Date): string {
  return dateFormat.format(date);
}

/** ISO date for <time datetime>. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Arabic-numeral slug for a tag: lowercase, spaces -> hyphen. */
export function tagSlug(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, '-');
}

/**
 * Rough reading time at 200 wpm, fenced code included (reading, not skimming).
 * Body is the raw markdown from the glob loader.
 */
export function readingMinutes(entry: CollectionEntry<'research'>): number {
  const words = (entry.body ?? '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function toPostItem(entry: CollectionEntry<'research'>): PostItem {
  return {
    id: entry.id,
    href: withBase(`/research/${entry.id}/`),
    title: entry.data.title,
    description: entry.data.description,
    date: entry.data.date,
    tags: entry.data.tags,
    readingMinutes: readingMinutes(entry),
  };
}

/** Newest first. */
export function sortByDateDesc<T extends { data: { date: Date } }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export interface TagBucket {
  /** Display label, first spelling encountered. */
  label: string;
  slug: string;
  count: number;
  items: CollectionEntry<'research'>[];
}

/**
 * Group published entries by tag slug. Counts per slug (so "Cloud" and "cloud"
 * collapse), sorted by count desc then alphabetically.
 */
export function collectTags(entries: CollectionEntry<'research'>[]): TagBucket[] {
  const buckets = new Map<string, TagBucket>();
  for (const entry of entries) {
    for (const tag of entry.data.tags) {
      const slug = tagSlug(tag);
      if (!slug) continue;
      const bucket = buckets.get(slug);
      if (bucket) {
        bucket.count += 1;
        bucket.items.push(entry);
      } else {
        buckets.set(slug, { label: tag.trim(), slug, count: 1, items: [entry] });
      }
    }
  }
  return [...buckets.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label, 'id'),
  );
}
