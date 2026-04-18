"use server";

import prisma from "@/lib/prisma";
import { AddBodySchema, EditBodySchema } from "./types";
import { z } from "zod";

// ─── Server Actions ─────────────────────────────────────────────

export async function getBooks() {
  const books = await prisma.book.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Serialize dates to ISO strings for client consumption
  return books.map((book) => ({
    ...book,
    createdAt: book.createdAt.toISOString(),
  }));
}

export async function addBooks(input: z.infer<typeof AddBodySchema>) {
  const parsed = AddBodySchema.parse(input);

  const results = [];

  for (const item of parsed.data) {
    const { old_id, ...bookData } = item;

    const created = await prisma.book.create({
      data: bookData,
    });

    results.push({
      ...created,
      createdAt: created.createdAt.toISOString(),
      old_id: old_id ?? undefined,
    });
  }

  return results;
}

export async function editBooks(input: z.infer<typeof EditBodySchema>) {
  const parsed = EditBodySchema.parse(input);

  for (const item of parsed.data) {
    const { id, ...updateData } = item;

    // Remove undefined values
    const cleanData = Object.fromEntries(
      Object.entries(updateData).filter(([, v]) => v !== undefined),
    );

    await prisma.book.update({
      where: { id },
      data: cleanData,
    });
  }
}

export async function deleteBooks(input: { account_ids: string[] }) {
  const ids = input.account_ids.map((id) => Number(id));

  await prisma.book.deleteMany({
    where: { id: { in: ids } },
  });
}
