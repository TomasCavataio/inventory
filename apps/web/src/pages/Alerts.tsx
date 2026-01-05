import { useEffect, useState } from "react";
import { computeAlerts, listAlerts } from "../api";
import { useAuth } from "../routes/AuthProvider";
import type { Alert } from "../api/types";
import { formatNumber } from "../utils/format";
import { downloadCsv, toCsv } from "../utils/csv";
import { labelAlertType } from "../utils/labels";

export default function Alerts() {
  const { token } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadAlerts = async () => {
    if (!token) {
      return;
    }
    const response = await listAlerts(token);
    setAlerts(response.data);
  };

  useEffect(() => {
    if (!token) {
      return;
    }
    let active = true;
    listAlerts(token)
      .then((response) => {
        if (!active) {
          return;
        }
        setAlerts(response.data);
      })
      .catch((err) => {
        if (!active) {
          return;
        }
        const message = err instanceof Error ? err.message : "No se pudieron cargar las alertas";
        setError(message);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const handleCompute = async () => {
    if (!token) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await computeAlerts(token);
      await loadAlerts();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudieron calcular las alertas";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Control de umbrales</p>
          <h1>Alertas</h1>
          <p className="muted">Revisa articulos por debajo del minimo o punto de reorden.</p>
        </div>
        <div className="filters">
          <button className="button ghost" type="button" onClick={handleCompute} disabled={loading}>
            {loading ? "Calculando..." : "Recalcular alertas"}
          </button>
          <button
            className="button ghost"
            type="button"
            onClick={() => {
              const csv = toCsv(
                ["Articulo", "Almacen", "Tipo", "Cantidad", "Minimo", "Reorden"],
                alerts.map((alert) => [
                  alert.item ? `${alert.item.code} - ${alert.item.name}` : "",
                  alert.warehouse?.name || "",
                  alert.type,
                  alert.quantity,
                  alert.minStock,
                  alert.reorderPoint
                ])
              );
              downloadCsv("alertas.csv", csv);
            }}
          >
            Exportar CSV
          </button>
        </div>
      </header>

      {error ? <div className="card error-card">{error}</div> : null}

      <section className="card table-card animate-in">
        <div className="card-header">
          <h2>Alertas activas</h2>
          <p className="muted">{alerts.length} alertas</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Articulo</th>
                <th>Almacen</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Minimo</th>
                <th>Reorden</th>
              </tr>
            </thead>
            <tbody>
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
                    No se encontraron alertas.
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr key={alert.id}>
                    <td>{alert.item ? `${alert.item.code} - ${alert.item.name}` : "-"}</td>
                    <td>{alert.warehouse?.name || "-"}</td>
                    <td>
                      <span className={`badge ${alert.type.toLowerCase()}`}>{labelAlertType(alert.type)}</span>
                    </td>
                    <td>{formatNumber(Number(alert.quantity), 3)}</td>
                    <td>{formatNumber(Number(alert.minStock), 3)}</td>
                    <td>{formatNumber(Number(alert.reorderPoint), 3)}</td>
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
