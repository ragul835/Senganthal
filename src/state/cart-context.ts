import { createContext } from "react";
export type CartItem = { id: string; name: string; price: number; size: string; quantity: number; imageUrl: string };
export type CartContextValue = { items: CartItem[]; add: (item: CartItem) => void; setQuantity: (id: string, size: string, quantity: number) => void; remove: (id: string, size: string) => void; clear: () => void };
export const CartContext = createContext<CartContextValue | null>(null);
