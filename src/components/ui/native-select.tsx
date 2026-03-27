import * as React from "react";

import { cn } from "@/lib/utils";

/** Native &lt;select&gt; styled to match shadcn inputs (for server actions / FormData). */
const NativeSelect = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
NativeSelect.displayName = "NativeSelect";

export { NativeSelect };
