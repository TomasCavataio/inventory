import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  cancelMovement,
  confirmMovement,
  createMovement,
  listItems,
  listMovements,
  listWarehouses
} from "../api";
import { useAuth } from "../routes/AuthProvider";
import type { Item, Movement, MovementLine, Warehouse } from "../api/types";
import { formatDate, formatNumber } from "../utils/format";
import { downloadCsv, toCsv } from "../utils/csv";
import { delayStyle } from "../utils/style";
import { labelMovementType, labelStatus } from "../utils/labels";

type MovementForm = {
  type: "INGRESS" | "EGRESS" | "TRANSFER" | "ADJUSTMENT";
  adjustmentDirection: "INCREASE" | "DECREASE";
  originWarehouseId: string;
  destinationWarehouseId: string;
  reference: string;
  reason: string;
};

type LineForm = {
  itemId: string;
  quantity: string;
  unitCost: string;
};

const emptyForm: MovementForm = {
  type: "INGRESS",
  adjustmentDirection: "INCREASE",
  originWarehouseId: "",
  destinationWarehouseId: "",
  reference: "",
  reason: ""
};

const emptyLine: LineForm = {
  itemId: "",
  quantity: "",
  unitCost: ""
};

export default function Movements() {
  const { token } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [form, setForm] = useState<MovementForm>(emptyForm);
  const [lineForm, setLineForm] = useState<LineForm>(emptyLine);
  const [lines, setLines] = useState<MovementLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const needsOrigin = form.type === "EGRESS" || form.type === "TRANSFER" || form.type === "ADJUSTMENT";
  const needsDestination = form.type === "INGRESS" || form.type === "TRANSFER";
  const canSubmit = useMemo(() => {
    const hasOrigin = !needsOrigin || Boolean(form.originWarehouseId);
    const hasDestination = !needsDestination || Boolean(form.destinationWarehouseId);
    const hasReason = form.type !== "ADJUSTMENT" || Boolean(form.reason);
    return lines.length > 0 && hasOrigin && hasDestination && hasReason;
  }, [lines.length, needsOrigin, needsDestination, form.originWarehouseId, form.destinationWarehouseId, form.reason, form.type]);

  useEffect(() => {
    if (!token) {
      return;
    }
    let active = true;
    Promise.all([listItems(token), listWarehouses(token), listMovements(token)])
      .then(([itemsResponse, warehousesResponse, movementsResponse]) => {
        if (!active) {
          return;
        }
        setItems(itemsResponse.data);
        setWarehouses(warehousesResponse.data);
        setMovements(movementsResponse.data);
      })
      .catch((err) => {
        if (!active) {
          return;
        }
        const message = err instanceof Error ? err.message : "No se pudieron cargar los movimientos";
        setError(message);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const addLine = () => {
    if (!lineForm.itemId || !lineForm.quantity) {
      return;
    }
    const quantity = Number(lineForm.quantity);
    if (Number.isNaN(quantity) || quantity <= 0) {
      return;
    }
    const unitCost = lineForm.unitCost === "" ? null : Number(lineForm.unitCost);
    setLines((prev) => [
      ...prev,
      {
        itemId: lineForm.itemId,
        quantity,
        unitCost: unitCost !== null && !Number.isNaN(unitCost) ? unitCost : null,
        totalCost: unitCost !== null && !Number.isNaN(unitCost) ? unitCost * quantity : null
      }
    ]);
    setLineForm(emptyLine);
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  const refreshMovements = async () => {
    if (!token) {
      return;
    }
    const response = await listMovements(token);
    setMovements(response.data);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await createMovement(token, {
        type: form.type,
        adjustmentDirection: form.type === "ADJUSTMENT" ? form.adjustmentDirection : null,
        originWarehouseId: needsOrigin ? form.originWarehouseId || null : null,
        destinationWarehouseId: needsDestination ? form.destinationWarehouseId || null : null,
        reference: form.reference || null,
        reason: form.reason || null,
        lines: lines.map((line) => ({
          itemId: line.itemId,
          quantity: line.quantity,
          unitCost: line.unitCost ?? null,
          totalCost: line.totalCost ?? null
        }))
      });
      setForm(emptyForm);
      setLines([]);
      await refreshMovements();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo crear el movimiento";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (movementId: string) => {
    if (!token) {
      return;
    }
    setError(null);
    try {
      await confirmMovement(token, movementId);
      await refreshMovements();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo confirmar el movimiento";
      setError(message);
    }
  };

  const handleCancel = async (movementId: string) => {
    if (!token) {
      return;
    }
    setError(null);
    try {
      await cancelMovement(token, movementId, "Cancelado desde la interfaz");
      await refreshMovements();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo cancelar el movimiento";
      setError(message);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Operaciones de inventario</p>
          <h1>Movimientos</h1>
          <p className="muted">Registra ingresos, egresos, transferencias y ajustes.</p>
        </div>
        <button
          className="button ghost"
          type="button"
          onClick={() => {
            const rows = movements.flatMap((movement) =>
              movement.lines.map((line) => {
                const item = items.find((entry) => entry.id === line.itemId);
                return [
                  movement.id,
                  movement.type,
                  movement.status,
                  movement.originWarehouse?.name || "",
                  movement.destinationWarehouse?.name || "",
                  item ? `${item.code} - ${item.name}` : line.itemId,
                  line.quantity,
                  line.unitCost ?? "",
                  line.totalCost ?? "",
                  movement.reference || "",
                  movement.reason || "",
                  formatDate(movement.createdAt)
                ];
              })
            );

            const csv = toCsv(
              [
                "ID de movimiento",
                "Tipo",
                "Estado",
                "Origen",
                "Destino",
                "Articulo",
                "Cantidad",
                "Costo unitario",
                "Costo total",
                "Referencia",
                "Motivo",
                "Fecha de creacion"
              ],
              rows
            );
            downloadCsv("movimientos.csv", csv);
          }}
        >
          Exportar CSV
        </button>
      </header>

      {error ? <div className="card error-card">{error}</div> : null}

      <div className="grid-two">
        <section className="card animate-in">
          <div className="card-header">
            <h2>Nuevo movimiento</h2>
            <p className="muted">Completa el encabezado y agrega lineas de articulo.</p>
          </div>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="field">
              Tipo
              <select
                value={form.type}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, type: event.target.value as MovementForm["type"] }))
                }
              >
                <option value="INGRESS">Ingreso</option>
                <option value="EGRESS">Egreso</option>
                <option value="TRANSFER">Transferencia</option>
                <option value="ADJUSTMENT">Ajuste</option>
              </select>
            </label>
            {form.type === "ADJUSTMENT" ? (
              <label className="field">
                Direccion
                <select
                  value={form.adjustmentDirection}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      adjustmentDirection: event.target.value as MovementForm["adjustmentDirection"]
                    }))
                  }
                >
                  <option value="INCREASE">Incremento</option>
                  <option value="DECREASE">Disminucion</option>
                </select>
              </label>
            ) : null}
            {needsOrigin ? (
              <label className="field">
                Almacen de origen
                <select
                  value={form.originWarehouseId}
                  onChange={(event) => setForm((prev) => ({ ...prev, originWarehouseId: event.target.value }))}
                  required
                >
                  <option value="">Seleccionar origen</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.code} - {warehouse.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {needsDestination ? (
              <label className="field">
                Almacen de destino
                <select
                  value={form.destinationWarehouseId}
                  onChange={(event) => setForm((prev) => ({ ...prev, destinationWarehouseId: event.target.value }))}
                  required
                >
                  <option value="">Seleccionar destino</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.code} - {warehouse.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="field">
              Referencia
              <input
                value={form.reference}
                onChange={(event) => setForm((prev) => ({ ...prev, reference: event.target.value }))}
              />
            </label>
            <label className="field full">
              Motivo
              <input
                value={form.reason}
                onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
                required={form.type === "ADJUSTMENT"}
              />
            </label>
            <div className="line-editor full">
              <p className="section-title">Lineas de articulo</p>
              <div className="line-grid">
                <label className="field">
                  Articulo
                  <select
                    value={lineForm.itemId}
                    onChange={(event) => setLineForm((prev) => ({ ...prev, itemId: event.target.value }))}
                  >
                    <option value="">Seleccionar articulo</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.code} - {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Cantidad
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={lineForm.quantity}
                    onChange={(event) => setLineForm((prev) => ({ ...prev, quantity: event.target.value }))}
                  />
                </label>
                <label className="field">
                  Costo unitario
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={lineForm.unitCost}
                    onChange={(event) => setLineForm((prev) => ({ ...prev, unitCost: event.target.value }))}
                  />
                </label>
                <button className="button ghost" type="button" onClick={addLine}>
                  Agregar linea
                </button>
              </div>
              <div className="table-wrap compact">
                <table>
                  <thead>
                    <tr>
                      <th>Articulo</th>
                      <th>Cantidad</th>
                      <th>Costo unitario</th>
                      <th>Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="muted">
                          Sin lineas agregadas.
                        </td>
                      </tr>
                    ) : (
                      lines.map((line, index) => {
                        const item = items.find((entry) => entry.id === line.itemId);
                        return (
                          <tr key={`${line.itemId}-${index}`}>
                            <td>{item ? `${item.code} - ${item.name}` : line.itemId}</td>
                            <td>{formatNumber(Number(line.quantity))}</td>
                            <td>
                              {line.unitCost !== null && line.unitCost !== undefined
                                ? formatNumber(Number(line.unitCost))
                                : "-"}
                            </td>
                            <td>
                              {line.totalCost !== null && line.totalCost !== undefined
                                ? formatNumber(Number(line.totalCost))
                                : "-"}
                            </td>
                            <td>
                              <button className="link danger" type="button" onClick={() => removeLine(index)}>
                                Quitar
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="form-actions full">
              <button className="button" type="submit" disabled={!canSubmit || loading}>
                {loading ? "Guardando..." : "Guardar movimiento"}
              </button>
            </div>
          </form>
        </section>

        <section className="card table-card animate-in" style={delayStyle("120ms")}>
          <div className="card-header">
            <h2>Movimientos</h2>
            <p className="muted">{movements.length} registros</p>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Origen</th>
                  <th>Destino</th>
                  <th>Lineas</th>
                  <th>Creado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="muted">
                      No se encontraron movimientos.
                    </td>
                  </tr>
                ) : (
                  movements.map((movement) => (
                    <tr key={movement.id}>
                      <td>{labelMovementType(movement.type)}</td>
                      <td>
                        <span className={`badge ${movement.status.toLowerCase()}`}>{labelStatus(movement.status)}</span>
                      </td>
                      <td>{movement.originWarehouse?.name || "-"}</td>
                      <td>{movement.destinationWarehouse?.name || "-"}</td>
                      <td>{movement.lines.length}</td>
                      <td>{formatDate(movement.createdAt)}</td>
                      <td className="actions">
                        {movement.status === "DRAFT" ? (
                          <>
                            <button className="link" type="button" onClick={() => handleConfirm(movement.id)}>
                              Confirmar
                            </button>
                            <button className="link danger" type="button" onClick={() => handleCancel(movement.id)}>
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <span className="muted">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
