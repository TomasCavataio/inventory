import { describe, expect, it } from "vitest";
import { computeStockDeltas, validateMovementInput } from "../services/stockEngine";

describe("stockEngine", () => {
  it("rejects movements without lines", () => {
    expect(() =>
      validateMovementInput(
        { type: "INGRESS", destinationWarehouseId: "warehouse-1" },
        []
      )
    ).toThrow("Movement must include at least one line");
  });

  it("requires origin warehouse for egress", () => {
    expect(() =>
      validateMovementInput(
        { type: "EGRESS" },
        [{ itemId: "item-1", quantity: 5 }]
      )
    ).toThrow("Egress requires an origin warehouse");
  });

  it("computes deltas for transfer", () => {
    const deltas = computeStockDeltas(
      {
        type: "TRANSFER",
        originWarehouseId: "origin",
        destinationWarehouseId: "destination"
      },
      [{ itemId: "item-1", quantity: 3 }]
    );

    expect(deltas).toHaveLength(2);
    expect(deltas[0]).toMatchObject({ itemId: "item-1", warehouseId: "origin", delta: -3 });
    expect(deltas[1]).toMatchObject({ itemId: "item-1", warehouseId: "destination", delta: 3 });
  });

  it("applies adjustment direction", () => {
    const deltas = computeStockDeltas(
      {
        type: "ADJUSTMENT",
        adjustmentDirection: "DECREASE",
        originWarehouseId: "warehouse-1"
      },
      [{ itemId: "item-1", quantity: 2 }]
    );

    expect(deltas[0].delta).toBe(-2);
  });
});
