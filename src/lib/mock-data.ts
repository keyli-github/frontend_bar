import type {
  SaleRecord,
  TopProduct,
  InventoryAlert,
  Product,
  CashMovement,
  InventoryItem,
  KardexEntry,
  PurchaseOrder,
  Proveedor,
  Employee,
  AttendanceRecord,
  Sucursal,
  User,
} from '@/types';

// ============ Dashboard Data ============
export const mockSales: SaleRecord[] = [
  { ticket: 'T-0892', hora: '23:41', articulos: 4, total: 187000, metodo: 'Tarjeta', cajero: 'M. Rios' },
  { ticket: 'T-0891', hora: '23:28', articulos: 2, total: 94000, metodo: 'Efectivo', cajero: 'D. Vargas' },
  { ticket: 'T-0890', hora: '23:15', articulos: 7, total: 312000, metodo: 'Transferencia', cajero: 'M. Rios' },
  { ticket: 'T-0889', hora: '22:58', articulos: 3, total: 156000, metodo: 'Tarjeta', cajero: 'L. Castro' },
  { ticket: 'T-0888', hora: '22:44', articulos: 5, total: 245000, metodo: 'Efectivo', cajero: 'D. Vargas' },
  { ticket: 'T-0887', hora: '22:30', articulos: 1, total: 48000, metodo: 'Tarjeta', cajero: 'M. Rios' },
];

export const mockTopProducts: TopProduct[] = [
  { rank: 1, name: 'Old Parr 750ml', units: 142, percentage: 95 },
  { rank: 2, name: 'Corona 330ml', units: 218, percentage: 85 },
  { rank: 3, name: 'Mojito Clasico', units: 189, percentage: 75 },
  { rank: 4, name: 'Vodka Absolut', units: 97, percentage: 50 },
  { rank: 5, name: 'Negroni', units: 84, percentage: 40 },
  { rank: 6, name: 'Club Colombia', units: 156, percentage: 65 },
];

export const mockAlerts: InventoryAlert[] = [
  { name: 'Whiskey JW Black 750ml', stock: 2, min: 6, critical: true },
  { name: 'Tequila Herradura Plata', stock: 3, min: 6, critical: true },
  { name: 'Coca-Cola 250ml (caja)', stock: 1, min: 4, critical: true },
  { name: 'Agua Tonica Schweppes', stock: 4, min: 6, critical: false },
  { name: 'Ron Medellin 8 Anos', stock: 5, min: 6, critical: false },
];

export const mockWeeklySales = [
  { day: 'Lun', amount: 1500000 },
  { day: 'Mar', amount: 1800000 },
  { day: 'Mie', amount: 2200000 },
  { day: 'Jue', amount: 3800000 },
  { day: 'Vie', amount: 4500000 },
  { day: 'Sab', amount: 5200000 },
  { day: 'Hoy', amount: 3240000 },
];

export const mockSalesBySede = [
  { name: 'Zona Rosa', value: 42, color: '#f59e0b' },
  { name: 'Chapinero', value: 31, color: '#3b82f6' },
  { name: 'El Poblado', value: 27, color: '#22c55e' },
];

// ============ POS & Catálogo Products ============
const img = '/assets/trago.webp';
const mkP = (
  id: string, name: string, category: string, emoji: string,
  salePrice: number, costPrice: number, description = ''
): Product => ({
  id, name, description, category, image: img, emoji,
  salePrice, costPrice,
  price: salePrice,
  margin: Math.round(((salePrice - costPrice) / salePrice) * 100),
  availableInPOS: true,
  status: 'active',
  createdAt: '2026-07-01T00:00:00.000Z',
});

export const mockProducts: Product[] = [
  mkP('1',  'Mojito Clásico',       'Cocteles',   '🍸', 32000,  12000, 'Cóctel clásico con menta, limón y ron blanco'),
  mkP('2',  'Negroni',              'Cocteles',   '🍊', 38000,  14000, 'Gin, vermut rosso y Campari'),
  mkP('3',  'Gin Tonic Premium',    'Cocteles',   '🫧', 35000,  13000, 'Gin premium con tónica artesanal'),
  mkP('4',  'Margarita Clásica',    'Cocteles',   '🍋', 34000,  12000, 'Tequila, triple sec y limón'),
  mkP('5',  'Cosmopolitan',         'Cocteles',   '🍸', 36000,  13000, 'Vodka, Cointreau, jugo de arándano y limón'),
  mkP('6',  'Pisco Sour',           'Cocteles',   '🥃', 33000,  11000, 'Pisco, limón, azúcar y clara de huevo'),
  mkP('7',  'Corona 330ml',         'Cervezas',   '🍺', 14000,   5500, 'Cerveza rubia importada de México'),
  mkP('8',  'Club Colombia 330ml',  'Cervezas',   '🍺', 12000,   4200, 'Cerveza nacional premium'),
  mkP('9',  'Heineken 330ml',       'Cervezas',   '🍺', 15000,   6000, 'Cerveza holandesa tipo lager'),
  mkP('10', 'Poker 330ml',          'Cervezas',   '🍺', 10000,   3800, 'Cerveza nacional económica'),
  mkP('11', 'Old Parr 750ml',       'Destilados', '🥃', 185000, 95000, 'Scotch whisky blended 12 años'),
  mkP('12', 'Whiskey JW Red',       'Destilados', '🥃', 95000,  52000, 'Johnnie Walker Red Label 750ml'),
  mkP('13', 'Ron Medellín 8 Años',  'Destilados', '🥃', 98000,  58000, 'Ron colombiano añejado 8 años'),
  mkP('14', 'Vodka Absolut 750ml',  'Destilados', '🍸', 68000,  42000, 'Vodka sueco original'),
  mkP('15', 'Vino Carmenere',       'Vinos',      '🍷', 92000,  45000, 'Vino tinto chileno varietal'),
  mkP('16', 'Vino Malbec',          'Vinos',      '🍷', 85000,  40000, 'Vino tinto argentino de alta gama'),
  mkP('17', 'Papas fritas',         'Snacks',     '🍟', 18000,   6000, 'Porción grande con salsas'),
  mkP('18', 'Nachos',               'Snacks',     '🌮', 22000,   7500, 'Con queso cheddar y guacamole'),
];

// ============ Caja Data ============
export const mockCashMovements: CashMovement[] = [
  { id: 'TX-4521', hora: '23:41', tipo: 'INGRESO', concepto: 'Venta Ticket T-0892', metodo: 'Tarjeta', monto: 187000 },
  { id: 'TX-4520', hora: '23:28', tipo: 'INGRESO', concepto: 'Venta Ticket T-0891', metodo: 'Efectivo', monto: 94000 },
  { id: 'TX-4519', hora: '23:15', tipo: 'INGRESO', concepto: 'Venta Ticket T-0890', metodo: 'Transferencia', monto: 312000 },
  { id: 'TX-4518', hora: '22:58', tipo: 'INGRESO', concepto: 'Venta Ticket T-0889', metodo: 'Tarjeta', monto: 156000 },
  { id: 'TX-4517', hora: '22:44', tipo: 'INGRESO', concepto: 'Venta Ticket T-0888', metodo: 'Efectivo', monto: 245000 },
  { id: 'TX-4516', hora: '22:30', tipo: 'INGRESO', concepto: 'Venta Ticket T-0887', metodo: 'Tarjeta', monto: 48000 },
  { id: 'TX-4515', hora: '21:15', tipo: 'EGRESO', concepto: 'Compra hielo', metodo: 'Efectivo', monto: -35000 },
  { id: 'TX-4514', hora: '20:00', tipo: 'EGRESO', concepto: 'Pago domicilio', metodo: 'Efectivo', monto: -30500 },
  { id: 'TX-4513', hora: '19:30', tipo: 'INGRESO', concepto: 'Venta Ticket T-0886', metodo: 'Tarjeta', monto: 125000 },
  { id: 'TX-4512', hora: '19:00', tipo: 'INGRESO', concepto: 'Venta Ticket T-0885', metodo: 'Efectivo', monto: 114500 },
];

// ============ Inventario Data ============
export const mockInventory: InventoryItem[] = [
  { codigo: 'DES-001', producto: 'Whiskey Old Parr 750ml', categoria: 'Destilados', stock: 8, min: 6, max: 24, estado: 'OK', costo: 95000, ubicacion: 'Bodega A-1' },
  { codigo: 'DES-002', producto: 'Whiskey JW Red 750ml', categoria: 'Destilados', stock: 6, min: 6, max: 24, estado: 'ALERTA', costo: 52000, ubicacion: 'Bodega A-1' },
  { codigo: 'DES-003', producto: 'Whiskey JW Black 750ml', categoria: 'Destilados', stock: 2, min: 6, max: 18, estado: 'CRITICO', costo: 98000, ubicacion: 'Bodega A-1' },
  { codigo: 'DES-004', producto: 'Vodka Absolut 750ml', categoria: 'Destilados', stock: 9, min: 6, max: 24, estado: 'OK', costo: 68000, ubicacion: 'Bodega A-2' },
  { codigo: 'DES-005', producto: 'Tequila Herradura Plata', categoria: 'Destilados', stock: 3, min: 6, max: 18, estado: 'CRITICO', costo: 82000, ubicacion: 'Bodega A-2' },
  { codigo: 'DES-006', producto: 'Ron Medellin 8 Anos', categoria: 'Destilados', stock: 5, min: 6, max: 18, estado: 'ALERTA', costo: 58000, ubicacion: 'Bodega A-2' },
  { codigo: 'CER-001', producto: 'Corona Extra 330ml', categoria: 'Cervezas', stock: 48, min: 24, max: 96, estado: 'OK', costo: 4500, ubicacion: 'Nevera 1' },
  { codigo: 'CER-002', producto: 'Club Colombia 330ml', categoria: 'Cervezas', stock: 72, min: 24, max: 96, estado: 'OK', costo: 3800, ubicacion: 'Nevera 1' },
  { codigo: 'CER-003', producto: 'Heineken 330ml', categoria: 'Cervezas', stock: 36, min: 24, max: 72, estado: 'OK', costo: 5200, ubicacion: 'Nevera 2' },
  { codigo: 'VIN-001', producto: 'Vino Carmenere', categoria: 'Vinos', stock: 12, min: 6, max: 24, estado: 'OK', costo: 45000, ubicacion: 'Cava' },
  { codigo: 'MIX-001', producto: 'Coca-Cola 250ml caja x24', categoria: 'Mixers', stock: 1, min: 4, max: 12, estado: 'CRITICO', costo: 62000, ubicacion: 'Bodega B' },
  { codigo: 'SNK-001', producto: 'Papas japonesas 80g', categoria: 'Snacks', stock: 45, min: 20, max: 80, estado: 'OK', costo: 3200, ubicacion: 'Estante 1' },
];

// ============ Kardex Data ============
export const mockKardex: KardexEntry[] = [
  { id: 'K-0892', fecha: '27/07/2026', hora: '23:41', producto: 'Corona Extra 330ml', codigo: 'CER-001', tipo: 'SALIDA', cantidad: 3, unidad: 'Unidad', stockAnterior: 51, stockNuevo: 48, valor: 15600, referencia: 'Ticket T-0892', usuario: 'M. Rios' },
  { id: 'K-0891', fecha: '27/07/2026', hora: '22:30', producto: 'Old Parr 750ml', codigo: 'DES-001', tipo: 'SALIDA', cantidad: 1, unidad: 'Botella', stockAnterior: 9, stockNuevo: 8, valor: 95000, referencia: 'Ticket T-0885', usuario: 'M. Rios' },
  { id: 'K-0890', fecha: '27/07/2026', hora: '18:00', producto: 'Whiskey JW Black 750ml', codigo: 'DES-003', tipo: 'ENTRADA', cantidad: 6, unidad: 'Botella', stockAnterior: 0, stockNuevo: 6, valor: 588000, referencia: 'OC-2024-089', usuario: 'A. Torres' },
  { id: 'K-0889', fecha: '27/07/2026', hora: '17:45', producto: 'Vodka Absolut 750ml', codigo: 'DES-004', tipo: 'ENTRADA', cantidad: 12, unidad: 'Botella', stockAnterior: 3, stockNuevo: 15, valor: 816000, referencia: 'OC-2024-089', usuario: 'A. Torres' },
  { id: 'K-0888', fecha: '26/07/2026', hora: '22:15', producto: 'Tequila Herradura Plata', codigo: 'DES-005', tipo: 'SALIDA', cantidad: 2, unidad: 'Botella', stockAnterior: 7, stockNuevo: 5, valor: 164000, referencia: 'Ticket T-0871', usuario: 'L. Castro' },
  { id: 'K-0887', fecha: '26/07/2026', hora: '19:30', producto: 'Club Colombia 330ml', codigo: 'CER-002', tipo: 'ENTRADA', cantidad: 48, unidad: 'Unidad', stockAnterior: 24, stockNuevo: 72, valor: 192000, referencia: 'OC-2024-087', usuario: 'A. Torres' },
  { id: 'K-0886', fecha: '25/07/2026', hora: '20:00', producto: 'Coca-Cola 250ml caja x24', codigo: 'MIX-001', tipo: 'AJUSTE', cantidad: -2, unidad: 'Caja', stockAnterior: 3, stockNuevo: 1, valor: 124000, referencia: 'Ajuste inventario — caja...', usuario: 'A. Torres' },
  { id: 'K-0885', fecha: '25/07/2026', hora: '18:00', producto: 'Papas japonesas 80g', codigo: 'SNK-001', tipo: 'SALIDA', cantidad: 8, unidad: 'Unidad', stockAnterior: 53, stockNuevo: 45, valor: 30400, referencia: 'Ventas 25-Jul', usuario: 'M. Rios' },
  { id: 'K-0884', fecha: '24/07/2026', hora: '15:00', producto: 'Ron Medellin 8 Anos', codigo: 'DES-006', tipo: 'TRASLADO', cantidad: 3, unidad: 'Botella', stockAnterior: 8, stockNuevo: 5, valor: 174000, referencia: 'Traslado Chapinero→Z...', usuario: 'C. Mendoza' },
  { id: 'K-0883', fecha: '24/07/2026', hora: '12:00', producto: 'Vino Carmenere', codigo: 'VIN-001', tipo: 'ENTRADA', cantidad: 6, unidad: 'Botella', stockAnterior: 6, stockNuevo: 12, valor: 192000, referencia: 'OC-2024-083', usuario: 'A. Torres' },
];

// ============ Compras Data ============
export const mockPurchaseOrders: PurchaseOrder[] = [
  { orden: 'OC-2024-090', fecha: '27/07/2026', proveedor: 'Diageo Colombia S.A.', articulos: 5, total: 1840000, estado: 'PENDIENTE', eta: '30/07/2026', solicitadoPor: 'A. Torres' },
  { orden: 'OC-2024-089', fecha: '26/07/2026', proveedor: 'Bacardi Colombia Ltda.', articulos: 3, total: 980000, estado: 'RECIBIDA', solicitadoPor: 'A. Torres' },
  { orden: 'OC-2024-088', fecha: '25/07/2026', proveedor: 'Bavaria S.A.', articulos: 8, total: 1240000, estado: 'RECIBIDA', solicitadoPor: 'A. Torres' },
  { orden: 'OC-2024-087', fecha: '24/07/2026', proveedor: 'Bavaria S.A.', articulos: 4, total: 560000, estado: 'RECIBIDA', solicitadoPor: 'A. Torres' },
  { orden: 'OC-2024-086', fecha: '23/07/2026', proveedor: 'Pernod Ricard Colombia', articulos: 6, total: 2150000, estado: 'ENVIADA', eta: '28/07/2026', solicitadoPor: 'A. Torres' },
  { orden: 'OC-2024-085', fecha: '22/07/2026', proveedor: 'Coca-Cola FEMSA', articulos: 10, total: 780000, estado: 'ENVIADA', eta: '29/07/2026', solicitadoPor: 'A. Torres' },
  { orden: 'OC-2024-084', fecha: '21/07/2026', proveedor: 'Diageo Colombia S.A.', articulos: 7, total: 3200000, estado: 'RECIBIDA', solicitadoPor: 'C. Mendoza' },
  { orden: 'OC-2024-083', fecha: '20/07/2026', proveedor: 'Vinas de la Patagonia', articulos: 3, total: 480000, estado: 'RECIBIDA', solicitadoPor: 'A. Torres' },
  { orden: 'OC-2024-082', fecha: '19/07/2026', proveedor: 'Schweppes Andina', articulos: 5, total: 325000, estado: 'CANCELADA', solicitadoPor: 'A. Torres' },
];

export const mockProveedores: Proveedor[] = [
  { id: '1', nombre: 'Diageo Colombia S.A.', categoria: 'Destilados premium', contacto: 'Ana Villegas', telefono: '+571 234 5678', ordenes: 2, total: '$5.0M' },
  { id: '2', nombre: 'Bacardi Colombia Ltda.', categoria: 'Ron y destilados', contacto: 'Marco Delgado', telefono: '+571 345 6789', ordenes: 1, total: '$1.0M' },
  { id: '3', nombre: 'Bavaria S.A.', categoria: 'Cervezas nacionales', contacto: 'Luis Herrera', telefono: '+571 456 7890', ordenes: 2, total: '$1.8M' },
  { id: '4', nombre: 'Pernod Ricard Colombia', categoria: 'Licores importados', contacto: 'Sara Munoz', telefono: '+571 567 8901', ordenes: 1, total: '$2.1M' },
  { id: '5', nombre: 'Coca-Cola FEMSA', categoria: 'Bebidas no alcoholicas', contacto: 'Julian Castro', telefono: '+571 678 9012', ordenes: 1, total: '$780K' },
];

// ============ Asistencia Data ============
export const mockEmployees: Employee[] = [
  { id: '1', name: 'Miguel Rios', initials: 'MR', role: 'Cajero', status: 'PRESENTE', turno: '18:00 - 02:00', entrada: '17:58', horas: '5.7h', color: 'bg-blue-600' },
  { id: '2', name: 'Diana Vargas', initials: 'DV', role: 'Mesera', status: 'TARDANZA', turno: '18:00 - 02:00', entrada: '18:05', horas: '5.6h', color: 'bg-purple-600' },
  { id: '3', name: 'Luis Castro', initials: 'LC', role: 'Bartender', status: 'PRESENTE', turno: '18:00 - 02:00', entrada: '18:01', horas: '5.65h', color: 'bg-emerald-600' },
  { id: '4', name: 'Sofia Gomez', initials: 'SG', role: 'Hostess', status: 'PRESENTE', turno: '18:00 - 23:00', entrada: '17:55', horas: '5.1h', color: 'bg-pink-600' },
  { id: '5', name: 'Andres Perez', initials: 'AP', role: 'Coctelero', status: 'PRESENTE', turno: '20:00 - 03:00', entrada: '20:00', horas: '3.65h', color: 'bg-amber-600' },
  { id: '6', name: 'Karen Lopez', initials: 'KL', role: 'Mesera', status: 'AUSENTE', turno: '18:00 - 02:00', horas: '0h', color: 'bg-yellow-600' },
  { id: '7', name: 'Diego Ramirez', initials: 'DR', role: 'Bartender', status: 'TARDANZA', turno: '18:00 - 02:00', entrada: '18:12', horas: '5.4h', color: 'bg-red-600' },
  { id: '8', name: 'Valentina Cruz', initials: 'VC', role: 'Supervisora', status: 'PRESENTE', turno: '18:00 - 02:00', entrada: '17:50', horas: '5.8h', color: 'bg-teal-600' },
  { id: '9', name: 'Camilo Vargas', initials: 'CV', role: 'Mesero', status: 'DIA LIBRE', turno: '18:00 - 02:00', horas: '0h', color: 'bg-gray-600' },
  { id: '10', name: 'Pilar Mendez', initials: 'PM', role: 'Cajera', status: 'PRESENTE', turno: '18:00 - 02:00', entrada: '17:52', horas: '5.75h', color: 'bg-indigo-600' },
];

export const mockAttendanceRecords: AttendanceRecord[] = [
  { hora: '17:58', empleado: 'Miguel Rios', accion: 'Registro entrada', tipo: 'ENTRADA' },
  { hora: '18:05', empleado: 'Diana Vargas', accion: 'Registro entrada (tardanza)', tipo: 'TARDANZA' },
  { hora: '18:01', empleado: 'Luis Castro', accion: 'Registro entrada', tipo: 'ENTRADA' },
  { hora: '23:02', empleado: 'Sofia Gomez', accion: 'Registro salida', tipo: 'SALIDA' },
  { hora: '20:00', empleado: 'Andres Perez', accion: 'Registro entrada', tipo: 'ENTRADA' },
  { hora: '19:55', empleado: 'Pilar Mendez', accion: 'Registro entrada', tipo: 'ENTRADA' },
];

// ============ Sucursales Data ============
export const mockSucursales: Sucursal[] = [
  { id: '1', nombre: 'Zona Rosa', ciudad: 'Bogota', direccion: 'Cra 14 #83-28, Zona Rosa', estado: 'ACTIVA', ventasHoy: '$3.24M', empleados: 12, ticketProm: '$40k', participacion: 43, administrador: 'Andrea Torres', desde: 'Desde Mar 2020', color: 'bg-orange-500', telefono: '+57 601 745 2100', ruc: '90148273015', updatedAt: 'Hoy, 09:18' },
  { id: '2', nombre: 'Chapinero', ciudad: 'Bogota', direccion: 'Cl 63 #11-52, Chapinero', estado: 'ACTIVA', ventasHoy: '$2.15M', empleados: 10, ticketProm: '$34k', participacion: 31, administrador: 'Roberto Salinas', desde: 'Desde Sep 2021', color: 'bg-blue-500', telefono: '+57 601 742 8890', ruc: '90148273023', updatedAt: 'Ayer, 16:42' },
  { id: '3', nombre: 'El Poblado', ciudad: 'Medellin', direccion: 'Cra 37 #10A-30, El Poblado', estado: 'ACTIVA', ventasHoy: '$1.98M', empleados: 9, ticketProm: '$31k', participacion: 26, administrador: 'Camila Reyes', desde: 'Desde Feb 2023', color: 'bg-green-500', telefono: '+57 604 512 7731', ruc: '90148273031', updatedAt: '28 Jul, 11:05' },
  { id: '4', nombre: 'Laureles', ciudad: 'Medellin', direccion: 'Cl 33 #76A-15, Laureles', estado: 'EN CONSTRUCCION', administrador: 'Por definir', desde: 'Desde Sep 2026 (est.)', color: 'bg-purple-500', telefono: '+57 604 501 9234', ruc: '90148273049', updatedAt: '25 Jul, 13:28' },
];

// ============ Usuarios Data ============
export const mockUsers: User[] = [
  { id: '1', name: 'Carlos Mendoza', email: 'superadmin@barbeer.com', username: 'superadmin', role: 'superadmin', sede: 'Todas', initials: 'CM', estado: 'activo', ultimoAcceso: 'Hace 5 min', mustChangePassword: false, passwordChangedAt: '18 Jul 2026' },
  { id: '2', name: 'Andrea Torres', email: 'admin@barbeer.com', username: 'atorres', role: 'administrador', sede: 'Zona Rosa', initials: 'AT', estado: 'activo', ultimoAcceso: 'Hace 2 horas', mustChangePassword: false, passwordChangedAt: '12 Jul 2026' },
  { id: '3', name: 'Roberto Salinas', email: 'rsalinas@barbeer.com', username: 'rsalinas', role: 'administrador', sede: 'Chapinero', initials: 'RS', estado: 'activo', ultimoAcceso: 'Ayer', mustChangePassword: false, passwordChangedAt: '09 Jul 2026' },
  { id: '4', name: 'Camila Reyes', email: 'creyes@barbeer.com', username: 'creyes', role: 'administrador', sede: 'El Poblado', initials: 'CR', estado: 'activo', ultimoAcceso: 'Hace 1 hora', mustChangePassword: false, passwordChangedAt: '21 Jul 2026' },
  { id: '5', name: 'Miguel Rios', email: 'cajero@barbeer.com', username: 'mrios', role: 'empleado', sede: 'Zona Rosa', initials: 'MR', estado: 'activo', ultimoAcceso: 'Hace 10 min', mustChangePassword: false, passwordChangedAt: '05 Jul 2026' },
  { id: '6', name: 'Diana Vargas', email: 'dvargas@barbeer.com', username: 'dvargas', role: 'empleado', sede: 'Zona Rosa', initials: 'DV', estado: 'activo', ultimoAcceso: 'Hace 30 min', mustChangePassword: true, passwordChangedAt: 'Pendiente de cambio' },
  { id: '7', name: 'Luis Castro', email: 'lcastro@barbeer.com', username: 'lcastro', role: 'empleado', sede: 'Zona Rosa', initials: 'LC', estado: 'activo', ultimoAcceso: 'Hace 1 hora', mustChangePassword: false, passwordChangedAt: '22 Jun 2026' },
  { id: '8', name: 'Sofia Gomez', email: 'sgomez@barbeer.com', username: 'sgomez', role: 'empleado', sede: 'Chapinero', initials: 'SG', estado: 'activo', ultimoAcceso: 'Hace 3 horas', mustChangePassword: false, passwordChangedAt: '14 Jul 2026' },
  { id: '9', name: 'Andres Perez', email: 'aperez@barbeer.com', username: 'aperez', role: 'empleado', sede: 'Chapinero', initials: 'AP', estado: 'activo', ultimoAcceso: 'Ayer', mustChangePassword: false, passwordChangedAt: '18 Jun 2026' },
  { id: '10', name: 'Karen Lopez', email: 'klopez@barbeer.com', username: 'klopez', role: 'empleado', sede: 'El Poblado', initials: 'KL', estado: 'activo', ultimoAcceso: 'Hace 2 dias', mustChangePassword: false, passwordChangedAt: '30 Jun 2026' },
  { id: '11', name: 'Pedro Martinez', email: 'pmartinez@barbeer.com', username: 'pmartinez', role: 'empleado', sede: 'El Poblado', initials: 'PM', estado: 'inactivo', ultimoAcceso: 'Hace 1 mes', mustChangePassword: true, passwordChangedAt: '02 Jun 2026' },
];
