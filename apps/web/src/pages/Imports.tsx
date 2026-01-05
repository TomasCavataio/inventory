import { useMemo, useState } from "react";
import { importItems, importStock, importWarehouses } from "../api";
import { useAuth } from "../routes/AuthProvider";
import type { ImportResult } from "../api/types";

type ImportCardProps = {
  title: string;
  description: string;
  helpText: string;
  onImport: (token: string, csv: string) => Promise<ImportResult>;
};

function ImportCard({ title, description, helpText, onImport }: ImportCardProps) {
  const { token } = useAuth();
  const [csvText, setCsvText] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canImport = useMemo(() => csvText.trim().length > 0, [csvText]);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setCsvText(text);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    if (!token) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const response = await onImport(token, csvText);
      setResult(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al importar";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card animate-in">
      <div className="card-header">
        <div>
          <h2>{title}</h2>
          <p className="muted">{description}</p>
        </div>
      </div>
      <p className="muted">{helpText}</p>
      <div className="form">
        <label className="field">
          Archivo CSV
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                handleFile(file);
              }
            }}
          />
        </label>
        <label className="field">
          Contenido CSV
          <textarea
            rows={6}
            value={csvText}
            onChange={(event) => setCsvText(event.target.value)}
            placeholder="Pega el contenido CSV aqui"
          />
        </label>
        {error ? <p className="error-text">{error}</p> : null}
        {result ? (
          <div className="card subtle">
            <p className="muted">
              Creado: {result.created} | Actualizado: {result.updated}
            </p>
            {result.errors.length ? (
              <div className="error-list">
                {result.errors.map((entry, index) => (
                  <p key={`${entry}-${index}`} className="muted">
                    {entry}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <button className="button" type="button" onClick={handleSubmit} disabled={!canImport || loading}>
          {loading ? "Importando..." : "Ejecutar importacion"}
        </button>
      </div>
    </section>
  );
}

export default function Imports() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Carga de datos</p>
          <h1>Importaciones</h1>
          <p className="muted">Carga datos iniciales desde CSV para una puesta en marcha rapida.</p>
        </div>
      </header>

      <div className="grid-two">
        <ImportCard
          title="Almacenes"
          description="Crear o actualizar almacenes."
          helpText="Columnas: code, name, type, address, contact, status"
          onImport={(token, csv) => importWarehouses(token, csv)}
        />
        <ImportCard
          title="Articulos"
          description="Carga articulos del catalogo y configuraciones opcionales."
          helpText="Columnas: code, name, unitCode, unitName, categoryName, standardCost, status, defaultWarehouseCode, warehouseCode, minStock, reorderPoint"
          onImport={(token, csv) => importItems(token, csv)}
        />
        <ImportCard
          title="Existencias iniciales"
          description="Define saldos actuales por almacen."
          helpText="Columnas: itemCode, warehouseCode, quantity, locationCode, locationName"
          onImport={(token, csv) => importStock(token, csv)}
        />
      </div>
    </div>
  );
}
