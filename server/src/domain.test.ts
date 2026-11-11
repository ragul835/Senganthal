import assert from "node:assert/strict";
import test from "node:test";
import { priceOrder } from "./domain.js";

test("order pricing always uses trusted catalog prices", () => {
  const result = priceOrder(
    [{ id: "dress-1", size: "M", quantity: 2 }],
    [{ id: "dress-1", name: "Silk Saree", price: 2499 }],
  );
  assert.deepEqual(result.items, [{ id: "dress-1", name: "Silk Saree", size: "M", quantity: 2, price: 2499 }]);
  assert.equal(result.total, 4998);
});

test("order pricing rejects deleted catalog items", () => {
  assert.throws(() => priceOrder([{ id: "missing", size: "L", quantity: 1 }], []), /no longer available/i);
});
