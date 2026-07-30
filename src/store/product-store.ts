'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '@/types';
import { mockProducts } from '@/lib/mock-data';

type ProductInput = Omit<Product, 'id' | 'margin' | 'price' | 'createdAt'>;

interface ProductStore {
  products: Product[];
  addProduct: (input: ProductInput) => Product;
  updateProduct: (id: string, input: Partial<ProductInput>) => void;
  deleteProduct: (id: string) => void;
  toggleStatus: (id: string) => void;
  togglePOS: (id: string) => void;
}

const calcMargin = (sale: number, cost: number) =>
  sale > 0 ? Math.round(((sale - cost) / sale) * 100) : 0;

export const useProductStore = create<ProductStore>()(
  persist(
    (set, get) => ({
      products: mockProducts,

      addProduct: (input) => {
        const product: Product = {
          ...input,
          id: `prod-${Date.now()}`,
          price: input.salePrice,
          margin: calcMargin(input.salePrice, input.costPrice),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ products: [...s.products, product] }));
        return product;
      },

      updateProduct: (id, input) => {
        set((s) => ({
          products: s.products.map((p) => {
            if (p.id !== id) return p;
            const updated = { ...p, ...input };
            updated.price  = updated.salePrice;
            updated.margin = calcMargin(updated.salePrice, updated.costPrice);
            return updated;
          }),
        }));
      },

      deleteProduct: (id) => {
        set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
      },

      toggleStatus: (id) => {
        set((s) => ({
          products: s.products.map((p) =>
            p.id === id
              ? { ...p, status: p.status === 'active' ? 'inactive' : 'active' }
              : p
          ),
        }));
      },

      togglePOS: (id) => {
        set((s) => ({
          products: s.products.map((p) =>
            p.id === id ? { ...p, availableInPOS: !p.availableInPOS } : p
          ),
        }));
      },
    }),
    {
      name: 'barbeer-products',
      version: 2,
      migrate: (persisted) => {
        const old = persisted as { products?: Product[] } | null;
        if (!old?.products) return { products: mockProducts };
        // Migrar referencias de imagen .png a .webp
        return {
          products: old.products.map((p) => ({
            ...p,
            image: p.image?.replace(/\.png$/, '.webp') ?? '/assets/trago.webp',
          })),
        };
      },
    }
  )
);
