import { z } from "zod";

export type Data = {
  id: number;
  title: string;
  author: string;
  genre: string;
  publishedYear: number;
  pages: number;
  rating: number;
  price: number;
  stock: number;
  language: string;
  publisher: string;
  createdAt: string;
  old_id?: string;
  generatedId?: string;
};

// ─── Zod Schemas ────────────────────────────────────────────────

export const AddBodySchema = z.object({
  data: z.array(
    z.object({
      title: z.string().min(1),
      author: z.string().min(1),
      genre: z.string().min(1),
      publishedYear: z.coerce.number().int(),
      pages: z.coerce.number().int().positive(),
      rating: z.coerce.number().min(0).max(5).default(0),
      price: z.coerce.number().min(0).default(0),
      stock: z.coerce.number().int().min(0).default(0),
      language: z.string().default("English"),
      publisher: z.string().min(1),
      old_id: z.string().optional(),
    }),
  ),
});

export const EditBodySchema = z.object({
  data: z.array(
    z.object({
      id: z.coerce.number().int(),
      title: z.string().optional(),
      author: z.string().optional(),
      genre: z.string().optional(),
      publishedYear: z.coerce.number().int().optional(),
      pages: z.coerce.number().int().positive().optional(),
      rating: z.coerce.number().min(0).max(5).optional(),
      price: z.coerce.number().min(0).optional(),
      stock: z.coerce.number().int().min(0).optional(),
      language: z.string().optional(),
      publisher: z.string().optional(),
    }),
  ),
});

export type BodyType = z.infer<typeof EditBodySchema>;
