import { useEffect, useState } from "react";
import { listItems, listStock, listWarehouses } from "../api";
import { useAuth } from "../routes/AuthProvider";
import type { Item, StockBalance, Warehouse } from "../api/types";
import { formatNumber } from "../utils/format";
import { downloadCsv, toCsv } from "../utils/csv";

export default function Stock() {
  const { token } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [balances, setBalances] = useState<StockBalance[]>([]);
  const [itemId, setItemId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }
    let active = true;
    Promise.all([listItems(token), listWarehouses(token)])
      .then(([itemsResponse, warehousesResponse]) => {
        if (!active) {
          return;
        }
        setItems(itemsResponse.data);
        setWarehouses(warehousesResponse.data);
      })
      .catch((err) => {
        if (!active) {
          return;
        }
        const message = err instanceof Error ? err.message : "No se pudieron cargar los filtros";
        setError(message);
      });

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }
    let active = true;
    listStock(token, { itemId, warehouseId })
      .then((response) => {
        if (!active) {
          return;
        }
        setBalances(response.data);
      })
      .catch((err) => {
        if (!active) {
          return;
        }
        const message = err instanceof Error ? err.message : "No se pudieron cargar las existencias";
        setError(message);
      });

    return () => {
      active = false;
    };
  }, [token, itemId, warehouseId]);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Visibilidad de inventario</p>
          <h1>Existencias</h1>
          <p className="muted">Revisa cantidades disponibles por almacen y articulo.</p>
        </div>
        <div className="filters">
          <label className="field">
            Articulo
            <select value={itemId} onChange={(event) => setItemId(event.target.value)}>
              <option value="">Todos los articulos</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} - {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Almacen
            <select value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)}>
              <option value="">Todos los almacenes</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} - {warehouse.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="button ghost"
            type="button"
            onClick={() => {
              const csv = toCsv(
                ["Almacen", "Articulo", "Ubicacion", "Cantidad"],
                balances.map((balance) => [
                  balance.warehouse?.name || "",
                  balance.item ? `${balance.item.code} - ${balance.item.name}` : "",
                  balance.location?.code || "",
                  balance.quantity
                ])
              );
              downloadCsv("reporte-existencias.csv", csv);
            }}
          >
            Exportar CSV
          </button>
        </div>
      </header>

      {error ? <div className="card error-card">{error}</div> : null}

      <section className="card table-card animate-in">
        <div className="card-header">
          <h2>Existencias actuales</h2>
          <p className="muted">{balances.length} saldos</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Almacen</th>
                <th>Articulo</th>
                <th>Ubicacion</th>
                <th>Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {balances.length === 0 ? (
                <tr>
                  <td colSpan={4} className="muted">
                    No se encontraron saldos.
                  </td>
                </tr>
              ) : (
                balances.map((balance) => (
                  <tr key={balance.id}>
                    <td>{balance.warehouse?.name || "-"}</td>
                    <td>{balance.item ? `${balance.item.code} - ${balance.item.name}` : "-"}</td>
                    <td>{balance.location?.code || "-"}</td>
                    <td>{formatNumber(Number(balance.quantity), 3)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
