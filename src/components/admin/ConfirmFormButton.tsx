"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ConfirmFormButton({
  message,
  className,
  variant = "destructive",
  size = "sm",
  children,
  ...props
}: React.ComponentProps<typeof Button> & { message: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn(className)}
        onClick={(e) => {
          e.preventDefault(); // prevent submitting form immediately
          setOpen(true);
        }}
      >
        {children}
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]"
          onClick={(e) => {
            e.preventDefault();
            setOpen(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-[24px] border border-slate-200 bg-white p-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-lg font-semibold text-slate-900">Confirm Action</h3>
            <p className="mb-6 text-sm text-slate-500">{message}</p>
            <div className="flex items-center justify-center gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant={variant}
                {...props}
                onClick={(e) => {
                  setOpen(false);
                  props.onClick?.(e);
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
