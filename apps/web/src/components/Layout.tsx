import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../routes/AuthProvider";
import { labelRole } from "../utils/labels";

const navItems = [
  { to: "/", label: "Panel" },
  { to: "/movements", label: "Movimientos" },
  { to: "/stock", label: "Existencias" },
  { to: "/alerts", label: "Alertas" },
  { to: "/reports", label: "Informes" },
  { to: "/imports", label: "Importaciones" },
  { to: "/items", label: "Articulos" },
  { to: "/warehouses", label: "Almacenes" },
  { to: "/users", label: "Usuarios" },
  { to: "/audit", label: "Auditoria" }
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" />
          <div>
            <p className="brand-title">MSLO</p>
            <p className="brand-subtitle">Sistema de Inventario</p>
          </div>
        </div>
        <nav className="nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-meta">
            <span className="user-name">{user?.name}</span>
            <span className="user-role">{user?.roles?.map(labelRole).filter(Boolean).join(", ") || "Usuario"}</span>
          </div>
          <button className="button ghost" type="button" onClick={logout}>
            Cerrar sesion
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
