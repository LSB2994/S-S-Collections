"use client";

import React, { createContext, useContext, useReducer, useCallback, useEffect } from "react";
import type { Product } from "@/types";

export interface CartItem {
  product: Product;
  quantity: number;
}

const STORED_ITEM_KEYS = ["id", "name", "price", "imageUrl", "stock"] as const;
function productToStored(p: Product): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  STORED_ITEM_KEYS.forEach((k) => (o[k] = p[k]));
  return o;
}
function storedToProduct(raw: Record<string, unknown>): Product {
  return {
    id: String(raw.id),
    name: String(raw.name),
    description: "",
    price: Number(raw.price),
    imageUrl: raw.imageUrl ? String(raw.imageUrl) : undefined,
    stock: Number(raw.stock ?? 0),
    active: true,
    createdAt: "",
    updatedAt: "",
  };
}

interface CartState {
  items: CartItem[];
}

type CartAction =
  | { type: "ADD"; product: Product; quantity?: number }
  | { type: "REMOVE"; productId: string }
  | { type: "SET_QUANTITY"; productId: string; quantity: number }
  | { type: "CLEAR" }
  | { type: "HYDRATE"; items: CartItem[] };

const CART_KEY = "shop_cart";

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { product: Record<string, unknown>; quantity: number }[];
    return parsed.map(({ product, quantity }) => ({
      product: storedToProduct(product),
      quantity,
    }));
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  const toSave = items.map(({ product, quantity }) => ({
    product: productToStored(product),
    quantity,
  }));
  localStorage.setItem(CART_KEY, JSON.stringify(toSave));
}

function cartReducer(state: CartState, action: CartAction): CartState {
  let next: CartItem[];
  switch (action.type) {
    case "ADD": {
      const existing = state.items.find((i) => i.product.id === action.product.id);
      const q = action.quantity ?? 1;
      if (existing) {
        next = state.items.map((i) =>
          i.product.id === action.product.id ? { ...i, quantity: i.quantity + q } : i
        );
      } else {
        next = [...state.items, { product: action.product, quantity: q }];
      }
      break;
    }
    case "REMOVE":
      next = state.items.filter((i) => i.product.id !== action.productId);
      break;
    case "SET_QUANTITY":
      if (action.quantity <= 0) {
        next = state.items.filter((i) => i.product.id !== action.productId);
      } else {
        next = state.items.map((i) =>
          i.product.id === action.productId ? { ...i, quantity: action.quantity } : i
        );
      }
      break;
    case "CLEAR":
      next = [];
      break;
    case "HYDRATE":
      next = action.items;
      break;
    default:
      return state;
  }
  saveCart(next);
  return { items: next };
}

interface CartContextValue extends CartState {
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalAmount: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  useEffect(() => {
    const items = loadCart();
    if (items.length) dispatch({ type: "HYDRATE", items });
  }, []);

  const addItem = useCallback((product: Product, quantity = 1) => {
    dispatch({ type: "ADD", product, quantity });
  }, []);

  const removeItem = useCallback((productId: string) => {
    dispatch({ type: "REMOVE", productId });
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    dispatch({ type: "SET_QUANTITY", productId, quantity });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR" });
  }, []);

  const totalItems = state.items.reduce((s, i) => s + i.quantity, 0);
  const totalAmount = state.items.reduce((s, i) => s + i.product.price * i.quantity, 0);

  const value: CartContextValue = {
    ...state,
    addItem,
    removeItem,
    setQuantity,
    clearCart,
    totalItems,
    totalAmount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
