'use client';

import { useState } from 'react';

import { useProductStore } from '@/store/product-store';
import type { Product, OrderItem, PaymentMethod } from '@/types';
import { Search, Table2, Minus, Plus, X, CheckCircle, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';



function formatPrice(n: number) {
  return '$' + n.toLocaleString('es-CO');
}

export default function VentasPage() {
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const { products: storeProducts } = useProductStore();
  const posProducts = storeProducts.filter((p) => p.availableInPOS && p.status === 'active');
  const categories = ['Todos', ...Array.from(new Set(posProducts.map((p) => p.category)))];

  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    { product: posProducts[0] ?? storeProducts[0], quantity: 1 },
    
    
    
  ]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Efectivo');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileOrder, setShowMobileOrder] = useState(false);

  const filteredProducts = posProducts.filter((p) => {
    const matchCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const subtotal = orderItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const iva = Math.round(subtotal * 0.19);
  const total = subtotal + iva;
  const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  const addToOrder = (product: Product) => {
    setOrderItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setOrderItems((prev) =>
      prev
        .map((i) => i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i)
        .filter((i) => i.quantity > 0)
    );
  };

  const clearOrder = () => setOrderItems([]);

  const confirmPayment = () => {
    setShowPaymentModal(false);
    setShowSuccessModal(true);
    setTimeout(() => {
      setShowSuccessModal(false);
      clearOrder();
    }, 2500);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
<div className="flex h-[calc(100vh-64px)]">
        {/* Main product area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
          {/* Search + Mesa */}
          <div className="flex gap-3 animate-fade-in-up">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar producto..."
                className="w-full h-11 pl-10 pr-4 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-amber-500/50 transition-all"
              />
            </div>
            <button className="flex items-center gap-2 px-4 h-11 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-medium text-sm hover:bg-emerald-500/20 transition-colors">
              <Table2 size={16} />
              Mesa 5
            </button>
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-1 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                  selectedCategory === cat
                    ? 'bg-amber-500 text-black'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger-children">
            {filteredProducts.map((product) => {
              const inOrder = orderItems.find((i) => i.product.id === product.id);
              return (
                <button
                  key={product.id}
                  onClick={() => addToOrder(product)}
                  className={cn(
                    'relative flex flex-row items-stretch rounded-xl border overflow-hidden transition-all duration-200 text-left group hover:scale-[1.01] active:scale-[0.99]',
                    inOrder
                      ? 'bg-card border-amber-500/40 shadow-lg shadow-amber-500/5'
                      : 'bg-card border-border hover:border-amber-500/20'
                  )}
                >
                  {/* Image left half */}
                  <div className="relative w-24 min-h-[80px] bg-muted flex-shrink-0">
                    <Image src={product.image || "/assets/trago.webp"} alt={product.name} fill className="object-cover" sizes="96px" />
                  </div>
                  {/* Info right half */}
                  <div className="flex flex-col justify-center flex-1 px-3 py-3">
                    <p className="text-sm font-semibold text-foreground leading-tight">{product.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{product.category}</p>
                    <p className="text-sm font-bold text-amber-500 mt-1.5">{formatPrice(product.price)}</p>
                  </div>
                  {inOrder && (
                    <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-500 text-black text-[10px] font-bold flex items-center justify-center">
                      {inOrder.quantity}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Order panel - Desktop */}
        <aside className="hidden lg:flex w-[360px] flex-col border-l border-border bg-sidebar">
          <div className="p-4 border-b border-border">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-foreground text-sm tracking-wide">ORDEN ACTIVA</h3>
              <button onClick={clearOrder} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Limpiar
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Mesa 5 · Carlos · 05:14 p. m.</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {orderItems.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-12">Orden vacia</p>
            ) : (
              orderItems.map((item) => (
                <div key={item.product.id} className="flex items-center gap-3 animate-fade-in">
                  <div className="relative w-8 h-8 rounded overflow-hidden flex-shrink-0"><Image src={item.product.image || "/assets/trago.webp"} alt={item.product.name} fill className="object-cover" sizes="32px" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">{formatPrice(item.product.price)} c/u</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="w-6 h-6 rounded bg-muted/60 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-sm text-foreground w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="w-6 h-6 rounded bg-muted/60 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-foreground w-20 text-right">
                    {formatPrice(item.product.price * item.quantity)}
                  </p>
                </div>
              ))
            )}
          </div>

          {orderItems.length > 0 && (
            <div className="p-4 border-t border-border space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal ({totalItems} items)</span>
                <span className="text-foreground">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA (19%)</span>
                <span className="text-foreground">{formatPrice(iva)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="font-bold text-foreground">TOTAL</span>
                <span className="text-xl font-bold text-amber-500">{formatPrice(total)}</span>
              </div>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm tracking-wide transition-all active:scale-[0.98]"
              >
                COBRAR · {formatPrice(total)}
              </button>
            </div>
          )}
        </aside>

        {/* Mobile order button */}
        {orderItems.length > 0 && (
          <button
            onClick={() => setShowMobileOrder(true)}
            className="lg:hidden fixed bottom-4 right-4 z-30 flex items-center gap-2 px-5 py-3 rounded-full bg-amber-500 text-black font-bold shadow-xl shadow-amber-500/20 active:scale-95 transition-transform"
          >
            <ShoppingBag size={18} />
            Ver orden ({totalItems})
          </button>
        )}
      </div>

      {/* Mobile Order Sheet */}
      {showMobileOrder && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowMobileOrder(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] bg-card border-t border-border rounded-t-2xl overflow-y-auto animate-slide-in-up">
            <div className="p-4 border-b border-border flex justify-between items-center sticky top-0 bg-card z-10">
              <h3 className="font-bold text-foreground">ORDEN ACTIVA</h3>
              <button onClick={() => setShowMobileOrder(false)}><X size={20} className="text-muted-foreground" /></button>
            </div>
            <div className="p-4 space-y-3">
              {orderItems.map((item) => (
                <div key={item.product.id} className="flex items-center gap-3">
                  <span className="text-lg">{item.product.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">{formatPrice(item.product.price)} c/u</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.product.id, -1)} className="w-7 h-7 rounded bg-muted flex items-center justify-center text-foreground"><Minus size={14} /></button>
                    <span className="text-sm text-foreground w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product.id, 1)} className="w-7 h-7 rounded bg-muted flex items-center justify-center text-foreground"><Plus size={14} /></button>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{formatPrice(item.product.price * item.quantity)}</p>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-border space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span><span className="text-foreground">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA (19%)</span><span className="text-foreground">{formatPrice(iva)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="font-bold text-foreground">TOTAL</span>
                <span className="text-xl font-bold text-amber-500">{formatPrice(total)}</span>
              </div>
              <button onClick={() => { setShowMobileOrder(false); setShowPaymentModal(true); }} className="w-full h-12 rounded-xl bg-amber-500 text-black font-bold">
                COBRAR · {formatPrice(total)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)} />
          <div className="relative w-full max-w-md bg-popover border border-border rounded-2xl p-6 animate-scale-in">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-foreground">PROCESAR PAGO</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>

            {/* Payment methods */}
            <div className="flex gap-2 mb-5">
              {(['Efectivo', 'Tarjeta', 'Transferencia', 'Mixto'] as PaymentMethod[]).map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium border transition-all',
                    paymentMethod === method
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-400'
                      : 'border-border text-muted-foreground hover:border-border'
                  )}
                >
                  {method}
                </button>
              ))}
            </div>

            {/* Summary */}
            <div className="bg-muted/60 rounded-xl p-4 space-y-2 mb-5 border border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA 19%</span>
                <span className="text-foreground">{formatPrice(iva)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="font-bold text-foreground">Total</span>
                <span className="text-lg font-bold text-amber-500">{formatPrice(total)}</span>
              </div>
            </div>

            <button
              onClick={confirmPayment}
              className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold tracking-wide transition-all active:scale-[0.98]"
            >
              CONFIRMAR PAGO · {paymentMethod.toUpperCase()}
            </button>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" />
          <div className="relative w-full max-w-sm bg-popover border border-border rounded-2xl p-8 text-center animate-scale-in">
            <div className="w-16 h-16 rounded-full border-2 border-emerald-500 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold text-emerald-400 tracking-wide">PAGO EXITOSO</h3>
            <p className="text-sm text-muted-foreground mt-2">Ticket generado correctamente</p>
            <p className="text-sm text-muted-foreground">Mesa 5 · {formatPrice(total)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
