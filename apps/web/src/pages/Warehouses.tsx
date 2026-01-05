import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createWarehouse, deactivateWarehouse, listWarehouses, updateWarehouse } from "../api";
import { useAuth } from "../routes/AuthProvider";
import type { Warehouse } from "../api/types";
import { downloadCsv, toCsv } from "../utils/csv";
import { delayStyle } from "../utils/style";
import { labelStatus, labelWarehouseType } from "../utils/labels";

type WarehouseForm = {
  code: string;
  name: string;
  type: string;
  address: string;
  contact: string;
};

const emptyForm: WarehouseForm = {
  code: "",
  name: "",
  type: "CENTRAL",
  address: "",
  contact: ""
};

export default function Warehouses() {
  const { token } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [form, setForm] = useState<WarehouseForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const reloadWarehouses = async () => {
    if (!token) {
      return;
    }
    const response = await listWarehouses(token);
    setWarehouses(response.data);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const payload = {
        code: form.code,
        name: form.name,
        type: form.type,
        address: form.address || null,
        contact: form.contact || null
      };

      if (editingId) {
        await updateWarehouse(token, editingId, payload);
      } else {
        await createWarehouse(token, payload);
      }
      setForm(emptyForm);
      setEditingId(null);
      await reloadWarehouses();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo guardar el almacen";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (warehouse: Warehouse) => {
    setEditingId(warehouse.id);
    setForm({
      code: warehouse.code,
      name: warehouse.name,
      type: warehouse.type,
      address: warehouse.address || "",
      contact: warehouse.contact || ""
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleToggleStatus = async (warehouse: Warehouse) => {
    if (!token) {
      return;
    }
    setError(null);
    try {
      if (warehouse.status === "ACTIVE") {
        await deactivateWarehouse(token, warehouse.id);
      } else {
        await updateWarehouse(token, warehouse.id, { status: "ACTIVE" });
      }
      await reloadWarehouses();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo actualizar el estado del almacen";
      setError(message);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Datos maestros</p>
          <h1>Almacenes</h1>
          <p className="muted">Registra almacenes municipales y su estado.</p>
        </div>
        <button
          className="button ghost"
          type="button"
          onClick={() => {
            const csv = toCsv(
              ["Codigo", "Nombre", "Tipo", "Estado", "Direccion", "Contacto"],
              warehouses.map((warehouse) => [
                warehouse.code,
                warehouse.name,
                warehouse.type,
                warehouse.status,
                warehouse.address || "",
                warehouse.contact || ""
              ])
            );
            downloadCsv("almacenes.csv", csv);
          }}
        >
          Exportar CSV
        </button>
      </header>

      {error ? <div className="card error-card">{error}</div> : null}

      <div className="grid-two">
        <section className="card animate-in">
          <div className="card-header">
            <h2>{editingId ? "Editar almacen" : "Crear almacen"}</h2>
            <p className="muted">Define atributos basicos para cada almacen.</p>
          </div>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="field">
              Codigo
              <input
                value={form.code}
                onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                required
              />
            </label>
            <label className="field">
              Nombre
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </label>
            <label className="field">
              Tipo
              <select value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}>
                <option value="CENTRAL">Central</option>
                <option value="SATELLITE">Satelite</option>
                <option value="OTHER">Otro</option>
              </select>
            </label>
            <label className="field">
              Contacto
              <input
                value={form.contact}
                onChange={(event) => setForm((prev) => ({ ...prev, contact: event.target.value }))}
              />
            </label>
            <label className="field full">
              Direccion
              <input
                value={form.address}
                onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
              />
            </label>
            <div className="form-actions full">
              {editingId ? (
                <button className="button ghost" type="button" onClick={handleCancelEdit} disabled={loading}>
                  Cancelar
                </button>
              ) : null}
              <button className="button" type="submit" disabled={loading}>
                {loading ? "Guardando..." : editingId ? "Actualizar almacen" : "Guardar almacen"}
              </button>
            </div>
          </form>
        </section>

        <section className="card table-card animate-in" style={delayStyle("120ms")}>
          <div className="card-header">
            <h2>Almacenes</h2>
            <p className="muted">{warehouses.length} almacenes registrados</p>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {warehouses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted">
                      No se encontraron almacenes.
                    </td>
                  </tr>
                ) : (
                  warehouses.map((warehouse) => (
                    <tr key={warehouse.id}>
                      <td>{warehouse.code}</td>
                      <td>{warehouse.name}</td>
                      <td>{labelWarehouseType(warehouse.type)}</td>
                      <td>
                        <span className={`badge ${warehouse.status.toLowerCase()}`}>
                          {labelStatus(warehouse.status)}
                        </span>
                      </td>
                      <td className="actions">
                        <button className="link" type="button" onClick={() => handleEdit(warehouse)}>
                          Editar
                        </button>
                        <button className="link danger" type="button" onClick={() => handleToggleStatus(warehouse)}>
                          {warehouse.status === "ACTIVE" ? "Desactivar" : "Activar"}
                        </button>
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
