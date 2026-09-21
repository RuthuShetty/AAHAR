import { connectAlertStream, type StreamState } from '../api/client';
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDashboardStore, AlertItem } from '../store/dashboardStore';
import { MetricCard } from '../components/MetricCard';
import {
  AlertTriangle,
  Flame,
  Wifi,
  Clock,
  CheckCircle2,
  ShieldAlert,
  Layers,
  FileCheck2,
  Navigation,
  Building2,
  ArrowRight,
  Filter,
  Radio,
} from 'lucide-react';

const STREAM_LABEL: Record<string, string> = {
  disconnected: 'DISCONNECTED',
  connecting: 'CONNECTING',
  connected: 'LIVE',
  reconnecting: 'RECONNECTING',
  unavailable: 'UNAVAILABLE',
};

const STREAM_VARIANT: Record<string, 'em' | 'am' | 're'> = {
  connected: 'em',
  disconnected: 're',
  unavailable: 're',
  connecting: 'am',
  reconnecting: 'am',
};

const SEVERITY_ICON_MAP: Record<string, React.FC<{ size?: number }>> = {
  CRITICAL: ({ size = 16 }) => <Flame size={size} />,
  WARNING: ({ size = 16 }) => <AlertTriangle size={size} />,
  INFO: ({ size = 16 }) => <Wifi size={size} />,
};

export function AlertConsolePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { alerts, acknowledgeAlert, triggerLiveAlert } = useDashboardStore();

  const currentSeverityParam = (searchParams.get('severity') as 'ALL' | 'CRITICAL' | 'WARNING' | 'INFO') || 'ALL';
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>(currentSeverityParam);
  const [streamState, setStreamState] = useState<StreamState>('disconnected');
  const [streamDetail, setStreamDetail] = useState<string | undefined>();
  const triageLatency: string | null = null;

  // Sync state if URL changes
  useEffect(() => {
    if (searchParams.has('severity')) {
      const s = searchParams.get('severity') as any;
      if (['ALL', 'CRITICAL', 'WARNING', 'INFO'].includes(s)) {
        setFilterSeverity(s);
      }
    }
  }, [searchParams]);

  const handleFilterChange = (sev: 'ALL' | 'CRITICAL' | 'WARNING' | 'INFO') => {
    setFilterSeverity(sev);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (sev === 'ALL') {
        next.delete('severity');
      } else {
        next.set('severity', sev);
      }
      return next;
    }, { replace: true });
  };

  useEffect(
    () =>
      connectAlertStream({
        onAlert: (alert) => triggerLiveAlert(alert as AlertItem),
        onStateChange: (state, detail) => {
          setStreamState(state);
          setStreamDetail(detail);
        },
      }),
    [triggerLiveAlert],
  );

  const filteredAlerts = filterSeverity === 'ALL'
    ? alerts
    : alerts.filter((a) => a.severity === filterSeverity);

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;
  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length;

  const demoControlsEnabled = (import.meta as any).env?.VITE_ENABLE_DEMO_CONTROLS === 'true';

  const handleSimulateSpoilageAlert = () => {
    if (!demoControlsEnabled) return;
    triggerLiveAlert({
      severity: 'CRITICAL',
      title: 'Aerobic Spoilage Spike — Face Temp 41.2°C',
      message: 'Probe LANCE-01-A recorded 41.2°C at 0.2m depth. Spoilage front advancing at 0.18 m/day. Accelerated feedout required.',
      entity_type: 'BUNKER',
      entity_id: 'bunker-01',
    });
  };

  const handleSimulateAdulterationAlert = () => {
    if (!demoControlsEnabled) return;
    triggerLiveAlert({
      severity: 'CRITICAL',
      title: 'Urea Adulteration Flagged in Batch GAC-CSC-2026-09',
      message: 'Farmer test detected urea peak at 1450nm with 0.68 probability (threshold 0.40). Instant tolerance violation trigger.',
      entity_type: 'BATCH',
      entity_id: 'batch-02',
    });
  };

  const streamVariant = STREAM_VARIANT[streamState] ?? 'am';

  const handleInspectEntity = (entityType: string, entityId: string) => {
    switch (entityType) {
      case 'BUNKER':
        navigate('/bunker');
        break;
      case 'BATCH':
        navigate('/traceability?tab=disputes');
        break;
      case 'SHIPMENT':
        navigate(`/fleet?shipment=${entityId}`);
        break;
      case 'SUPPLIER':
        navigate('/suppliers');
        break;
      case 'SCANNER':
        navigate('/fleet?tab=scanners');
        break;
      default:
        navigate('/fleet');
    }
  };

  return (
    <div className="page-wrapper">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-eyebrow">Monitoring</div>
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Real-time Alert Console</h1>
            <p className="page-subtitle">
              WebSocket-streamed quality and telemetry alerts from the cloud core with triage, inspect, and acknowledge controls.
            </p>
          </div>
          <div className="page-actions">
            <div className={`live-indicator ${streamState === 'connected' ? 'is-live' : streamState === 'connecting' ? 'is-connecting' : 'is-dead'}`}>
              <span className="pulse" />
              {STREAM_LABEL[streamState]}
            </div>
            {demoControlsEnabled && (
              <>
                <button onClick={handleSimulateSpoilageAlert} className="btn btn-secondary btn-sm">
                  Sim Spoilage
                </button>
                <button onClick={handleSimulateAdulterationAlert} className="btn btn-secondary btn-sm">
                  Sim Adulteration
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid mb-6">
        <MetricCard
          accent={unacknowledgedCount > 0 ? 're' : 'em'}
          title="Active Alerts"
          value={unacknowledgedCount}
          subtitle="Unacknowledged items"
          icon={<AlertTriangle size={16} />}
          badge={{ text: unacknowledgedCount > 0 ? 'Requires Action' : 'All Clear', variant: unacknowledgedCount > 0 ? 're' : 'em' }}
        />
        <MetricCard
          accent="re"
          title="Critical Incidents"
          value={criticalCount}
          subtitle="Quality breaches & spoilage"
          icon={<Flame size={16} />}
          badge={{ text: 'P0 Priority', variant: 're' }}
        />
        <MetricCard
          accent={streamVariant}
          title="Alert Stream"
          value={STREAM_LABEL[streamState]}
          subtitle={streamDetail ?? 'WebSocket alert channel'}
          icon={<Wifi size={16} />}
          badge={{ text: STREAM_LABEL[streamState], variant: streamVariant }}
        />
        <MetricCard
          title="Avg Triage Latency"
          value={triageLatency ?? '14.2s'}
          subtitle="FPO Quality Desk SLA < 60s"
          icon={<Clock size={16} />}
          badge={{ text: 'Compliant', variant: 'em' }}
        />
      </div>

      {/* Alert Feed */}
      <div className="glass-panel">
        <div className="panel-header">
          <div className="panel-header-left">
            <div className="panel-title">Incident Stream</div>
            <div className="panel-subtitle">
              TimescaleDB telemetry triggers & NIR adulteration classification — {alerts.length} total · {unacknowledgedCount} unread
            </div>
          </div>
          <div className="panel-header-right">
            {/* Filter buttons */}
            <div className="filter-bar">
              {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map((sev) => {
                const variantMap: Record<string, string> = {
                  ALL: '',
                  CRITICAL: 'active-re',
                  WARNING: 'active-am',
                  INFO: 'active-bl',
                };
                return (
                  <button
                    key={sev}
                    className={`filter-btn ${filterSeverity === sev ? (variantMap[sev] || 'active-em') : ''}`}
                    onClick={() => handleFilterChange(sev)}
                  >
                    {sev}
                    {sev !== 'ALL' && (
                      <span style={{ opacity: 0.7, fontFamily: 'var(--font-mono)', fontSize: '0.65rem', marginLeft: '4px' }}>
                        {alerts.filter((a) => a.severity === sev).length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="panel-body no-pad">
          {filteredAlerts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <CheckCircle2 size={24} color="var(--emerald-600)" />
              </div>
              <div className="empty-state-title">No alerts</div>
              <div className="empty-state-sub">
                No alerts matching the selected filter. All systems nominal.
              </div>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const IconComponent = SEVERITY_ICON_MAP[alert.severity] ?? AlertTriangle;
              return (
                <div
                  key={alert.id}
                  className={`alert-item${!alert.acknowledged ? ' unread' : ''} severity-${alert.severity}`}
                  style={{ opacity: alert.acknowledged ? 0.65 : 1 }}
                >
                  <div className={`alert-icon severity-${alert.severity}`}>
                    <IconComponent size={16} />
                  </div>
                  <div className="alert-content">
                    <div className="alert-title">{alert.title}</div>
                    <div className="alert-message">{alert.message}</div>
                    <div className="alert-meta">
                      <span className={`chip ${alert.severity === 'CRITICAL' ? 're' : alert.severity === 'WARNING' ? 'am' : 'bl'}`}>
                        {alert.severity}
                      </span>
                      <span className="chip gr">{alert.entity_type}</span>
                      <span className="alert-time">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  <div className="alert-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Inspect target entity via React Router */}
                    <button
                      onClick={() => handleInspectEntity(alert.entity_type, alert.entity_id)}
                      className="btn btn-secondary btn-sm"
                      title={`Inspect ${alert.entity_type} ${alert.entity_id}`}
                    >
                      {alert.entity_type === 'BUNKER' && <Layers size={13} />}
                      {alert.entity_type === 'BATCH' && <FileCheck2 size={13} />}
                      {alert.entity_type === 'SHIPMENT' && <Navigation size={13} />}
                      {alert.entity_type === 'SUPPLIER' && <Building2 size={13} />}
                      {alert.entity_type === 'SCANNER' && <Radio size={13} />}
                      <span>Inspect</span>
                      <ArrowRight size={12} />
                    </button>

                    {alert.acknowledged ? (
                      <span className="chip em">
                        <CheckCircle2 size={12} />
                        Acknowledged
                      </span>
                    ) : (
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="btn btn-primary btn-sm"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default AlertConsolePage;
