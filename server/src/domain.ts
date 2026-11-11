export type RequestedOrderItem = { id: string; size: string; quantity: number };
export type CatalogPrice = { id: string; name: string; price: number };

export function priceOrder(items: RequestedOrderItem[], catalog: CatalogPrice[]) {
  const byId = new Map(catalog.map((dress) => [dress.id, dress]));
  const uniqueIds = new Set(items.map((item) => item.id));
  if (byId.size !== uniqueIds.size || [...uniqueIds].some((id) => !byId.has(id))) {
    throw Object.assign(new Error("One or more cart items are no longer available."), { status: 400 });
  }
  const pricedItems = items.map((item) => {
    const dress = byId.get(item.id)!;
    return { id: item.id, name: dress.name, size: item.size, quantity: item.quantity, price: dress.price };
  });
  return { items: pricedItems, total: pricedItems.reduce((sum, item) => sum + item.price * item.quantity, 0) };
}
