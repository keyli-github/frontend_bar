import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { inputBase } from "./input"

/**
 * Select nativo estilizado.
 *
 * En movil el `<select>` nativo abre el selector del sistema operativo
 * (rueda en iOS, hoja en Android), que es mas rapido y accesible que un
 * menu en portal. Se reserva el Select de base-ui para casos que necesiten
 * contenido enriquecido (iconos, descripciones, busqueda).
 */
function NativeSelect({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        data-slot="native-select"
        className={cn(
          inputBase,
          "cursor-pointer appearance-none pr-9",
          // Alinea el fondo con el resto de superficies (Safari lo pinta gris)
          "bg-card dark:bg-input/30",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={15}
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  )
}

export { NativeSelect }
