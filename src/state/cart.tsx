import { useEffect, useState, type ReactNode } from "react";
import { CartContext as Context, type CartItem } from "./cart-context";
const key = "senganthal-cart-v1";
function initial(): CartItem[] { try { const value = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(value) ? value.filter(item => item && typeof item.id === "string" && Number.isInteger(item.quantity) && item.quantity > 0) : []; } catch { return []; } }
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(initial);
  useEffect(() => { localStorage.setItem(key, JSON.stringify(items)); }, [items]);
  const add = (item: CartItem) => setItems(current => { const found = current.find(existing => existing.id === item.id && existing.size === item.size); return found ? current.map(existing => existing === found ? { ...existing, quantity: Math.min(20, existing.quantity + item.quantity) } : existing) : [...current, item]; });
  const setQuantity = (id: string, size: string, quantity: number) => setItems(current => current.map(item => item.id === id && item.size === size ? { ...item, quantity: Math.max(1, Math.min(20, quantity)) } : item));
  const remove = (id: string, size: string) => setItems(current => current.filter(item => item.id !== id || item.size !== size));
  return <Context.Provider value={{ items, add, setQuantity, remove, clear: () => setItems([]) }}>{children}</Context.Provider>;
}
