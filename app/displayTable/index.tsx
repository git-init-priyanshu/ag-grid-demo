"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AGgridComp from "@/components/AGgridComp";
import { getBooks, addBooks, editBooks, deleteBooks } from "@/api";
import { columns } from "./-gridConfig";
import * as z from "zod";
import { AddBodySchema, EditBodySchema } from "@/api/types";
import { v4 as uuid } from "uuid";

export default function DisplayTable() {
  const queryClient = useQueryClient();

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUserId = () => {
      const userId = localStorage.getItem("user-id");
      if (!userId?.trim()) {
        const newUserId = uuid();
        localStorage.setItem("user-id", newUserId);
        setUserId(newUserId);
      } else {
        setUserId(userId);
      }
    };
    getUserId();
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["get-data", userId],
    queryFn: async () => {
      if (!userId) return;
      const response = await getBooks(userId);
      return response;
    },
    refetchOnWindowFocus: false,
    enabled: !!userId,
  });

  const deleteAccountsMutation = useMutation({
    mutationFn: async (body: { ids: string[] }) => {
      return await deleteBooks({
        account_ids: body.ids.map((id) => id),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["get-data"] });
    },
  });

  const saveAddAccountsMutation = useMutation({
    mutationFn: async (updates: z.infer<typeof AddBodySchema>) => {
      const response = await addBooks(userId!, updates);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["get-data"] });
    },
  });

  const saveEditAccountsMutation = useMutation({
    mutationFn: async (updates: z.infer<typeof EditBodySchema>) => {
      return await editBooks(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["get-data"] });
    },
  });

  if (error) {
    return <>Error!</>;
  }
  return (
    <div className="flex flex-col w-full h-dvh p-10">
      <AGgridComp
        data={data || []}
        uniqueIdentifier="id"
        isLoading={isLoading}
        columns={columns}
        bulkAddMutation={saveAddAccountsMutation}
        bulkEditMutation={saveEditAccountsMutation}
        bulkDeleteMutation={deleteAccountsMutation}
        addUpdateSchema={AddBodySchema}
        editUpdateSchema={EditBodySchema}
        defaultPaginationPageSize={50}
      />
    </div>
  );
}
