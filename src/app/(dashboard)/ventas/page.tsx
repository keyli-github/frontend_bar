"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Landmark,
  Package,
  Search,
  ShoppingCart,
  Table2,
} from "lucide-react";

/**
 * El backend actual no expone ventas, mesas, pedidos, pagos ni comprobantes.
 * Esta vista conserva el espacio del POS sin presentar datos u operaciones
 * locales como si fueran transacciones reales.
 */
export default function VentasPage() {
  return (
    <div className="min-h-full bg-background">
      <div className="border-b border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-start gap-3">
          <AlertTriangle
            size={20}
            className="mt-0.5 shrink-0 text-amber-500"
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold text-amber-500">
              Ventas todavía no tiene soporte en el backend
            </p>
            <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
              No existe una API para crear ventas, descontar stock, registrar el
              pago o emitir tickets de forma transaccional. Las acciones del POS
              permanecen deshabilitadas para evitar operaciones simuladas.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-130px)] max-w-6xl flex-col lg:flex-row">
        <main className="flex-1 space-y-5 p-4 lg:p-6">
          <header>
            <h1 className="text-2xl font-bold text-foreground">Punto de venta</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Interfaz preparada para una futura integración de ventas.
            </p>
          </header>

          <div className="flex gap-3">
            <label className="relative flex-1">
              <span className="sr-only">Buscar producto</span>
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50"
                aria-hidden="true"
              />
              <input
                disabled
                placeholder="Búsqueda no disponible"
                className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
            <button
              type="button"
              disabled
              className="flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
              title="El backend no implementa mesas"
            >
              <Table2 size={16} aria-hidden="true" />
              Sin mesa
            </button>
          </div>

          <section className="grid min-h-80 place-items-center rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
            <div className="max-w-md">
              <div className="mx-auto grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
                <Package size={24} aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-foreground">
                Catálogo del POS no disponible
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Aunque el catálogo de productos existe, usarlo aquí sin un
                endpoint de venta no permitiría reservar stock ni registrar una
                operación íntegra en inventario, kardex y caja.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Link
                  href="/productos"
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <Package size={15} aria-hidden="true" /> Ver productos
                </Link>
                <Link
                  href="/caja"
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <Landmark size={15} aria-hidden="true" /> Ir a caja
                </Link>
              </div>
            </div>
          </section>
        </main>

        <aside className="flex min-h-72 w-full flex-col border-t border-border bg-sidebar lg:w-[360px] lg:border-l lg:border-t-0">
          <div className="border-b border-border p-4">
            <h2 className="text-sm font-bold tracking-wide text-foreground">
              ORDEN
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Sin pedido activo
            </p>
          </div>
          <div className="grid flex-1 place-items-center p-6 text-center">
            <div>
              <ShoppingCart
                size={28}
                className="mx-auto text-muted-foreground/50"
                aria-hidden="true"
              />
              <p className="mt-3 text-sm text-muted-foreground">
                No se pueden agregar artículos sin una API de ventas.
              </p>
            </div>
          </div>
          <div className="border-t border-border p-4">
            <button
              type="button"
              disabled
              className="h-12 w-full rounded-xl bg-muted text-sm font-bold tracking-wide text-muted-foreground disabled:cursor-not-allowed"
              title="El backend no implementa cobros de ventas"
            >
              COBRO NO DISPONIBLE
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
