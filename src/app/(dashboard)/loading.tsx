export default function DashboardLoading() {
  return (
    <div
      className="min-h-full space-y-5 p-3 sm:p-4 lg:p-6"
      role="status"
      aria-label="Cargando contenido"
    >
      <div className="space-y-2">
        <div className="h-6 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-3 w-72 max-w-full animate-pulse rounded-md bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="surface space-y-3 px-4 py-3">
            <div className="h-2.5 w-20 animate-pulse rounded-md bg-muted" />
            <div className="h-5 w-12 animate-pulse rounded-md bg-muted" />
          </div>
        ))}
      </div>
      <div className="surface space-y-3 p-4">
        <div className="h-4 w-36 animate-pulse rounded-md bg-muted" />
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-10 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    </div>
  );
}
