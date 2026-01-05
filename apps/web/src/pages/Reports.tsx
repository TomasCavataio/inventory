import { useEffect, useState } from "react";
import { listWarehouses, rotationReport, stockReport, valuationReport } from "../api";
import { useAuth } from "../routes/AuthProvider";
import type { Item, Warehouse } from "../api/types";
import { formatNumber } from "../utils/format";
import { downloadCsv, toCsv } from "../utils/csv";
import { delayStyle } from "../utils/style";

type RotationRow = {
  item?: Item | null;
  consumed: number | string;
  currentStock: number | string;
  turnoverRate: number | string;
};

export default function Reports() {
  const { token } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [stockRows, setStockRows] = useState<
    Array<{ item?: Item | null; warehouse?: Warehouse | null; quantity: number | string }>
  >([]);
  const [valuationRows, setValuationRows] = useState<
    Array<{ item?: Item | null; quantity: number | string; unitCost: number | string; totalValue: number | string }>
  >([]);
  const [rotationRows, setRotationRows] = useState<RotationRow[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }
    let active = true;
    listWarehouses(token)
      .then((response) => {
        if (!active) {
          return;
        }
        setWarehouses(response.data);
      })
      .catch((err) => {
        if (!active) {
          return;
        }
        const message = err instanceof Error ? err.message : "No se pudieron cargar los almacenes";
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
    stockReport(token, warehouseId || undefined)
      .then((response) => {
        if (!active) {
          return;
        }
        setStockRows(response.data);
      })
      .catch((err) => {
        if (!active) {
          return;
        }
        const message = err instanceof Error ? err.message : "No se pudo cargar el reporte de existencias";
        setError(message);
      });

    return () => {
      active = false;
    };
  }, [token, warehouseId]);

  useEffect(() => {
    if (!token) {
      return;
    }
    let active = true;
    valuationReport(token, warehouseId || undefined)
      .then((response) => {
        if (!active) {
          return;
        }
        setValuationRows(response.data);
      })
      .catch((err) => {
        if (!active) {
          return;
        }
        const message = err instanceof Error ? err.message : "No se pudo cargar el reporte de valuacion";
        setError(message);
      });

    return () => {
      active = false;
    };
  }, [token, warehouseId]);

  const handleRotation = async () => {
    if (!token) {
      return;
    }
    setError(null);
    try {
      const response = await rotationReport(token, from || undefined, to || undefined);
      setRotationRows(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo cargar el reporte de rotacion";
      setError(message);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Analitica</p>
          <h1>Informes</h1>
          <p className="muted">Resumenes de existencias, valuacion y rotacion.</p>
        </div>
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
      </header>

      {error ? <div className="card error-card">{error}</div> : null}

      <div className="grid-two">
        <section className="card table-card animate-in">
          <div className="card-header">
            <div>
              <h2>Resumen de existencias</h2>
              <p className="muted">Disponible por articulo y almacen</p>
            </div>
            <button
              className="button ghost"
              type="button"
              onClick={() => {
                const csv = toCsv(
                  ["Articulo", "Almacen", "Cantidad"],
                  stockRows.map((row) => [
                    row.item ? `${row.item.code} - ${row.item.name}` : "",
                    row.warehouse?.name || "",
                    row.quantity
                  ])
                );
                downloadCsv("reporte-existencias.csv", csv);
              }}
            >
              Exportar
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Articulo</th>
                  <th>Almacen</th>
                  <th>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {stockRows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="muted">
                      Sin datos.
                    </td>
                  </tr>
                ) : (
                  stockRows.map((row, index) => (
                    <tr key={`${row.item?.id || "item"}-${row.warehouse?.id || "warehouse"}-${index}`}>
                      <td>{row.item ? `${row.item.code} - ${row.item.name}` : "-"}</td>
                      <td>{row.warehouse?.name || "-"}</td>
                      <td>{formatNumber(Number(row.quantity), 3)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card table-card animate-in" style={delayStyle("120ms")}>
          <div className="card-header">
            <div>
              <h2>Valuacion</h2>
              <p className="muted">Valor de existencias por articulo</p>
            </div>
            <button
              className="button ghost"
              type="button"
              onClick={() => {
                const csv = toCsv(
                  ["Articulo", "Cantidad", "Costo unitario", "Valor total"],
                  valuationRows.map((row) => [
                    row.item ? `${row.item.code} - ${row.item.name}` : "",
                    row.quantity,
                    row.unitCost,
                    row.totalValue
                  ])
                );
                downloadCsv("reporte-valuacion.csv", csv);
              }}
            >
              Exportar
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Articulo</th>
                  <th>Cantidad</th>
                  <th>Costo unitario</th>
                  <th>Valor total</th>
                </tr>
              </thead>
              <tbody>
                {valuationRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted">
                      Sin datos.
                    </td>
                  </tr>
                ) : (
                  valuationRows.map((row, index) => (
                    <tr key={row.item?.id || `valuation-${index}`}>
                      <td>{row.item ? `${row.item.code} - ${row.item.name}` : "-"}</td>
                      <td>{formatNumber(Number(row.quantity), 3)}</td>
                      <td>{formatNumber(Number(row.unitCost), 2)}</td>
                      <td>{formatNumber(Number(row.totalValue), 2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="card table-card animate-in" style={delayStyle("160ms")}>
        <div className="card-header">
          <div>
            <h2>Rotacion</h2>
            <p className="muted">Consumo y rotacion por periodo</p>
          </div>
          <div className="filters">
            <label className="field">
              Desde
              <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            </label>
            <label className="field">
              Hasta
              <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            </label>
            <button className="button ghost" type="button" onClick={handleRotation}>
              Ejecutar informe
            </button>
            <button
              className="button ghost"
              type="button"
              onClick={() => {
                const csv = toCsv(
                  ["Articulo", "Consumo", "Existencias actuales", "Rotacion"],
                  rotationRows.map((row) => [
                    row.item ? `${row.item.code} - ${row.item.name}` : "",
                    row.consumed,
                    row.currentStock,
                    row.turnoverRate
                  ])
                );
                downloadCsv("reporte-rotacion.csv", csv);
              }}
            >
              Exportar
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Articulo</th>
                <th>Consumo</th>
                <th>Existencias actuales</th>
                <th>Rotacion</th>
              </tr>
            </thead>
            <tbody>
              {rotationRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="muted">
                    Sin datos de rotacion.
                  </td>
                </tr>
              ) : (
                rotationRows.map((row, index) => (
                  <tr key={row.item?.id || `rotation-${index}`}>
                    <td>{row.item ? `${row.item.code} - ${row.item.name}` : "-"}</td>
                    <td>{formatNumber(Number(row.consumed), 3)}</td>
                    <td>{formatNumber(Number(row.currentStock), 3)}</td>
                    <td>{formatNumber(Number(row.turnoverRate), 2)}</td>
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
