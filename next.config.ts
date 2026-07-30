import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    /**
     * Los assets ya se sirven en WebP (public/assets). Se declaran tambien
     * AVIF para que Next negocie el formato mas pequeno segun el navegador.
     */
    formats: ['image/avif', 'image/webp'],
    /**
     * Next 16 exige declarar las calidades usadas por `<Image quality>`.
     * Solo se usa la de por defecto; dejar la lista corta evita generar
     * variantes innecesarias en el cache de imagenes.
     */
    qualities: [75],
  },

  /** Evita exponer la version de Next en las cabeceras de respuesta. */
  poweredByHeader: false,

  /** Elimina console.* del bundle de produccion, salvo errores y avisos. */
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
};

export default nextConfig;
