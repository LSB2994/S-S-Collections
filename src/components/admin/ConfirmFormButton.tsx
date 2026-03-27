"use client";

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
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={cn(className)}
      {...props}
      onClick={(e) => {
        if (typeof window !== "undefined" && !window.confirm(message)) {
          e.preventDefault();
        }
        props.onClick?.(e);
      }}
    >
      {children}
    </Button>
  );
}
