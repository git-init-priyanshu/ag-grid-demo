import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type DeleteDialogBoxPropTypes = {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onDialogClose: () => void;
  markedToDelete: string[];
  deleteRows: () => void;
};
export default function DeleteDialogBox({
  isOpen,
  setIsOpen,
  onDialogClose,
  markedToDelete,
  deleteRows,
}: DeleteDialogBoxPropTypes) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(e) => {
        if (!e) setIsOpen(false);
      }}
    >
      <DialogContent
        onEscapeKeyDown={onDialogClose}
        onPointerDownOutside={onDialogClose}
      >
        <DialogHeader>
          <DialogTitle>
            Delete Row{markedToDelete.length > 1 && "s"}
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            {markedToDelete.length > 1
              ? `${markedToDelete.length} rows`
              : "this row"}
            ? This action cannot be undone.
          </DialogDescription>
          <Button
            variant="ghost"
            className="absolute top-4 right-4 z-10 size-4 bg-white hover:cursor-pointer"
            onClick={onDialogClose}
          >
            <X />
          </Button>
        </DialogHeader>
        <DialogFooter className="sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            className="cursor-pointer hover:bg-neutral-200"
            onClick={onDialogClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            className="cursor-pointer bg-red-500 hover:bg-red-600"
            onClick={() => {
              deleteRows();
              onDialogClose();
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

