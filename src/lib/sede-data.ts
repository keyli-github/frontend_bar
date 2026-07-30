/**
 * Datos mock diferenciados por sede.
 * Cuando se selecciona una sede específica, los módulos muestran
 * datos representativos de esa sede.
 */

export interface SedeStats {
  ventasHoy: string;
  ventasNum: number;
  tickets: number;
  ticketProm: string;
  articulosCriticos: number;
  empleadosActivos: number;
  empleadosTotal: number;
  ingresos: string;
  ingresosNum: number;
  egresos: string;
  egresosNum: number;
  saldo: string;
  saldoNum: number;
  weeklySales: { day: string; amount: number }[];
}

const w = (base: number) => [
  { day: 'Lun', amount: Math.round(base * 0.46) },
  { day: 'Mar', amount: Math.round(base * 0.55) },
  { day: 'Mié', amount: Math.round(base * 0.68) },
  { day: 'Jue', amount: Math.round(base * 1.17) },
  { day: 'Vie', amount: Math.round(base * 1.39) },
  { day: 'Sáb', amount: Math.round(base * 1.60) },
  { day: 'Hoy', amount: base },
];

const SEDE_DATA: Record<string, SedeStats> = {
  'Zona Rosa': {
    ventasHoy: '$3.24M', ventasNum: 3240000, tickets: 82, ticketProm: '$39.500',
    articulosCriticos: 3, empleadosActivos: 8, empleadosTotal: 12,
    ingresos: '$1.216.000', ingresosNum: 1216000,
    egresos: '$65.500', egresosNum: 65500,
    saldo: '$1.650.500', saldoNum: 1650500,
    weeklySales: w(3240000),
  },
  'Chapinero': {
    ventasHoy: '$2.15M', ventasNum: 2150000, tickets: 58, ticketProm: '$37.000',
    articulosCriticos: 2, empleadosActivos: 6, empleadosTotal: 10,
    ingresos: '$890.000', ingresosNum: 890000,
    egresos: '$42.000', egresosNum: 42000,
    saldo: '$1.148.000', saldoNum: 1148000,
    weeklySales: w(2150000),
  },
  'El Poblado': {
    ventasHoy: '$1.98M', ventasNum: 1980000, tickets: 51, ticketProm: '$38.800',
    articulosCriticos: 1, empleadosActivos: 7, empleadosTotal: 9,
    ingresos: '$754.000', ingresosNum: 754000,
    egresos: '$38.200', egresosNum: 38200,
    saldo: '$1.015.800', saldoNum: 1015800,
    weeklySales: w(1980000),
  },
};

// "Todas" suma todas las sedes
const TODAS: SedeStats = {
  ventasHoy: '$7.37M', ventasNum: 7370000, tickets: 191, ticketProm: '$38.590',
  articulosCriticos: 6, empleadosActivos: 21, empleadosTotal: 31,
  ingresos: '$2.860.000', ingresosNum: 2860000,
  egresos: '$145.700', egresosNum: 145700,
  saldo: '$3.814.300', saldoNum: 3814300,
  weeklySales: w(7370000),
};

export function getSedeStats(sede: string): SedeStats {
  if (sede === 'Todas las sedes' || sede === 'Todas' || !SEDE_DATA[sede]) return TODAS;
  return SEDE_DATA[sede];
}
