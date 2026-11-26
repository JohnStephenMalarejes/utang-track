"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { receiptUrl } from "./receipt-upload";

export function ReceiptViewerDialog({ open, onOpenChange, path, title = "Receipt photo", description = "" }) {
  const src = receiptUrl(path);
  return (
    <Dialog open={open && Boolean(path)} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogBody>
          {src && (
            <div className="flex justify-center rounded-xl bg-slate-100 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={title} className="max-h-[65vh] w-auto rounded-lg object-contain" />
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          {src && (
            <Button asChild variant="outline">
              <a href={src} target="_blank" rel="noopener noreferrer">
                <ExternalLink /> Open original
              </a>
            </Button>
          )}
          <Button type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
