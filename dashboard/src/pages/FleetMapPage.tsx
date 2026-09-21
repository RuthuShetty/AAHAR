import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useDashboardStore,
  TrackingShipment,
  ScannerDevice,
} from '../store/dashboardStore';
import { MetricCard } from '../components/MetricCard';
import {
  Navigation,
  Truck,
  MapPin,
  Activity,
  CheckCircle2,
  Clock,
  Thermometer,
  Droplets,
  Battery,
  ShieldCheck,
  Layers,
  Compass,
  ZoomIn,
  ZoomOut,
  Copy,
  Phone,
  ExternalLink,
  Radio,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────── */
/*  STYLIZED TRACKING MAP CANVAS                                               */
/* ─────────────────────────────────────────────────────────────────────────── */

interface WaypointLocation {
  name: string;
  type: 'mill' | 'weighbridge' | 'hub' | 'depot' | 'farm';
  x: number;
  y: number;
  label: string;
}

const WAYPOINTS: WaypointLocation[] = [
  { name: 'Kanjari Feed Plant', type: 'mill', x: 180, y: 110, label: 'Amul Mill #1' },
  { name: 'NH 48 Weighbridge', type: 'weighbridge', x: 360, y: 190, label: 'Gate Scan #2' },
  { name: 'Anand Central Hub', type: 'hub', x: 500, y: 270, label: 'FPO Central' },
  { name: 'Mogri Co-op Depot', type: 'depot', x: 620, y: 390, label: 'Mogri Cluster' },
  { name: 'Chikhodra Silage Bunker', type: 'farm', x: 740, y: 150, label: 'Bunker #04' },
  { name: 'Borsad Distribution Center', type: 'depot', x: 340, y: 440, label: 'Borsad Depot' },
];

export function FleetMapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    shipments,
    selectedShipmentId,
    setSelectedShipmentId,
    scanners,
    searchQuery,
  } = useDashboardStore();

  const urlShipment = searchParams.get('shipment');
  const urlStatus = (searchParams.get('status') as 'ALL' | 'IN_TRANSIT' | 'AT_CHECKPOINT' | 'DELIVERED') || 'ALL';

  const [activeSubTab, setActiveSubTab] = useState<'shipments' | 'scanners'>('shipments');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_TRANSIT' | 'AT_CHECKPOINT' | 'DELIVERED'>(urlStatus);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [layerMode, setLayerMode] = useState<'corridors' | 'telemetry' | 'sat'>('corridors');
  const [pulseTick, setPulseTick] = useState(0);
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync selected shipment from URL
  useEffect(() => {
    if (urlShipment && shipments.some((s) => s.id === urlShipment)) {
      setSelectedShipmentId(urlShipment);
    }
  }, [urlShipment, shipments, setSelectedShipmentId]);

  // Sync status filter from URL
  useEffect(() => {
    if (urlStatus && ['ALL', 'IN_TRANSIT', 'AT_CHECKPOINT', 'DELIVERED'].includes(urlStatus)) {
      setStatusFilter(urlStatus);
    }
  }, [urlStatus]);

  const handleSelectShipment = (id: string) => {
    setSelectedShipmentId(id);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('shipment', id);
      return next;
    }, { replace: true });
  };

  const handleStatusFilterChange = (st: 'ALL' | 'IN_TRANSIT' | 'AT_CHECKPOINT' | 'DELIVERED') => {
    setStatusFilter(st);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (st === 'ALL') {
        next.delete('status');
      } else {
        next.set('status', st);
      }
      return next;
    }, { replace: true });
  };

  const selectedShipment =
    shipments.find((s) => s.id === selectedShipmentId) || shipments[0];

  // Animation pulse loop for moving vehicle beacon
  useEffect(() => {
    const timer = setInterval(() => {
      setPulseTick((t) => (t + 1) % 100);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Filtered shipments
  const filteredShipments = shipments.filter((s) => {
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.id.toLowerCase().includes(q) ||
        s.batch_code.toLowerCase().includes(q) ||
        s.vehicle_no.toLowerCase().includes(q) ||
        s.driver_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Draw Stylized Dark Vector Map
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle HiDPI scaling
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    // 1. Crisp Light Cartographic Background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    // 2. Subtle Grid Lines
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.4)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 3. Stylized Water Feature (Mahi River Canal)
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.15)';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.7);
    ctx.bezierCurveTo(w * 0.3, h * 0.65, w * 0.6, h * 0.85, w, h * 0.75);
    ctx.stroke();

    // 4. Secondary Road Network
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.1, h * 0.2);
    ctx.lineTo(w * 0.4, h * 0.35);
    ctx.lineTo(w * 0.6, h * 0.25);
    ctx.lineTo(w * 0.9, h * 0.3);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(w * 0.4, h * 0.35);
    ctx.lineTo(w * 0.55, h * 0.65);
    ctx.lineTo(w * 0.8, h * 0.8);
    ctx.stroke();

    // 5. Active Highway Transit Corridor (Route Path)
    const scaleX = w / 900;
    const scaleY = h / 520;

    const p0 = { x: WAYPOINTS[0].x * scaleX, y: WAYPOINTS[0].y * scaleY };
    const p1 = { x: WAYPOINTS[1].x * scaleX, y: WAYPOINTS[1].y * scaleY };
    const p2 = { x: WAYPOINTS[2].x * scaleX, y: WAYPOINTS[2].y * scaleY };
    const p3 = { x: WAYPOINTS[3].x * scaleX, y: WAYPOINTS[3].y * scaleY };

    // Outer glow for route
    ctx.strokeStyle = 'rgba(37, 99, 235, 0.15)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.stroke();

    // Core polyline
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.stroke();

    // 6. Draw Waypoint Nodes
    WAYPOINTS.forEach((wp) => {
      const wx = wp.x * scaleX;
      const wy = wp.y * scaleY;

      // Outer ring
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(wx, wy, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = wp.type === 'mill' ? '#059669' : wp.type === 'hub' ? '#2563eb' : '#94a3b8';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner dot
      ctx.fillStyle = wp.type === 'mill' ? '#059669' : wp.type === 'hub' ? '#2563eb' : '#64748b';
      ctx.beginPath();
      ctx.arc(wx, wy, 4, 0, Math.PI * 2);
      ctx.fill();

      // Label
      ctx.font = '600 10px Inter, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(wp.label, wx + 14, wy + 4);
    });

    // 7. Animated Transit Vehicle Position
    const progress = (pulseTick % 100) / 100;
    const carX = p1.x + (p2.x - p1.x) * (0.3 + progress * 0.4);
    const carY = p1.y + (p2.y - p1.y) * (0.3 + progress * 0.4);

    // Pulse radar circle
    const radarRadius = 12 + (pulseTick % 30) * 1.2;
    const radarAlpha = Math.max(0, 1 - (pulseTick % 30) / 30);
    ctx.strokeStyle = `rgba(37, 99, 235, ${radarAlpha * 0.6})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(carX, carY, radarRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Vehicle Core Marker
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.arc(carX, carY, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Vehicle Callout Tag
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    const tagW = 110;
    const tagH = 26;
    const tagX = carX - tagW / 2;
    const tagY = carY - 38;
    ctx.beginPath();
    ctx.roundRect(tagX, tagY, tagW, tagH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('TRK-9021 · 54 km/h', tagX + 8, tagY + 16);
  }, [pulseTick, zoomLevel, layerMode]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/fleet?shipment=${selectedShipment.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalTracked = shipments.length;
  const inTransitCount = shipments.filter((s) => s.status === 'IN_TRANSIT').length;
  const avgSpeed = Math.round(
    shipments.reduce((acc, s) => acc + s.speed_kmh, 0) / shipments.length
  );

  return (
    <div className="page-wrapper">
      {/* Top Header Row */}
      <div className="page-header mb-6">
        <div className="page-eyebrow">Enterprise Telemetry</div>
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Fleet & Consignment Tracking Center</h1>
            <p className="page-subtitle">
              Live Charotar Milk Corridor routes, real-time GPS telemetry, cold-chain temperature compliance, and consignment milestone steppers.
            </p>
          </div>
          <div className="page-actions">
            <span className="chip em">
              <span className="chip-dot" />
              Live Telemetry Stream
            </span>
            <span className="chip bl">
              {inTransitCount} In Transit
            </span>
          </div>
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div className="kpi-grid mb-6">
        <MetricCard
          accent="em"
          title="Active Consignments"
          value={`${inTransitCount}/${totalTracked}`}
          subtitle="40T Cottonseed Cake en route"
          icon={<Truck size={18} />}
          badge={{ text: '100% Monitored', variant: 'em' }}
        />
        <MetricCard
          accent="bl"
          title="Corridor Fleet Speed"
          value={`${avgSpeed} km/h`}
          subtitle="Normal highway flow"
          icon={<Activity size={18} />}
          delta={{ value: '+4 km/h vs avg', isPositive: true }}
        />
        <MetricCard
          accent="em"
          title="Cold-Chain Temperature"
          value={`${selectedShipment.cargo_temp_c}°C`}
          subtitle="Target: 2.0°C - 6.0°C"
          icon={<Thermometer size={18} />}
          badge={{ text: 'Optimal Compliance', variant: 'em' }}
        />
        <MetricCard
          accent="am"
          title="Handheld Fleet"
          value={`${scanners.filter((s) => s.is_online).length}/${scanners.length}`}
          subtitle="Field NIR units deployed"
          icon={<Radio size={18} />}
          badge={{ text: 'BLE 5.0 Synced', variant: 'bl' }}
        />
      </div>

      {/* Interactive Tracking Map Viewport */}
      <div className="tracking-map-wrapper mb-6">
        <canvas ref={canvasRef} className="tracking-map-canvas" />

        {/* Map Top Bar Overlay */}
        <div className="map-overlay-top">
          <div className="map-glass-badge">
            <span className="status-dot online" />
            <span>Charotar Dairy Corridor: Kanjari to Mogri to Anand</span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`chip ${layerMode === 'corridors' ? 'em' : 'gr'}`}
              style={{ cursor: 'pointer' }}
              onClick={() => setLayerMode('corridors')}
            >
              Corridors
            </button>
            <button
              className={`chip ${layerMode === 'telemetry' ? 'bl' : 'gr'}`}
              style={{ cursor: 'pointer' }}
              onClick={() => setLayerMode('telemetry')}
            >
              Sensors
            </button>
          </div>
        </div>

        {/* Map Controls */}
        <div className="map-controls">
          <button
            className="map-control-btn"
            title="Zoom In"
            onClick={() => setZoomLevel((z) => Math.min(2, z + 0.2))}
          >
            <ZoomIn size={16} />
          </button>
          <button
            className="map-control-btn"
            title="Zoom Out"
            onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
          >
            <ZoomOut size={16} />
          </button>
          <button
            className="map-control-btn"
            title="Recenter Map"
            onClick={() => setZoomLevel(1)}
          >
            <Compass size={16} />
          </button>
        </div>
      </div>

      {/* Split-Pane: Tracking Consignment List + Live Tracking Dossier */}
      <div className="content-grid cols-12-6">
        {/* Left Column: Shipment & Scanner Selector */}
        <div className="glass-panel">
          <div className="panel-header">
            <div className="panel-header-left">
              <div className="panel-title">Tracked Consignments</div>
              <div className="panel-subtitle">Select an active vehicle or consignment to inspect</div>
            </div>

            {/* Status Filter Tabs */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['ALL', 'IN_TRANSIT', 'AT_CHECKPOINT', 'DELIVERED'] as const).map((filter) => (
                <button
                  key={filter}
                  className={`btn btn-sm ${statusFilter === filter ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                  onClick={() => handleStatusFilterChange(filter)}
                >
                  {filter.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="panel-body">
            {filteredShipments.map((shipment) => {
              const isSelected = shipment.id === selectedShipment.id;
              const statusVariant =
                shipment.status === 'IN_TRANSIT'
                  ? 'bl'
                  : shipment.status === 'AT_CHECKPOINT'
                  ? 'am'
                  : 'em';

              return (
                <div
                  key={shipment.id}
                  className={`shipment-list-item${isSelected ? ' selected' : ''}`}
                  onClick={() => handleSelectShipment(shipment.id)}
                >
                  <div className="shipment-code-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Truck size={16} color="var(--emerald-600)" />
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem' }}>
                        {shipment.id}
                      </span>
                    </div>
                    <span className={`chip ${statusVariant}`} style={{ fontSize: '0.68rem' }}>
                      {shipment.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Route Banner */}
                  <div className="shipment-route-line">
                    <span>{shipment.origin.split('(')[0]}</span>
                    <span className="shipment-route-arrow">
                      <ArrowRight size={14} />
                    </span>
                    <span>{shipment.destination.split('(')[0]}</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="progress-bar-wrap">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${shipment.progress_pct}%` }}
                    />
                  </div>

                  {/* Shipment Mini Footer */}
                  <div className="shipment-mini-footer">
                    <span>{shipment.vehicle_no}</span>
                    <span>{shipment.speed_kmh} km/h</span>
                    <span style={{ color: 'var(--emerald-600)' }}>
                      {shipment.cargo_temp_c}°C
                    </span>
                    <span>ETA {shipment.eta_minutes}m</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Live Tracking Dossier */}
        <div className="glass-panel">
          <div className="panel-header">
            <div className="panel-header-left">
              <div className="panel-title" style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Navigation size={18} color="var(--blue-600)" />
                {selectedShipment.id}
              </div>
              <div className="panel-subtitle">Consignment #{selectedShipment.batch_code}</div>
            </div>

            <button
              className="btn btn-ghost btn-sm"
              onClick={handleCopyLink}
              title="Copy Direct Tracking URL"
              style={{ gap: '6px' }}
            >
              {copied ? <CheckCircle2 size={14} color="var(--emerald-600)" /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Share URL'}
            </button>
          </div>

          <div className="panel-body">
            {/* Driver & Vehicle Dossier */}
            <div className="driver-badge-row mb-4">
              <div className="driver-avatar">
                {selectedShipment.driver_name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  {selectedShipment.driver_name}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  {selectedShipment.transporter} · {selectedShipment.vehicle_no}
                </div>
              </div>
              <a
                href={`tel:${selectedShipment.driver_phone}`}
                className="btn btn-secondary btn-sm"
                title="Call Driver"
                style={{ gap: '6px' }}
              >
                <Phone size={14} />
                Call
              </a>
            </div>

            {/* Sensor Telemetry Dials Grid */}
            <div className="telemetry-grid">
              <div className="telemetry-card">
                <div className="telemetry-label">
                  <Activity size={12} color="var(--blue-600)" />
                  Speed
                </div>
                <div className="telemetry-val">{selectedShipment.speed_kmh} <span style={{ fontSize: '0.7rem' }}>km/h</span></div>
                <div className="telemetry-foot">GPS calculated</div>
              </div>

              <div className="telemetry-card">
                <div className="telemetry-label">
                  <Thermometer size={12} color="var(--emerald-600)" />
                  Cargo Temp
                </div>
                <div className="telemetry-val" style={{ color: 'var(--emerald-600)' }}>
                  {selectedShipment.cargo_temp_c}°C
                </div>
                <div className="telemetry-foot">Cold chain compliant</div>
              </div>

              <div className="telemetry-card">
                <div className="telemetry-label">
                  <Droplets size={12} color="var(--teal-600)" />
                  Humidity
                </div>
                <div className="telemetry-val">{selectedShipment.ambient_humidity_pct}%</div>
                <div className="telemetry-foot">BME688 probe</div>
              </div>

              <div className="telemetry-card">
                <div className="telemetry-label">
                  <Clock size={12} color="var(--amber-600)" />
                  ETA Remaining
                </div>
                <div className="telemetry-val" style={{ color: 'var(--amber-600)' }}>
                  {selectedShipment.eta_minutes > 0 ? `${selectedShipment.eta_minutes}m` : '0m'}
                </div>
                <div className="telemetry-foot">{selectedShipment.distance_remaining_km} km left</div>
              </div>

              <div className="telemetry-card">
                <div className="telemetry-label">
                  <Battery size={12} color="var(--emerald-600)" />
                  Transponder
                </div>
                <div className="telemetry-val">{selectedShipment.battery_pct}%</div>
                <div className="telemetry-foot">Solar buffered</div>
              </div>

              <div className="telemetry-card">
                <div className="telemetry-label">
                  <ShieldCheck size={12} color="var(--emerald-600)" />
                  Digital Seal
                </div>
                <div className="telemetry-val" style={{ fontSize: '0.85rem', color: 'var(--emerald-600)' }}>
                  VERIFIED
                </div>
                <div className="telemetry-foot">Ed25519 tamper-proof</div>
              </div>
            </div>

            {/* Checkpoint Milestone Stepper */}
            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Delivery Timeline & Verification Log
              </div>

              <div className="tracking-stepper">
                {selectedShipment.checkpoints.map((cp) => {
                  const isDone = cp.status === 'COMPLETED';
                  const isActive = cp.status === 'IN_PROGRESS';

                  return (
                    <div key={cp.id} className="stepper-item">
                      <div
                        className={`stepper-node ${
                          isDone ? 'completed' : isActive ? 'active' : 'pending'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <span style={{ fontSize: '8px' }}>•</span>
                        )}
                      </div>

                      <div className="stepper-title-row">
                        <span>{cp.name}</span>
                        <span style={{ fontSize: '0.72rem', color: isDone ? 'var(--emerald-400)' : isActive ? 'var(--blue-400)' : 'var(--text-muted)' }}>
                          {cp.timestamp}
                        </span>
                      </div>
                      <div className="stepper-sub">
                        {cp.location}
                        {cp.scanner_id && ` · Verified via ${cp.scanner_id}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FleetMapPage;
