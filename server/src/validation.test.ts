import assert from "node:assert/strict";
import test from "node:test";
import { dressInput, orderInput, orderStatus } from "./validation.js";

test("dress validation coerces a valid price", () => {
  const dress = dressInput.parse({ name: "Silk saree", price: "2499", category: "Sarees" });
  assert.equal(dress.price, 2499);
  assert.equal(dress.sizes, "");
});

test("orders reject invalid quantities", () => {
  const result = orderInput.safeParse({
    customer: { firstName: "Rubi", lastName: "S", address: "Main Road", apartment: "", city: "Chennai", state: "Tamil Nadu", pinCode: "600001", phone: "+919999999999" },
    items: [{ id: crypto.randomUUID(), size: "M", quantity: 21 }],
  });
  assert.equal(result.success, false);
});

test("order statuses are restricted to the workflow", () => {
  assert.equal(orderStatus.safeParse("Dispatched").success, true);
  assert.equal(orderStatus.safeParse("Cancelled by attacker").success, false);
});
