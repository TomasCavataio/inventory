import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import Layout from "../components/Layout";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Items from "../pages/Items";
import Warehouses from "../pages/Warehouses";
import Movements from "../pages/Movements";
import Stock from "../pages/Stock";
import Alerts from "../pages/Alerts";
import Reports from "../pages/Reports";
import Users from "../pages/Users";
import Audit from "../pages/Audit";
import Imports from "../pages/Imports";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="items" element={<Items />} />
        <Route path="warehouses" element={<Warehouses />} />
        <Route path="movements" element={<Movements />} />
        <Route path="stock" element={<Stock />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="reports" element={<Reports />} />
        <Route path="users" element={<Users />} />
        <Route path="audit" element={<Audit />} />
        <Route path="imports" element={<Imports />} />
      </Route>
      <Route path="*" element={<Login />} />
    </Routes>
  );
}
