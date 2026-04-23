"use server";

import prisma from "@/lib/prisma";
import { AddBodySchema, EditBodySchema } from "./types";
import { z } from "zod";

// ─── Server Actions ─────────────────────────────────────────────

export async function getBooks(userId: string) {
  const books = await prisma.book.findMany({
    where: {
      OR: [{ userId }, { userId: "" }],
    },
    orderBy: { createdAt: "desc" },
  });

  // Serialize dates to ISO strings for client consumption
  return books.map((book) => ({
    ...book,
    createdAt: book.createdAt.toISOString(),
  }));
}

export async function addBooks(
  userId: string,
  input: z.infer<typeof AddBodySchema>,
) {
  const parsed = AddBodySchema.parse(input);

  const results = await prisma.book.createManyAndReturn({
    data: parsed.map((book) => ({
      ...book,
      userId,
    })),
  });

  // Serialize dates for client consumption
  return results.map((book) => ({
    ...book,
    createdAt: book.createdAt.toISOString(),
  }));
}

export async function editBooks(input: z.infer<typeof EditBodySchema>) {
  const parsed = EditBodySchema.parse(input);

  await prisma.$transaction(async (tx) => {
    for (const item of parsed) {
      const { id, ...updateData } = item;

      // Remove undefined values
      const cleanData = Object.fromEntries(
        Object.entries(updateData).filter(([, v]) => v !== undefined),
      );

      await tx.book.update({
        where: { id },
        data: cleanData,
      });
    }
  }, {
    maxWait: 15000, // 15s max waiting time to grab a connection
    timeout: 30000, // 30s max time for transaction to finish
  });
}

export async function deleteBooks(input: { account_ids: string[] }) {
  const ids = input.account_ids.map((id) => Number(id));

  await prisma.book.deleteMany({
    where: { id: { in: ids } },
  });
}
