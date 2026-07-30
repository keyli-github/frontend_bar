import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

/**
 * Campo de texto.
 *
 * `text-base md:text-sm` no es decorativo: iOS Safari hace zoom automatico
 * al enfocar un input con fuente menor de 16px. En movil se mantiene 16px
 * y solo se compacta a partir de `md`.
 */
export const inputBase = [
  "h-control w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-1",
  "text-base md:text-sm text-foreground placeholder:text-muted-foreground/70",
  "transition-colors outline-none",
  "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
  "disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50",
  "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/25",
  "dark:bg-input/30 dark:disabled:bg-input/80",
].join(" ")

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        inputBase,
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Input }
