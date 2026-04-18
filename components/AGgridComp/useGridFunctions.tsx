import { v4 as uuidv4 } from "uuid";
import React, { useCallback } from "react";
import toast from "react-hot-toast";
import type { UseMutationResult } from "@tanstack/react-query";
import type { AgGridReact } from "ag-grid-react";
import type {
  CellEditingStartedEvent,
  CellEditingStoppedEvent,
  CellValueChangedEvent,
  ColDef,
  FirstDataRenderedEvent,
  GetRowIdParams,
  RowClassParams,
  RowSelectionOptions,
  RowStyle,
  SelectionChangedEvent,
} from "ag-grid-community";

import * as z from "zod";
import { AxiosError } from "axios";

export default function useGridFunctions<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends Record<string, any>,
  A extends z.ZodTypeAny = z.ZodTypeAny,
  E extends z.ZodTypeAny = z.ZodTypeAny,
>({
  data,
  columns,
  uniqueIdentifier,
  editedRows,
  setEditedRows,
  notAddedRows,
  setNotAddedRows,
  rowOldData,
  setRowOldData,
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
}: {
  data: T[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColDef<T, any>[];
  uniqueIdentifier: keyof T;
  editedRows: Map<string, Partial<T>>;
  setEditedRows: React.Dispatch<React.SetStateAction<Map<string, Partial<T>>>>;
  rowOldData: Map<string, T>;
  setRowOldData: React.Dispatch<React.SetStateAction<Map<string, T>>>;
  setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
  notAddedRows: Map<number, string>;
  setNotAddedRows: React.Dispatch<React.SetStateAction<Map<number, string>>>;
  setMarkedToDelete: React.Dispatch<React.SetStateAction<Array<string>>>;
  gridRef: React.RefObject<AgGridReact<T> | null>;
  isEditing: boolean;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  bulkAddMutation?: UseMutationResult<T, Error, z.infer<A>, unknown>;
  addUpdateSchema?: A;
  bulkEditMutation?: UseMutationResult<
    void | undefined,
    Error,
    z.infer<E>,
    unknown
  >;
  editUpdateSchema?: E;
  enableDeleting: boolean;
  setIsFilterActive: React.Dispatch<React.SetStateAction<boolean>>;
  customIdGenerator?: (data: T[], currentRowData: T | undefined) => string;
}) {
  const addNewRow = useCallback(
    (tempData?: T | undefined, rowIndex?: number) => {
      const { api } = gridRef.current || {};
      if (!api) return;

      const newRow: T = tempData ?? ({} as T);
      if (!tempData) {
        Object.keys(data[0]).forEach((field) => {
          if (field === uniqueIdentifier) {
            // @ts-expect-error no error here
            newRow[field] = customIdGenerator
              ? (() => {
                  // Get all current rows from the grid (including newly added ones)
                  const allCurrentRows: T[] = [];
                  api.forEachNode((node) => {
                    if (node.data) allCurrentRows.push(node.data);
                  });
                  return customIdGenerator(
                    allCurrentRows.length > 0 ? allCurrentRows : data,
                    undefined,
                  );
                })()
              : `temp_${uuidv4()}`;
          } else {
            const value = data[0][field];
            // @ts-expect-error no error here
            newRow[field] = typeof value === "boolean" ? false : null;
          }
        });
      }

      // Add to top of grid
      const row = api.applyTransaction({
        add: [newRow as T],
        addIndex: rowIndex ?? 0,
      });
      const rowId = row?.add[0].id || "";

      // Start tracking the new row
      setEditedRows((prev) => {
        const updated = new Map(prev);
        updated.set(rowId, newRow);
        return updated;
      });

      // Start editing the first cell of the new row
      setTimeout(() => {
        api.startEditingCell({
          rowIndex: rowIndex ?? 0,
          // @ts-expect-error column has colId field
          colKey: columns[0].field || columns[0].colId,
        });
      }, 0);

      setHasUnsavedChanges(true);
    },
    [data, customIdGenerator],
  );

  const onCellEditingStarted = useCallback(
    (params: CellEditingStartedEvent<T>) => {
      setIsEditing(true);
      if (!params.data) return;
      const oldData = params.data;
      const id = params.node.id;
      if (!id) return;

      if (
        String(oldData.generatedId).startsWith("temp_") || // Don't store for new rows
        rowOldData.has(id) // Don't change the rows which are already in rowOldData
      )
        return;

      // Store the old value before editing
      setRowOldData((prev) => {
        const newMap = new Map(prev);
        newMap.set(id, { ...oldData });
        return newMap;
      });
    },
    [rowOldData],
  );

  const onCellEditingStopped = useCallback(
    (params: CellEditingStoppedEvent<T>) => {
      // If the column is uniqueIdentifier, check if that uniqueIdentifier already exists or not.
      const rowId = params.node.id;
      const columnId = params.column.getColId();
      if (columnId === uniqueIdentifier) {
        const { api } = gridRef.current || {};
        if (!api) return;
        api.forEachNode((node) => {
          if (rowId !== node.id) {
            if (params.newValue === node.data?.[uniqueIdentifier]) {
              toast.error(
                `Set new value for ${params.column.getColDef().headerName}`,
              );
              api.startEditingCell({
                rowIndex: params.rowIndex ?? 0,
                colKey: columnId,
              });
            } else {
              setIsEditing(false);
            }
          }
        });
      }
      setIsEditing(false);
    },
    [isEditing],
  );

  const onCellValueChanged = useCallback(
    (params: CellValueChangedEvent<T>) => {
      let hasChanges = false;
      const newData = params.data;
      const rowId = params.node.id;
      if (!rowId) return;

      // For checkbox fields, onCellEditingStarted may not fire before onCellValueChanged
      // So we need to capture the old data here if it hasn't been captured yet
      let oldData = rowOldData.get(rowId);
      if (!oldData && !String(rowId).startsWith("temp_")) {
        // Reconstruct the old data by reverting the changed field
        const oldDataReconstructed = { ...newData };
        const changedField = params.column.getColId();
        oldDataReconstructed[changedField as keyof T] = params.oldValue;

        // Store it for future use
        setRowOldData((prev) => {
          const newMap = new Map(prev);
          newMap.set(rowId, oldDataReconstructed as T);
          return newMap;
        });

        // Use the reconstructed data immediately (synchronously)
        oldData = oldDataReconstructed as T;
      }

      // Handle edited rows
      let editedData: Partial<T> = {
        [uniqueIdentifier]: oldData ? oldData[uniqueIdentifier] : "",
      } as T;
      if (oldData && !String(rowId).startsWith("temp_")) {
        // Only take edited fields
        Object.keys(oldData).forEach((field) => {
          if (oldData[field as keyof T] !== newData[field as keyof T]) {
            editedData[field as keyof T] = newData[field as keyof T];
            hasChanges = true;
          }
        });
      } else {
        // Handle newly added rows
        editedData = newData;
        hasChanges = true;

        // *
        // Special case of source1 AGgrid UI
        // *
        console.log(params);
        if (!rowId && oldData?.generatedId) {
          const { api } = gridRef.current || {};
          if (!api) return;
          const tempData = { ...newData } as T;
          tempData[uniqueIdentifier] = rowId as T[keyof T];
          api.applyTransaction({ remove: [tempData] });

          const rowIndex = params.rowIndex;
          addNewRow(tempData, rowIndex ?? 0);
          setNotAddedRows((prev) => new Map(prev).set(rowIndex ?? 0, rowId));
        }
      }

      setEditedRows((prev) => {
        const updated = new Map(prev);

        // If no changes, remove from edited rows
        if (!hasChanges) {
          updated.delete(rowId);
        } else {
          updated.set(rowId, editedData);
        }

        return updated;
      });

      // Update unsaved changes flag
      setHasUnsavedChanges((prev) => {
        const currentSize = editedRows.size;
        if (!hasChanges && editedRows.has(rowId)) {
          return currentSize - 1 > 0;
        } else if (hasChanges) {
          return true;
        }
        return prev;
      });

      // Below code will refresh the dropdown data of all cells of the row if any of the cell is updated.
      // @ts-expect-error column has colId field
      const field = params.column.colId;
      if (
        params.column.getUserProvidedColDef()?.cellEditor ===
        "agSelectCellEditor"
      ) {
        // Find all columns with agSelectCellEditor
        const selectColumns = params.api
          .getColumns()
          ?.filter((col) => {
            const colDef = col.getUserProvidedColDef();
            return (
              colDef?.cellEditor === "agSelectCellEditor" &&
              col.getColId() !== field // Exclude the current field to avoid unnecessary refresh
            );
          })
          .map((col) => col.getColId());

        // Refresh all select cells in the current row
        if (selectColumns && selectColumns.length > 0) {
          params.api.refreshCells({
            rowNodes: [params.node],
            columns: selectColumns,
            force: true,
          });
        }
      }
    },
    [rowOldData, editedRows, uniqueIdentifier],
  );

  const onSaveUpdates = useCallback(async () => {
    if (!bulkAddMutation || !bulkEditMutation) return;

    const { api } = gridRef.current || {};
    if (!api) return;

    api.stopEditing();

    if (editedRows.size === 0) {
      toast.error("No changes to save");
      return;
    }

    // Convert Map to array
    const editUpdates: Partial<T>[] = [];
    const addUpdates: Partial<T>[] = [];

    for (const [rowId, rowData] of editedRows.entries()) {
      // Ensure uniqueIdentifier is present in the data sent to backend
      const dataToSend = {
        ...rowData,
        [uniqueIdentifier]: rowData[uniqueIdentifier] ?? rowId,
      };

      if (String(rowId).startsWith("temp_")) {
        // @ts-expect-error old_id is not in T but we need to send it
        dataToSend.old_id = dataToSend.generatedId;
        delete dataToSend.generatedId;
        addUpdates.push(dataToSend);
      } else {
        delete dataToSend.generatedId;
        editUpdates.push(dataToSend);
      }
    }

    // Zod Validation
    if (addUpdateSchema) {
      const addUpdatesValidationResult = addUpdateSchema?.safeParse(addUpdates);
      if (!addUpdatesValidationResult?.success) {
        const errorMsg = addUpdatesValidationResult?.error.issues[0].message;
        const errorField = addUpdatesValidationResult?.error.issues[0].path[1];
        toast.error(
          `Error in ${String(api.getColumnDef(String(errorField))?.headerName)}: ${errorMsg}`,
        );
        return;
      }
    }
    if (editUpdateSchema) {
      const editUpdatesValidationResult =
        editUpdateSchema?.safeParse(editUpdates);
      if (!editUpdatesValidationResult?.success) {
        const errorMsg = editUpdatesValidationResult?.error.issues[0].message;
        const errorField = editUpdatesValidationResult?.error.issues[0].path[1];
        toast.error(
          `Error in ${String(api.getColumnDef(String(errorField))?.headerName)}: ${errorMsg}`,
        );
        return;
      }
    }

    // Optimistically make the changes
    setHasUnsavedChanges(false);
    setEditedRows(new Map());

    // Helper function to extract error message from AxiosError
    const showErrorMessage = (error: unknown) => {
      const errorData = (error as AxiosError)?.response?.data;
      let errorMsg = "An error occurred";
      let errorField = "";

      if (Array.isArray(errorData) && errorData.length > 0) {
        const errorObject = errorData[0];
        const firstErrorKey = Object.keys(errorObject)[0];

        if (firstErrorKey) {
          errorField = firstErrorKey;
          const fieldErrors = errorObject[firstErrorKey];
          // Extract the first error message from the array
          errorMsg =
            Array.isArray(fieldErrors) && fieldErrors.length > 0
              ? fieldErrors[0]
              : String(fieldErrors);
        }
      }

      let toastMessage = "Failed to add row(s)";
      if (errorField) {
        const columnDef = api.getColumnDef(errorField);
        const fieldName = columnDef?.headerName || errorField;
        toastMessage += ` - ${fieldName}: ${errorMsg}`;
      } else {
        toastMessage += `: ${errorMsg}`;
      }
      toast.error(toastMessage);
    };

    const promises = [];
    if (editUpdates.length > 0) {
      promises.push(
        bulkEditMutation
          .mutateAsync(editUpdates as unknown as z.infer<E>)
          .then(() => ({
            type: "edit",
            success: true,
            error: null,
            skipped: false,
          }))
          .catch((error) => ({
            type: "edit",
            success: false,
            error,
            skipped: false,
          })),
      );
    } else {
      promises.push(
        Promise.resolve({
          type: "edit",
          success: true,
          error: null,
          skipped: true,
        }),
      );
    }
    if (addUpdates.length > 0) {
      promises.push(
        bulkAddMutation
          .mutateAsync(addUpdates as unknown as z.infer<A>)
          .then(() => ({
            type: "add",
            success: true,
            error: null,
            skipped: false,
          }))
          .catch((error) => ({
            type: "add",
            success: false,
            error,
            skipped: false,
          })),
      );
    } else {
      promises.push(
        Promise.resolve({
          type: "add",
          success: true,
          error: null,
          skipped: true,
        }),
      );
    }

    const results = await Promise.all(promises);

    // Handle edit mutation result
    const editResult = results[0];
    if (
      !editResult.success &&
      !editResult.skipped &&
      editResult.error !== null
    ) {
      // Rollback edited rows
      const rowsToRevert: T[] = [];
      editedRows.forEach((_, id) => {
        if (rowOldData.has(id)) {
          rowsToRevert.push(rowOldData.get(id) as T);
        }
      });
      api.applyTransaction({ update: rowsToRevert });

      showErrorMessage(editResult.error);
    }

    // Handle add mutation result
    const addResult = results[1];
    if (!addResult.success && !addResult.skipped && addResult.error !== null) {
      // Rollback added rows
      const rowsToRemove: T[] = [];

      api.forEachNode((node) => {
        if (!node?.data) return;
        if (String(node.data.generatedId).startsWith("temp_")) {
          rowsToRemove.push(node.data);
        }
      });
      api.applyTransaction({ remove: rowsToRemove });

      showErrorMessage(addResult.error);
    }

    // Reset all states
    setRowOldData(new Map());
  }, [editedRows, bulkAddMutation, bulkEditMutation]);

  const onCancelUpdates = useCallback(() => {
    const { api } = gridRef.current || {};
    if (!api) return;

    const rowsToUpdate: T[] = [];
    const rowsToRemove: T[] = [];
    editedRows.forEach((_, rowId) => {
      if (!rowId.startsWith("temp_")) {
        // Revert edited rows to original values ( yellow rows )
        const originalRow = rowOldData.get(rowId);
        if (originalRow) {
          rowsToUpdate.push(originalRow);
        }
      } else {
        // Remove newly added rows ( green rows )
        const data = api.getRowNode(rowId)?.data;
        if (!data) return;
        if (data.generatedId.startsWith("temp_")) {
          rowsToRemove.push(data);
        }
      }
    });
    if (rowsToUpdate.length > 0) {
      api.applyTransaction({ update: rowsToUpdate });
    }
    if (rowsToRemove.length > 0) {
      api.applyTransaction({ remove: rowsToRemove });
    }

    // Add not-added-rows
    notAddedRows.forEach((value: string, key: number) => {
      const oldData = rowOldData.get(value);
      if (!oldData) return;
      api.applyTransaction({ add: [oldData], addIndex: key });
    });

    // Unselect all selected rows
    api.deselectAll();

    // Reset all states
    setEditedRows(new Map());
    setRowOldData(new Map());
    setNotAddedRows(new Map());
    setHasUnsavedChanges(false);
    setIsEditing(false);
    setMarkedToDelete([]);
  }, [editedRows, rowOldData]);

  const getRowStyle = useCallback(
    (params: RowClassParams<T>): RowStyle | undefined => {
      const node = params.node;
      if (!node.data) return;

      // newly added row
      if (
        String(node.data.generatedId).startsWith("temp_") &&
        editedRows.has(node.data.generatedId)
      ) {
        return {
          backgroundColor: "rgb(203 255 218)",
          borderColor: "rgb(95 169 116)",
          borderStyle: "dashed",
          fontWeight: "500",
        };
      }

      // edited row
      if (editedRows.has(String(node.data[uniqueIdentifier]))) {
        return {
          backgroundColor: "#FFF8DC",
          fontWeight: "500",
        };
      }
    },
    [editedRows],
  );

  const onSelectionChanged = useCallback((params: SelectionChangedEvent<T>) => {
    const selectedNodes = params.selectedNodes;
    if (!selectedNodes) return;
    const selectedIds = selectedNodes.map((node) => {
      return node.data?.[uniqueIdentifier];
    });

    setMarkedToDelete(selectedIds as string[]);
  }, []);

  // This will expand columns to fill viewport when content is smaller, while respecting flex ratios
  const onFirstDataRendered = useCallback(
    ({ api }: FirstDataRenderedEvent) => {
      setTimeout(() => {
        // Auto-size columns that should take exactly as much width as their content needs
        const autoSizedColumns = columns
          .filter((col) => col.suppressSizeToFit)
          .map((col) => col.field as string)
          .filter(Boolean);

        if (autoSizedColumns.length > 0) {
          api.autoSizeColumns(autoSizedColumns);
        }

        const gridViewport = document.getElementsByClassName("ag-viewport")[0];
        const gridContainer = document.getElementsByClassName(
          "ag-center-cols-container",
        )[0];

        if (gridViewport.clientWidth > gridContainer.clientWidth) {
          api.sizeColumnsToFit();
        }
      }, 0);
    },
    [columns],
  );

  const onRowSelection: RowSelectionOptions | undefined = enableDeleting
    ? {
        mode: "multiRow" as const,
      }
    : undefined;

  const onFilterChanged = useCallback(() => {
    const api = gridRef.current?.api;
    if (!api) return;

    // Check if any filter is active
    const filterModel = api.getFilterModel();
    const hasActiveFilters = Object.keys(filterModel).length > 0;
    setIsFilterActive(hasActiveFilters);
  }, []);

  const getRowId = useCallback((params: GetRowIdParams) => {
    if (!params.data[uniqueIdentifier]) {
      const generatedId = `temp_${uuidv4()}`;
      params.data.generatedId = generatedId;
      params.data[uniqueIdentifier] = generatedId;

      return generatedId;
    } else {
      params.data.generatedId = null;
      return params.data[uniqueIdentifier];
    }
  }, []);

  return {
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
  };
}
