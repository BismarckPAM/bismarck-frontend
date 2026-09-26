import {
  ArrowRight,
  ShieldCheck,
  Lock,
  Eye,
  Clock,
  CircleDot,
  KeyRound,
  Server,
  Database,
  Globe,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface HeroProps {
  onGetStarted: () => void;
  onRequestAccess: () => void;
}

interface SessionRow {
  icon: LucideIcon;
  target: string;
  user: string;
  role: string;
  status: string;
  live?: boolean;
}

const SESSIONS: SessionRow[] = [
  {
    icon: Server,
    target: 'prod-db-cluster-01',
    user: 's.kumar',
    role: 'DBA',
    status: 'Recording',
    live: true,
  },
  {
    icon: Database,
    target: 'vault-core-banking',
    user: 'm.chen',
    role: 'SRE',
    status: 'Live',
    live: true,
  },
  {
    icon: Globe,
    target: 'aws-console (billing)',
    user: 'a.okafor',
    role: 'FinOps',
    status: 'Recording',
  },
  {
    icon: KeyRound,
    target: 'k8s-prod-eu-west',
    user: 'j.meyer',
    role: 'Platform',
    status: 'Queued',
  },
];

const STATS = [
  { label: 'Vaulted creds', value: '2,847' },
  { label: 'Audit events', value: '1.2M /mo' },
  { label: 'JIT grants', value: '96.4%' },
];

const TRUST_ITEMS = ['SOC 2 Type II', 'ISO 27001', 'Zero-Trust Architecture', 'AES-256 Encryption'];

export function Hero({ onGetStarted, onRequestAccess }: HeroProps) {
  return (
    <section className="lnd-hero">
      <div
        className="lnd-grid-pattern"
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0 }}
      />
      <div className="lnd-hero-glow" aria-hidden="true" />

      <div className="lnd-container lnd-hero-grid">
        {/* Copy */}
        <div>
          <span className="lnd-badge">
            <ShieldCheck size={14} />
            Enterprise Privileged Access Management
          </span>

          <h1 className="lnd-hero-title">
            Every privileged session.
            <br />
            <span className="lnd-gradient-text">Vaulted, recorded, audited.</span>
          </h1>

          <p className="lnd-hero-sub">
            Bismarck is an enterprise-grade PAM platform that secures, records, and audits every
            privileged identity across your infrastructure — servers, databases, cloud consoles, and
            network devices. Eliminate standing privileges with just-in-time access and prove
            compliance with a complete, tamper-evident audit trail.
          </p>

          <div className="lnd-hero-ctas">
            <button
              type="button"
              onClick={onGetStarted}
              className="lnd-btn lnd-btn-primary lnd-btn-lg"
            >
              Get Started
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={onRequestAccess}
              className="lnd-btn lnd-btn-outline lnd-btn-lg"
            >
              <Lock size={16} />
              Request Access
            </button>
          </div>

          <div className="lnd-hero-trust">
            {TRUST_ITEMS.map((item) => (
              <span key={item}>
                <ShieldCheck size={16} />
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Visual — stylized PAM console */}
        <div className="lnd-console-wrap">
          <div className="lnd-console lnd-float-slow">
            {/* window chrome */}
            <div className="lnd-console-chrome">
              <div className="lnd-console-dots" aria-hidden="true">
                <i style={{ background: 'rgba(251, 113, 133, 0.8)' }} />
                <i style={{ background: 'rgba(251, 191, 36, 0.8)' }} />
                <i style={{ background: 'rgba(52, 211, 153, 0.8)' }} />
              </div>
              <span className="lnd-console-chip">
                <Eye size={12} /> Session Monitor
              </span>
            </div>

            <div className="lnd-console-panel">
              <div className="lnd-console-head">
                <p className="lnd-console-title">Active Privileged Sessions</p>
                <span className="lnd-console-meta">4 of 12 seats</span>
              </div>
              <div>
                {SESSIONS.map((s) => (
                  <div key={s.target} className="lnd-session">
                    <span className="lnd-session-icon">
                      <s.icon size={16} />
                    </span>
                    <div className="lnd-session-body">
                      <p className="lnd-session-target">{s.target}</p>
                      <p className="lnd-session-user">
                        {s.user} · {s.role}
                      </p>
                    </div>
                    <span className="lnd-session-status">
                      <CircleDot
                        size={10}
                        className={s.live ? 'lnd-dot-live' : undefined}
                        style={{ color: s.live ? '#34d399' : 'rgba(238, 156, 216, 0.75)' }}
                      />
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lnd-console-stats">
              {STATS.map((stat) => (
                <div key={stat.label} className="lnd-stat">
                  <b>{stat.value}</b>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* floating approval card */}
          <div className="lnd-float-card approval lnd-float">
            <span className="lnd-float-icon green">
              <ShieldCheck size={18} />
            </span>
            <div>
              <p className="lnd-float-title">JIT access approved</p>
              <p className="lnd-float-sub">root@bastion-eu-2 · expires in 30m</p>
            </div>
          </div>

          {/* floating recording card */}
          <div className="lnd-float-card recording lnd-float-slow">
            <span className="lnd-float-icon plum">
              <Clock size={18} />
            </span>
            <div>
              <p className="lnd-float-title">Session recorded</p>
              <p className="lnd-float-sub">42 min · indexed &amp; searchable</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
