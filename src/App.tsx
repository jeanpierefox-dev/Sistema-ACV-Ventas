/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import Clients from './pages/Clients';
import PollosBebes from './pages/PollosBebes';
import PollosVivos from './pages/PollosVivos';
import Users from './pages/Users';
import InventarioBB from './pages/InventarioBB';
import InventarioVivos from './pages/InventarioVivos';
import Reportes from './pages/Reportes';

import Ventas from './pages/Ventas';

import Certificados from './pages/Certificados';
import Configuracion from './pages/Configuracion';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50">Cargando...</div>;
  if (!currentUser) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<DashboardHome />} />
            <Route path="clientes" element={<Clients />} />
            <Route path="inventario-bb" element={<InventarioBB />} />
            <Route path="pollos-bebes" element={<PollosBebes />} />
            <Route path="inventario-vivos" element={<InventarioVivos />} />
            <Route path="pollos-vivos" element={<PollosVivos />} />
            <Route path="ventas" element={<Ventas />} />
            <Route path="reportes" element={<Reportes />} />
            <Route path="usuarios" element={<Users />} />
            <Route path="certificados" element={<Certificados />} />
            <Route path="config" element={<Configuracion />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

