import type { CartItem } from "../state/cart-context";
import { apiRequest } from "./api";
export type OrderStatus = "New order" | "In progress" | "Dispatched" | "Received" | "Return requested" | "Returned";
export type Order = { id: string; orderId: string; createdAt: string; firstName: string; lastName: string; address: string; apartment: string; city: string; state: string; pinCode: string; phone: string; items: Array<{ id: string; name: string; size: string; quantity: number; price: number }>; total: number; status: OrderStatus };
export type LookupResult = { orderId: string; status: OrderStatus; createdAt: string; name: string; total: number };
export function lookUpOrder(query: { orderId?: string; phone?: string }) { return apiRequest<{ ok: true; orders: LookupResult[] }>("/orders/lookup", { method: "POST", body: JSON.stringify(query) }); }
export function placeOrder(customer: Omit<Order, "id" | "orderId" | "createdAt" | "items" | "total" | "status">, items: CartItem[]) { return apiRequest<{ ok: true; orderId: string; createdAt: string; total: number }>("/orders", { method: "POST", body: JSON.stringify({ customer, items: items.map(({ id, size, quantity }) => ({ id, size, quantity })) }) }); }
export function listOrders() { return apiRequest<Order[]>("/orders"); }
export function setOrderStatus(id: string, status: OrderStatus) { return apiRequest(`/orders/${encodeURIComponent(id)}/status`, { method: "PATCH", body: JSON.stringify({ status }) }); }
