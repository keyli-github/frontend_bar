import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Boton.
 *
 * Las alturas usan los tokens de densidad (`--control-h-*`), no valores
 * fijos: en pantallas tactiles el token crece automaticamente para cumplir
 * el tamano minimo de target de WCAG 2.5.8 sin duplicar clases responsive.
 */
const buttonVariants = cva(
  [
    "group/button inline-flex shrink-0 items-center justify-center gap-1.5",
    "rounded-lg border border-transparent bg-clip-padding",
    "text-sm font-medium whitespace-nowrap select-none",
    "transition-[background-color,border-color,color,box-shadow,transform] duration-150",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
    "active:not-aria-[haspopup]:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-50",
    "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/25",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        /** Accion principal de la vista. Como maximo una por pantalla. */
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        /** Accion secundaria con contorno. */
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        /** Accion terciaria sobre superficie. Sustituye a `bg-muted/60 hover:bg-muted`. */
        soft: "bg-muted/60 text-foreground hover:bg-muted",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]",
        ghost: "hover:bg-muted hover:text-foreground dark:hover:bg-muted/50",
        /** Destructivo suave — para iconos de borrar en listas. */
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:ring-destructive",
        /** Destructivo solido — solo para confirmar en un dialogo. */
        "destructive-solid":
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive",
        link: "text-primary-text underline-offset-4 hover:underline",
      },
      size: {
        xs: "h-control-xs rounded-md px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-control-sm px-2.5 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5",
        default: "h-control px-3",
        lg: "h-control-lg px-4 text-sm font-semibold tracking-wide",
        /** Ocupa todo el ancho — patron habitual en modales y en movil. */
        block: "h-control-lg w-full px-4 text-sm font-semibold tracking-wide",
        icon: "size-control",
        "icon-xs": "size-control-xs rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-control-sm [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-control-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
