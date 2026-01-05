import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listAlerts, listItems, listMovements, listWarehouses } from "../api";
import { useAuth } from "../routes/AuthProvider";
import type { Movement } from "../api/types";
import { formatDate } from "../utils/format";
import { delayStyle } from "../utils/style";
import { labelMovementType, labelStatus } from "../utils/labels";

type StatCard = {
  label: string;
  value: number;
};

export default function Dashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState<StatCard[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }
    let active = true;
    setError(null);

    Promise.all([
      listItems(token),
      listWarehouses(token),
      listAlerts(token),
      listMovements(token, { status: "CONFIRMED" })
    ])
      .then(([items, warehouses, alerts, movementResult]) => {
        if (!active) {
          return;
        }
        setStats([
          { label: "Articulos activos", value: items.data.length },
          { label: "Almacenes", value: warehouses.data.length },
          { label: "Alertas activas", value: alerts.data.length },
          { label: "Movimientos confirmados", value: movementResult.data.length }
        ]);
        setMovements(movementResult.data.slice(0, 6));
      })
      .catch((err) => {
        if (!active) {
          return;
        }
        const message = err instanceof Error ? err.message : "No se pudo cargar el panel";
        setError(message);
      });

    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Resumen de inventario</p>
          <h1>Panel</h1>
          <p className="muted">Revisa existencias, alertas y actividad reciente en los almacenes.</p>
        </div>
        <div className="quick-actions">
          <Link className="button" to="/movements">
            Nuevo movimiento
          </Link>
          <Link className="button ghost" to="/stock">
            Ver existencias
          </Link>
        </div>
      </header>

      {error ? <div className="card error-card">{error}</div> : null}

      <section className="stat-grid">
        {stats.map((stat, index) => (
          <div key={stat.label} className="card stat-card animate-in" style={delayStyle(`${index * 80}ms`)}>
            <p className="stat-label">{stat.label}</p>
            <p className="stat-value">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="card table-card animate-in" style={delayStyle("200ms")}>
        <div className="card-header">
          <h2>Movimientos recientes</h2>
          <Link to="/movements" className="link">
            Ver todo
          </Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Estado</th>
                <th>Origen</th>
                <th>Destino</th>
                <th>Creado</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    Sin movimientos aun.
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
                    <td>{formatDate(movement.createdAt)}</td>
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
