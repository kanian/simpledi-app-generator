import { z } from "zod";

export const baseZodSchema = z.object({
  id: z.string().uuid(),
  deleted: z.boolean().default(false),
  deletedAt: z.date().nullable(),
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
  createdBy: z.string().uuid().nullable(),
  updatedBy: z.string().uuid().nullable(),
});