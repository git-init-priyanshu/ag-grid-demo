"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AGgridComp from "@/components/AGgridComp";
import { getBooks, addBooks, editBooks, deleteBooks } from "@/api";
import { columns } from "./-gridConfig";
import * as z from "zod";
import { AddBodySchema, EditBodySchema } from "@/api/types";

export default function DisplayTable() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["get-data"],
    queryFn: async () => {
      const response = await getBooks();
      return response;
    },
    refetchOnWindowFocus: false,
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
      const response = await addBooks(updates);
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
      />
    </div>
  );
}
