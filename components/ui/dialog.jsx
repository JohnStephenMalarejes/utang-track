"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

const overlayClass =
  "fixed inset-0 z-50 bg-slate-950/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0";
const contentClass =
  "fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[calc(100%-1.5rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-pop duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.98] data-[state=open]:zoom-in-[0.98]";

const Dialog = DialogPrimitive.Root;

const DialogContent = React.forwardRef(({ className, children, size = "md", ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className={overlayClass} />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(contentClass, size === "lg" ? "max-w-2xl" : size === "sm" ? "max-w-sm" : "max-w-lg", className)}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-3.5 top-3.5 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = "DialogContent";

const DialogHeader = ({ className, ...props }) => <div className={cn("flex flex-col gap-1 border-b border-slate-200 px-6 pb-4 pt-5 pr-12", className)} {...props} />;
const DialogBody = ({ className, ...props }) => <div className={cn("flex-1 overflow-y-auto px-6 py-5 text-slate-900", className)} {...props} />;
const DialogFooter = ({ className, ...props }) => (
  <div className={cn("flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3.5 sm:flex-row sm:justify-end", className)} {...props} />
);

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("text-[15px] font-semibold leading-tight tracking-[-0.01em] text-slate-900", className)} {...props} />
));
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-[13px] text-slate-600", className)} {...props} />
));
DialogDescription.displayName = "DialogDescription";

/**
 * Confirmation dialog used before every destructive or irreversible action.
 * onConfirm may be async; the dialog shows a spinner and stays open until it resolves.
 */
function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = "Confirm", destructive = false, loading = false, onConfirm }) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className={overlayClass} />
        <AlertDialogPrimitive.Content className={cn(contentClass, "max-w-md")}>
          <div className="space-y-1.5 px-6 pb-5 pt-6">
            <AlertDialogPrimitive.Title className="text-[15px] font-semibold tracking-[-0.01em] text-slate-900">{title}</AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="text-[13px] leading-relaxed text-slate-600">{description}</AlertDialogPrimitive.Description>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3.5 sm:flex-row sm:justify-end">
            <AlertDialogPrimitive.Cancel asChild>
              <Button variant="outline" disabled={loading}>
                Cancel
              </Button>
            </AlertDialogPrimitive.Cancel>
            <Button variant={destructive ? "destructive" : "default"} disabled={loading} onClick={onConfirm}>
              {loading && <Loader2 className="animate-spin" />}
              {confirmLabel}
            </Button>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}

export { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle, DialogDescription, ConfirmDialog };
