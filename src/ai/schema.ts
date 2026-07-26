import { z } from 'zod';

/**
 * Zod schemas for the AI brief-to-design pipeline.
 * These schemas enforce the shape of data that flows from
 * natural-language brief → structured design schema → design objects.
 */

export const parsedBriefSchema = z.object({
  buildingType: z.enum(['house', 'apartment', 'townhouse', 'commercial', 'office', 'school', 'clinic', 'other']).default('house'),
  floors: z.number().int().min(1).max(10).default(1),
  bedrooms: z.number().int().min(0).max(20).optional(),
  bathrooms: z.number().int().min(0).max(20).optional(),
  areaM2: z.number().positive().optional(),
  budgetCents: z.number().int().nonnegative().optional(),
  location: z.string().default('zimbabwe'),
  standards: z.array(z.string()).default(['ZBC 1996']),
  features: z.array(z.string()).default([]),
  summary: z.string().optional(),
});

export type ParsedBrief = z.infer<typeof parsedBriefSchema>;

export const roomSchema = z.object({
  name: z.string(),
  widthM: z.number().positive(),
  depthM: z.number().positive(),
  areaM2: z.number().positive(),
});

export type RoomSchema = z.infer<typeof roomSchema>;

export const designSchema = z.object({
  name: z.string(),
  optionIndex: z.number().int().min(0),
  style: z.enum(['compact', 'standard', 'spacious']).default('standard'),
  totalAreaM2: z.number().positive(),
  footprintWidthM: z.number().positive(),
  footprintDepthM: z.number().positive(),
  floors: z.number().int().min(1),
  rooms: z.array(roomSchema),
  features: z.array(z.string()).default([]),
});

export type DesignSchema = z.infer<typeof designSchema>;
