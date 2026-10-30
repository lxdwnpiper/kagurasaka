import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { sortByDateDesc } from '../components/list/post-item';
import { withBase } from '../lib/url';

export async function GET(context: APIContext) {
  const origin = context.site ?? new URL('https://lxdwnpiper.github.io');
  // Channel link must point at the project site root, not the domain root.
  const site = new URL(withBase('/'), origin);

  const published = await getCollection('research', ({ data }) => !data.draft);
  const posts = sortByDateDesc(published);

  return rss({
    title: 'kagurasaka — security research',
    description:
      'Riset keamanan aplikasi, cloud, dan red team: analisis kerentanan, catatan eksploitasi, dan bedah CVE yang bisa direproduksi.',
    site,
    trailingSlash: true,
    customData: '<language>id</language>',
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: new URL(withBase(`/research/${post.id}/`), origin).href,
      categories: post.data.tags,
    })),
  });
}
