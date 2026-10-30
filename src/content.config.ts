import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const research = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/research' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    abstract: z.string().optional(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    severity: z.enum(['info', 'low', 'medium', 'high', 'critical']).optional(),
    cve: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
    toc: z.boolean().default(true),
  }),
});

export const collections = { research };
