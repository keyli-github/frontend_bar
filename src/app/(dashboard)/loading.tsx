/**
 * Fallback de ruta para navegación dentro del dashboard.
 *
 * Deliberadamente sin animaciones ni esqueletos: un fondo sólido
 * evita el destello "guiño" que produce el animate-pulse cuando el
 * usuario navega entre módulos. Los estados de carga individuales
 * (Bones / skeletons) los maneja cada página por su cuenta.
 */
export default function DashboardLoading() {
  return <div className="min-h-full bg-background" />;
}
