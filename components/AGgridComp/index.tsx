import { Button } from "@/components/ui/button";
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { defaultColDef, customTheme } from "./gridConfig";
import { CircleX, FilterX, Plus, Save, Trash2 } from "lucide-react";
import useGridFunctions from "./useGridFunctions";
import type { UseMutationResult } from "@tanstack/react-query";
import toast from "react-hot-toast";
import * as z from "zod";
import DeleteDialogBox from "./deleteDialogBox";

// Register all Community features
ModuleRegistry.registerModules([AllCommunityModule]);

type AGgridCompProps<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends Record<string, any>,
  A extends z.ZodTypeAny = z.ZodTypeAny,
  E extends z.ZodTypeAny = z.ZodTypeAny,
> = {
  data: T[];
  uniqueIdentifier: keyof T;
  isLoading: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColDef<T, any>[];
  bulkAddMutation?: UseMutationResult<T, Error, z.infer<A>, unknown>;
  addUpdateSchema?: A;
  bulkEditMutation?: UseMutationResult<
    void | undefined,
    Error,
    z.infer<E>,
    unknown
  >;
  editUpdateSchema?: E;
  bulkDeleteMutation?: UseMutationResult<
    void | undefined,
    Error,
    { ids: string[] },
    unknown
  >;
  enableAddNewRows?: boolean;
  enableDeleting?: boolean;
  customIdGenerator?: (data: T[], currentRowData: T | undefined) => string;
  defaultPaginationPageSize?: number;
};

function AGgridComp<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends Record<string, any>,
  A extends z.ZodTypeAny = z.ZodTypeAny,
  E extends z.ZodTypeAny = z.ZodTypeAny,
>({
  data,
  uniqueIdentifier,
  isLoading,
  columns,
  bulkAddMutation,
  addUpdateSchema,
  bulkEditMutation,
  editUpdateSchema,
  bulkDeleteMutation,
  enableAddNewRows = true,
  enableDeleting = true,
  customIdGenerator,
  defaultPaginationPageSize = 20,
}: AGgridCompProps<T, A, E>) {
  const gridRef = useRef<AgGridReact>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [colDefs, setColDefs] = useState<ColDef<T, any>[]>(columns);
  const [markedToDelete, setMarkedToDelete] = useState<Array<string>>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isFilterActive, setIsFilterActive] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // console.log("-------------------");
  /**
   * editedRows - Tracks all modified and newly added rows for saving
   *
   * Structure: Map<rowId, changedFields>
   * - For existing rows: key = actual uniqueIdentifier value (e.g., "123")
   * - For new rows: key = temporary ID (e.g., "temp_abc123")
   * - Value contains only the fields that were changed/added, not the entire row
   */
  const [editedRows, setEditedRows] = useState<Map<string, Partial<T>>>(
    new Map(),
  );
  // console.log("editedRows: ", editedRows);

  /**
   * rowOldData - Preserves original state of edited rows for rollback/cancel operations
   *
   * Structure: Map<rowId, originalRowData>
   * - Only stores data for existing rows (not newly added rows)
   * - Contains the complete original row data before any edits
   * - Used to revert changes when user cancels or when mutations fail
   */
  const [rowOldData, setRowOldData] = useState<Map<string, T>>(new Map());
  // console.log("rowOldData: ", rowOldData);

  /**
   * notAddedRows - Preserves row positions for new rows inserted at specific indices
   *
   * Structure: Map<rowIndex, tempId>
   * - Special case of /source1 path: handles scenarios where new rows can be inserted at any position (not just top)
   * - Maps the grid row index to the temporary uniqueIdentifier
   * - Used to restore rows to their correct position after operations
   */
  const [notAddedRows, setNotAddedRows] = useState<Map<number, string>>(
    new Map(),
  );
  // console.log("notAddedRows: ", notAddedRows);

  const {
    addNewRow,
    onCellEditingStarted,
    onCellEditingStopped,
    onCellValueChanged,
    onSaveUpdates,
    onCancelUpdates,
    getRowStyle,
    onSelectionChanged,
    onFirstDataRendered,
    onRowSelection,
    onFilterChanged,
    getRowId,
  } = useGridFunctions<T, A, E>({
    data,
    columns,
    uniqueIdentifier,
    editedRows,
    setEditedRows,
    rowOldData,
    setRowOldData,
    notAddedRows,
    setNotAddedRows,
    setHasUnsavedChanges,
    setMarkedToDelete,
    gridRef,
    isEditing,
    setIsEditing,
    bulkAddMutation,
    addUpdateSchema,
    bulkEditMutation,
    editUpdateSchema,
    enableDeleting,
    setIsFilterActive,
    customIdGenerator,
  });

  const deleteRows = async () => {
    if (!bulkDeleteMutation) return;

    const ids = [...markedToDelete];
    const { api } = gridRef.current || {};
    if (!api) return;

    const rowsWithIndices = ids
      .map((id) => {
        const node = api.getRowNode(String(id));
        if (!node) return null;
        return {
          data: node.data,
          index: node.rowIndex || -1,
        };
      })
      .filter((item) => item !== null)
      .sort((a, b) => a.index - b.index); // Sort by index for correct restoration

    const rowsToDelete = rowsWithIndices.map((item) => item.data);

    // Optimistically remove rows immediately
    api.applyTransaction({
      remove: rowsToDelete,
    });
    setMarkedToDelete([]);
    setIsDeleteDialogOpen(false);

    try {
      await bulkDeleteMutation.mutateAsync({ ids });

      ids.forEach((id) => {
        if (editedRows.has(id)) {
          editedRows.delete(id);
        }
      });
    } catch {
      // Rollback in case of an error.
      for (let i = rowsWithIndices.length - 1; i >= 0; i--) {
        const { data, index } = rowsWithIndices[i];
        api.applyTransaction({
          add: [data],
          addIndex: index,
        });
      }
      toast.error("Failed to delete row(s)");
    }
  };

  const onDialogClose = useCallback(() => {
    const { api } = gridRef.current || {};
    if (!api) return;

    api.deselectAll();
    setIsDeleteDialogOpen(false);
    setMarkedToDelete([]);
  }, []);

  const clearAllFilters = useCallback(() => {
    const api = gridRef.current?.api;
    if (!api) return;

    api.setFilterModel(null);
    setIsFilterActive(false);
  }, []);

  const onDelete = () => {
    const temp_ids: string[] = [];
    const remaining_ids: number[] = [];

    const { api } = gridRef.current || {};
    if (!api) return;

    markedToDelete.forEach((id) => {
      const node = api.getRowNode(id);
      if (String(node?.data.generatedId).startsWith("temp_")) {
        temp_ids.push(String(id));
      } else {
        remaining_ids.push(Number(id));
      }
    });

    // Remove newly added rows ( green rows )
    const rowsToRemove: T[] = [];
    temp_ids.forEach((id) => {
      const node = api.getRowNode(String(id));
      if (!node) return;
      const data = node.data;
      rowsToRemove.push({ ...data, [uniqueIdentifier]: data.generatedId });
      editedRows.delete(id);
    });
    if (rowsToRemove.length > 0) {
      api.applyTransaction({ remove: rowsToRemove });
    }

    if (remaining_ids.length > 0) {
      setIsDeleteDialogOpen(true);
    }
  };

  useEffect(() => {
    setColDefs([...columns]);
  }, [columns]);

  /**
   * Sync newly added rows with backend-generated data
   *
   * After successful bulk add operation:
   * - Replaces temporary rows (with temp_ IDs) with actual backend data
   * - Updates auto-incremented IDs from database to match local grid state
   * - Prevents stale data by syncing without invalidating the entire query
   * - Uses old_id from response to identify which temp row to replace
   */
  useEffect(() => {
    if (!bulkAddMutation) return;
    if (bulkAddMutation.data) {
      const { api } = gridRef.current || {};
      if (!api) return;

      const tempRowsToRemove: T[] = [] as T[];
      const rowsToAdd: T[] = [] as T[];
      bulkAddMutation.data.forEach((row: T) => {
        const data = row;
        const oldId = String(row.old_id);
        delete data.old_id;

        rowsToAdd.push(data);
        tempRowsToRemove.push({
          ...data,
          [uniqueIdentifier]: oldId,
        });
      });

      api.applyTransaction({
        remove: tempRowsToRemove,
        add: rowsToAdd.reverse(),
        addIndex: 0,
      });
    }
  }, [bulkAddMutation?.data]);

  return (
    <>
      <div className="mb-4 flex justify-between">
        <div className="flex gap-2">
          {enableAddNewRows && (
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => addNewRow()}
              disabled={isLoading || isEditing}
            >
              <Plus />
              Add
            </Button>
          )}
          {enableDeleting && markedToDelete.length > 0 && (
            <Button
              variant="outline"
              className="cursor-pointer border-red-300 text-red-500 hover:bg-red-100 hover:text-red-500"
              onClick={onDelete}
            >
              <Trash2 />
              {markedToDelete.length > 0 && `(${markedToDelete.length})`}
            </Button>
          )}
          {isFilterActive && (
            <Button
              variant="outline"
              className="cursor-pointer border-blue-300 text-blue-500 hover:bg-blue-100 hover:text-blue-500"
              onClick={clearAllFilters}
            >
              <FilterX />
            </Button>
          )}
        </div>
        {(enableAddNewRows || enableDeleting) && (
          <div className="flex gap-4">
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={onSaveUpdates}
              disabled={!hasUnsavedChanges || isEditing}
            >
              <Save />
              Save {editedRows.size > 0 && `(${editedRows.size})`}
            </Button>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={onCancelUpdates}
              disabled={
                (!hasUnsavedChanges && markedToDelete.length == 0) || isEditing
              }
            >
              <CircleX />
              Cancel
            </Button>
          </div>
        )}
      </div>

      <div style={{ width: "100%", height: "100%" }}>
        <AgGridReact<T>
          ref={gridRef}
          theme={customTheme}
          rowData={data}
          loading={isLoading}
          columnDefs={colDefs}
          defaultColDef={defaultColDef}
          getRowId={getRowId}
          getRowStyle={getRowStyle}
          rowSelection={onRowSelection}
          onFirstDataRendered={onFirstDataRendered}
          onFilterChanged={onFilterChanged}
          onSelectionChanged={onSelectionChanged}
          onCellEditingStarted={onCellEditingStarted}
          onCellEditingStopped={onCellEditingStopped}
          onCellValueChanged={onCellValueChanged}
          suppressMovableColumns={true}
          pagination={true}
          paginationPageSize={defaultPaginationPageSize}
          singleClickEdit={true}
          undoRedoCellEditing={true}
          undoRedoCellEditingLimit={20}
          stopEditingWhenCellsLoseFocus={true}
          enableFilterHandlers={true}
          enableCellTextSelection={true}
          ensureDomOrder={true}
          animateRows={true}
        />
      </div>

      <DeleteDialogBox
        isOpen={isDeleteDialogOpen}
        setIsOpen={setIsDeleteDialogOpen}
        onDialogClose={onDialogClose}
        markedToDelete={markedToDelete}
        deleteRows={deleteRows}
      />
    </>
  );
}

export default AGgridComp;
