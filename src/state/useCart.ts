import { useContext } from "react";
import { CartContext } from "./cart-context";
export function useCart() { const value = useContext(CartContext); if (!value) throw new Error("CartProvider missing"); return value; }
