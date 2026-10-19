import * as React from "react"

import { cn } from "@/shared/lib/utils"

/** Native `<select>` styled like `Input` (no extra dependency, fully accessible on mobile). */
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        "border-input dark:bg-input/30 [&>option]:bg-card [&>option]:text-foreground h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { NativeSelect }
