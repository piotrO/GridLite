"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DeleteBrandModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    brandName: string;
}

export function DeleteBrandModal({
    isOpen,
    onClose,
    onConfirm,
    brandName,
}: DeleteBrandModalProps) {
    const [confirmText, setConfirmText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    const isConfirmValid = confirmText === brandName;

    const handleConfirm = async () => {
        if (!isConfirmValid) return;

        setIsDeleting(true);
        try {
            await onConfirm();
            onClose();
        } catch (error) {
            console.error("Failed to delete brand:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleClose = () => {
        setConfirmText("");
        onClose();
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-destructive" />
                        </div>
                        <AlertDialogTitle className="text-xl">
                            Delete Brand
                        </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-left space-y-3">
                        <p>
                            This action is <strong className="text-foreground">irreversible</strong>.
                            The brand <strong className="text-foreground">&quot;{brandName}&quot;</strong> will
                            be permanently removed from the database and cannot be recovered.
                        </p>
                        <p>
                            All associated data, including brand assets and configurations, will be deleted.
                        </p>
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="py-4">
                    <Label htmlFor="confirm-name" className="text-sm text-muted-foreground">
                        Type <span className="font-semibold text-foreground">{brandName}</span> to confirm
                    </Label>
                    <Input
                        id="confirm-name"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="Enter brand name"
                        className="mt-2"
                        autoComplete="off"
                    />
                </div>

                <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleClose} disabled={isDeleting}>
                        Cancel
                    </AlertDialogCancel>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={!isConfirmValid || isDeleting}
                    >
                        {isDeleting ? "Deleting..." : "Delete Brand"}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
