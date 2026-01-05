import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createItem, deactivateItem, listCategories, listItems, listUnits, updateItem } from "../api";
import { useAuth } from "../routes/AuthProvider";
import type { Category, Item, Unit } from "../api/types";
import { formatNumber } from "../utils/format";
import { downloadCsv, toCsv } from "../utils/csv";
import { delayStyle } from "../utils/style";
import { labelStatus } from "../utils/labels";

type ItemForm = {
  code: string;
  name: string;
  description: string;
  categoryId: string;
  unitId: string;
  standardCost: string;
};

const emptyForm: ItemForm = {
  code: "",
  name: "",
  description: "",
  categoryId: "",
  unitId: "",
  standardCost: ""
};

export default function Items() {
  const { token } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<ItemForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => Boolean(form.code && form.name && form.unitId), [form]);

  const loadItems = async () => {
    if (!token) {
      return;
    }
    const itemsResponse = await listItems(token, { q: search });
    setItems(itemsResponse.data);
  };

  useEffect(() => {
    if (!token) {
      return;
    }
    let active = true;
    Promise.all([listItems(token, { q: search }), listCategories(token), listUnits(token)])
      .then(([itemsResponse, categoriesResponse, unitsResponse]) => {
        if (!active) {
          return;
        }
        setItems(itemsResponse.data);
        setCategories(categoriesResponse.data);
        setUnits(unitsResponse.data);
      })
      .catch((err) => {
        if (!active) {
          return;
        }
        const message = err instanceof Error ? err.message : "No se pudieron cargar los articulos";
        setError(message);
      });

    return () => {
      active = false;
    };
  }, [token, search]);

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
        description: form.description || null,
        categoryId: form.categoryId || null,
        unitId: form.unitId,
        standardCost: form.standardCost ? Number(form.standardCost) : 0
      };

      if (editingId) {
        await updateItem(token, editingId, payload);
      } else {
        await createItem(token, payload);
      }

      setForm(emptyForm);
      setEditingId(null);
      await loadItems();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo guardar el articulo";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: Item) => {
    setEditingId(item.id);
    setForm({
      code: item.code,
      name: item.name,
      description: item.description || "",
      categoryId: item.categoryId || item.category?.id || "",
      unitId: item.unitId || item.unit?.id || "",
      standardCost: item.standardCost ? String(item.standardCost) : ""
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleToggleStatus = async (item: Item) => {
    if (!token) {
      return;
    }
    setError(null);
    try {
      if (item.status === "ACTIVE") {
        await deactivateItem(token, item.id);
      } else {
        await updateItem(token, item.id, { status: "ACTIVE" });
      }
      await loadItems();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo actualizar el estado del articulo";
      setError(message);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Datos maestros</p>
          <h1>Articulos</h1>
          <p className="muted">Crea y mantiene materiales, categorias y unidades.</p>
        </div>
        <div className="filters">
          <div className="field">
            <label className="sr-only" htmlFor="item-search">
              Buscar articulos
            </label>
            <input
              id="item-search"
              placeholder="Buscar por codigo o nombre"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <button
            className="button ghost"
            type="button"
            onClick={() => {
              const csv = toCsv(
                ["Codigo", "Nombre", "Categoria", "Unidad", "Costo", "Estado"],
                items.map((item) => [
                  item.code,
                  item.name,
                  item.category?.name || "",
                  item.unit?.code || "",
                  item.standardCost,
                  item.status
                ])
              );
              downloadCsv("articulos.csv", csv);
            }}
          >
            Exportar CSV
          </button>
        </div>
      </header>

      {error ? <div className="card error-card">{error}</div> : null}

      <div className="grid-two">
        <section className="card animate-in">
          <div className="card-header">
            <h2>{editingId ? "Editar articulo" : "Crear articulo"}</h2>
            <p className="muted">Define metadatos y costo base del articulo.</p>
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
            <label className="field full">
              Descripcion
              <input
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </label>
            <label className="field">
              Categoria
              <select
                value={form.categoryId}
                onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}
              >
                <option value="">Sin categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Unidad
              <select
                value={form.unitId}
                onChange={(event) => setForm((prev) => ({ ...prev, unitId: event.target.value }))}
                required
              >
                <option value="">Seleccionar unidad</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.code} - {unit.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Costo estandar
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.standardCost}
                onChange={(event) => setForm((prev) => ({ ...prev, standardCost: event.target.value }))}
              />
            </label>
            <div className="form-actions full">
              {editingId ? (
                <button className="button ghost" type="button" onClick={handleCancelEdit} disabled={loading}>
                  Cancelar
                </button>
              ) : null}
              <button className="button" type="submit" disabled={!canSubmit || loading}>
                {loading ? "Guardando..." : editingId ? "Actualizar articulo" : "Guardar articulo"}
              </button>
            </div>
          </form>
        </section>

        <section className="card table-card animate-in" style={delayStyle("120ms")}>
          <div className="card-header">
            <h2>Catalogo de articulos</h2>
            <p className="muted">{items.length} articulos registrados</p>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Nombre</th>
                  <th>Categoria</th>
                  <th>Unidad</th>
                  <th>Costo</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="muted">
                      No se encontraron articulos.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.code}</td>
                      <td>{item.name}</td>
                      <td>{item.category?.name || "-"}</td>
                      <td>{item.unit?.code || "-"}</td>
                      <td>{formatNumber(Number(item.standardCost))}</td>
                      <td>
                        <span className={`badge ${item.status.toLowerCase()}`}>{labelStatus(item.status)}</span>
                      </td>
                      <td className="actions">
                        <button className="link" type="button" onClick={() => handleEdit(item)}>
                          Editar
                        </button>
                        <button className="link danger" type="button" onClick={() => handleToggleStatus(item)}>
                          {item.status === "ACTIVE" ? "Desactivar" : "Activar"}
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
