"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function ActionModal({
  title,
  triggerLabel,
  trigger,
  children,
  triggerVariant = "secondary",
  triggerSize = "sm",
  triggerClassName
}: {
  title: string;
  triggerLabel?: string;
  trigger?: React.ReactNode;
  children: React.ReactNode;
  triggerVariant?: React.ComponentProps<typeof Button>["variant"];
  triggerSize?: React.ComponentProps<typeof Button>["size"];
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        size={triggerSize}
        variant={triggerVariant}
        className={["rounded-xl", triggerClassName].filter(Boolean).join(" ")}
        onClick={() => setOpen(true)}
      >
        {trigger ?? triggerLabel}
      </Button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
            <div className="max-h-[78vh] overflow-auto">{children}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
