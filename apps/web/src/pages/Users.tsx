import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createUser, deactivateUser, listRoles, listUsers, listWarehouses, updateUser } from "../api";
import { useAuth } from "../routes/AuthProvider";
import type { Role, UserRecord, Warehouse } from "../api/types";
import { delayStyle } from "../utils/style";
import { labelRole, labelStatus } from "../utils/labels";

type UserForm = {
  name: string;
  email: string;
  password: string;
  roleIds: string[];
  warehouseIds: string[];
};

const emptyForm: UserForm = {
  name: "",
  email: "",
  password: "",
  roleIds: [],
  warehouseIds: []
};

export default function Users() {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const canSubmit = Boolean(form.name && form.email && (editingId ? true : form.password));

  useEffect(() => {
    if (!token) {
      return;
    }
    let active = true;
    Promise.all([listUsers(token), listRoles(token), listWarehouses(token)])
      .then(([usersResponse, rolesResponse, warehousesResponse]) => {
        if (!active) {
          return;
        }
        setUsers(usersResponse.data);
        setRoles(rolesResponse.data);
        setWarehouses(warehousesResponse.data);
      })
      .catch((err) => {
        if (!active) {
          return;
        }
        const message = err instanceof Error ? err.message : "No se pudieron cargar los usuarios";
        setError(message);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const toggleRole = (roleId: string) => {
    setForm((prev) => ({
      ...prev,
      roleIds: prev.roleIds.includes(roleId) ? prev.roleIds.filter((id) => id !== roleId) : [...prev.roleIds, roleId]
    }));
  };

  const toggleWarehouse = (warehouseId: string) => {
    setForm((prev) => ({
      ...prev,
      warehouseIds: prev.warehouseIds.includes(warehouseId)
        ? prev.warehouseIds.filter((id) => id !== warehouseId)
        : [...prev.warehouseIds, warehouseId]
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        roleIds: form.roleIds,
        warehouseIds: form.warehouseIds
      };

      if (form.password) {
        payload.password = form.password;
      }

      if (editingId) {
        await updateUser(token, editingId, payload);
      } else {
        await createUser(token, { ...payload, password: form.password });
      }

      setForm(emptyForm);
      setEditingId(null);
      const refreshed = await listUsers(token);
      setUsers(refreshed.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo guardar el usuario";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: UserRecord) => {
    setEditingId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      roleIds: user.roles?.map((role) => role.roleId) || [],
      warehouseIds: user.warehouses?.map((warehouse) => warehouse.warehouseId) || []
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleToggleStatus = async (user: UserRecord) => {
    if (!token) {
      return;
    }
    setError(null);
    try {
      if (user.status === "ACTIVE") {
        await deactivateUser(token, user.id);
      } else {
        await updateUser(token, user.id, { status: "ACTIVE" });
      }
      const refreshed = await listUsers(token);
      setUsers(refreshed.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo actualizar el estado del usuario";
      setError(message);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Control de acceso</p>
          <h1>Usuarios</h1>
          <p className="muted">Asigna roles y alcance por almacen.</p>
        </div>
      </header>

      {error ? <div className="card error-card">{error}</div> : null}

      <div className="grid-two">
        <section className="card animate-in">
          <div className="card-header">
            <h2>{editingId ? "Editar usuario" : "Crear usuario"}</h2>
            <p className="muted">Define acceso y alcance.</p>
          </div>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="field">
              Nombre
              <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
            </label>
            <label className="field">
              Correo
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </label>
            <label className="field">
              Contrasena
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              />
            </label>
            <div className="field full">
              <p className="section-title">Roles</p>
              <div className="chip-grid">
                {roles.map((role) => (
                  <label key={role.id} className="chip">
                    <input
                      type="checkbox"
                      checked={form.roleIds.includes(role.id)}
                      onChange={() => toggleRole(role.id)}
                    />
                    <span>{labelRole(role.name)}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="field full">
              <p className="section-title">Almacenes</p>
              <div className="chip-grid">
                {warehouses.map((warehouse) => (
                  <label key={warehouse.id} className="chip">
                    <input
                      type="checkbox"
                      checked={form.warehouseIds.includes(warehouse.id)}
                      onChange={() => toggleWarehouse(warehouse.id)}
                    />
                    <span>{warehouse.code}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="form-actions full">
              {editingId ? (
                <button className="button ghost" type="button" onClick={handleCancelEdit} disabled={loading}>
                  Cancelar
                </button>
              ) : null}
              <button className="button" type="submit" disabled={loading || !canSubmit}>
                {loading ? "Guardando..." : editingId ? "Actualizar usuario" : "Crear usuario"}
              </button>
            </div>
          </form>
        </section>

        <section className="card table-card animate-in" style={delayStyle("120ms")}>
          <div className="card-header">
            <h2>Usuarios</h2>
            <p className="muted">{users.length} usuarios</p>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted">
                      No se encontraron usuarios.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`badge ${user.status?.toLowerCase() || "active"}`}>
                          {labelStatus(user.status || "ACTIVE")}
                        </span>
                      </td>
                      <td className="actions">
                        <button className="link" type="button" onClick={() => handleEdit(user)}>
                          Editar
                        </button>
                        <button className="link danger" type="button" onClick={() => handleToggleStatus(user)}>
                          {user.status === "ACTIVE" ? "Desactivar" : "Activar"}
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
