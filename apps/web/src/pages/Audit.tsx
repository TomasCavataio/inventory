import { useEffect, useState } from "react";
import { listAuditLogs } from "../api";
import { useAuth } from "../routes/AuthProvider";
import type { AuditLog } from "../api/types";
import { formatDate } from "../utils/format";
import { labelAuditAction, labelAuditEntity } from "../utils/labels";

export default function Audit() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }
    let active = true;
    listAuditLogs(token)
      .then((response) => {
        if (!active) {
          return;
        }
        setLogs(response.data);
      })
      .catch((err) => {
        if (!active) {
          return;
        }
        const message = err instanceof Error ? err.message : "No se pudo cargar el registro de auditoria";
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
          <p className="eyebrow">Historial de auditoria</p>
          <h1>Registro de auditoria</h1>
          <p className="muted">Revisa cambios criticos en el sistema.</p>
        </div>
      </header>

      {error ? <div className="card error-card">{error}</div> : null}

      <section className="card table-card animate-in">
        <div className="card-header">
          <h2>Actividad reciente</h2>
          <p className="muted">{logs.length} registros</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Entidad</th>
                <th>Accion</th>
                <th>Usuario</th>
                <th>Fecha y hora</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="muted">
                    Sin entradas de auditoria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td>{labelAuditEntity(log.entityType)}</td>
                    <td>{labelAuditAction(log.action)}</td>
                    <td>{log.user?.name || "-"}</td>
                    <td>{formatDate(log.createdAt)}</td>
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
