"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

const overlayClass =
  "fixed inset-0 z-50 bg-ink/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 sm:bg-slate-950/50";
// Phones: a bottom sheet with a grabber and thumb-sized footer buttons. sm+: centred modal.
const contentClass =
  "fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[22px] bg-white pb-[env(safe-area-inset-bottom)] text-slate-900 shadow-sheet duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[92dvh] sm:w-[calc(100%-1.5rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border sm:border-slate-200 sm:pb-0 sm:shadow-pop sm:data-[state=closed]:zoom-out-[0.98] sm:data-[state=open]:zoom-in-[0.98]";

const Dialog = DialogPrimitive.Root;

const Grabber = () => <div className="mx-auto mt-2 h-[5px] w-9 shrink-0 rounded-full bg-slate-200 sm:hidden" aria-hidden="true" />;

const DialogContent = React.forwardRef(({ className, children, size = "md", ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className={overlayClass} />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(contentClass, size === "lg" ? "sm:max-w-2xl" : size === "sm" ? "sm:max-w-sm" : "sm:max-w-lg", className)}
      {...props}
    >
      <Grabber />
      {children}
      <DialogPrimitive.Close className="absolute right-3 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 sm:right-3.5 sm:top-3.5 sm:h-auto sm:w-auto sm:rounded-md sm:bg-transparent sm:p-1.5 sm:text-slate-500 sm:hover:bg-slate-100">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = "DialogContent";

const DialogHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col gap-1 px-5 pb-3 pt-3 pr-14 sm:border-b sm:border-slate-200 sm:px-6 sm:pb-4 sm:pt-5 sm:pr-12", className)} {...props} />
);
const DialogBody = ({ className, ...props }) => <div className={cn("flex-1 overflow-y-auto px-5 py-3 text-slate-900 sm:px-6 sm:py-5", className)} {...props} />;
const DialogFooter = ({ className, ...props }) => (
  <div
    className={cn(
      "flex flex-col-reverse gap-2 border-t border-slate-100 bg-white px-5 py-3 max-sm:[&_button]:h-12 max-sm:[&_button]:w-full max-sm:[&_button]:rounded-xl max-sm:[&_button]:text-[15px] max-sm:[&>div]:w-full max-sm:[&>div]:flex-col sm:flex-row sm:justify-end sm:border-slate-200 sm:bg-slate-50 sm:px-6 sm:py-3.5",
      className
    )}
    {...props}
  />
);

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("text-[19px] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-[15px] sm:tracking-[-0.01em] sm:text-slate-900", className)} {...props} />
));
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-[13px] text-slate-500 sm:text-slate-600", className)} {...props} />
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
        <AlertDialogPrimitive.Content className={cn(contentClass, "sm:max-w-md")}>
          <Grabber />
          <div className="space-y-1.5 px-5 pb-4 pt-4 sm:px-6 sm:pb-5 sm:pt-6">
            <AlertDialogPrimitive.Title className="text-[19px] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-[15px] sm:tracking-[-0.01em] sm:text-slate-900">
              {title}
            </AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="text-[14px] leading-relaxed text-slate-600 sm:text-[13px]">{description}</AlertDialogPrimitive.Description>
          </div>
          <div className="flex flex-col-reverse gap-2 px-5 pb-4 pt-1 max-sm:[&_button]:h-12 max-sm:[&_button]:rounded-xl max-sm:[&_button]:text-[15px] sm:flex-row sm:justify-end sm:border-t sm:border-slate-200 sm:bg-slate-50 sm:px-6 sm:py-3.5">
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
