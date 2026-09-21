import React from 'react';
import { Routes, Route, Navigate, useLocation, NavLink } from 'react-router-dom';
import { useDashboardStore } from './store/dashboardStore';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { BatchTraceabilityPage } from './pages/BatchTraceabilityPage';
import { BunkerTwinPage } from './pages/BunkerTwinPage';
import { FleetMapPage } from './pages/FleetMapPage';
import { SupplierHeatmapPage } from './pages/SupplierHeatmapPage';
import { ModelPerformancePage } from './pages/ModelPerformancePage';
import { AlertConsolePage } from './pages/AlertConsolePage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { Navigation, FileCheck2, Layers, Bell } from 'lucide-react';

export function App() {
  const location = useLocation();
  const { alerts, shipments } = useDashboardStore();

  const unreadAlerts = alerts.filter((a) => !a.acknowledged).length;
  const inTransitCount = shipments.filter((s) => s.status === 'IN_TRANSIT').length;

  return (
    <div className="app-root">
      <Sidebar />
      <div className="main-shell">
        <Header />
        <main className="main-scroll">
          <div key={location.pathname} className="page-transition-wrap">
            <Routes location={location}>
              <Route path="/" element={<Navigate to="/fleet" replace />} />
              <Route path="/fleet" element={<FleetMapPage />} />
              <Route path="/traceability" element={<BatchTraceabilityPage />} />
              <Route path="/bunker" element={<BunkerTwinPage />} />
              <Route path="/suppliers" element={<SupplierHeatmapPage />} />
              <Route path="/models" element={<ModelPerformancePage />} />
              <Route path="/alerts" element={<AlertConsolePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Quick Navigation */}
      <nav className="mobile-bottom-bar" aria-label="Mobile Navigation">
        <NavLink
          to="/fleet"
          className={({ isActive }) => `mobile-bottom-item${isActive ? ' active' : ''}`}
        >
          <Navigation size={18} />
          <span>Tracking ({inTransitCount})</span>
        </NavLink>

        <NavLink
          to="/traceability"
          className={({ isActive }) => `mobile-bottom-item${isActive ? ' active' : ''}`}
        >
          <FileCheck2 size={18} />
          <span>Batches</span>
        </NavLink>

        <NavLink
          to="/bunker"
          className={({ isActive }) => `mobile-bottom-item${isActive ? ' active' : ''}`}
        >
          <Layers size={18} />
          <span>Bunkers</span>
        </NavLink>

        <NavLink
          to="/alerts"
          className={({ isActive }) => `mobile-bottom-item${isActive ? ' active' : ''}`}
        >
          <Bell size={18} />
          <span>Alerts {unreadAlerts > 0 ? `(${unreadAlerts})` : ''}</span>
        </NavLink>
      </nav>
    </div>
  );
}

export default App;
