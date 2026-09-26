import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  KeySquare,
  Video,
  Timer,
  GitPullRequestArrow,
  FileSearch,
  Radar,
  Fingerprint,
  Lock,
  ScanEye,
  Building2,
  ArrowRight,
  ShieldCheck,
  Globe,
  Server,
  Cloud,
  Container,
  Network,
  ChevronDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useReveal } from './useReveal';

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li' | 'span' | 'p';
}) {
  const ref = useReveal<HTMLElement>();
  const style = delay ? ({ '--lnd-reveal-delay': `${delay}ms` } as React.CSSProperties) : undefined;
  return (
    <Tag
      ref={ref as never}
      className={['lnd-reveal', className].filter(Boolean).join(' ')}
      style={style}
    >
      {children}
    </Tag>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: ReactNode;
  description: string;
}) {
  return (
    <Reveal className="lnd-section-head">
      <span className="lnd-eyebrow">{eyebrow}</span>
      <h2 className="lnd-section-title">{title}</h2>
      <p className="lnd-section-desc">{description}</p>
    </Reveal>
  );
}

/* ------------------------------------------------------------------ */
/* Integrations strip                                                  */
/* ------------------------------------------------------------------ */

const PLATFORMS: Array<{ icon: LucideIcon; name: string }> = [
  { icon: Server, name: 'Linux / Unix' },
  { icon: Globe, name: 'Windows Server' },
  { icon: Cloud, name: 'AWS & Azure' },
  { icon: Container, name: 'Kubernetes' },
  { icon: Network, name: 'Network Devices' },
  { icon: Building2, name: 'SaaS Consoles' },
];

export function IntegrationsStrip() {
  return (
    <section className="lnd-integrations">
      <div className="lnd-container">
        <Reveal>
          <p className="lnd-integrations-kicker">One vault for every privileged target</p>
          <div className="lnd-integrations-row">
            {PLATFORMS.map((p, i) => (
              <Reveal key={p.name} as="span" delay={i * 60}>
                <p.icon size={18} />
                {p.name}
              </Reveal>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Features                                                            */
/* ------------------------------------------------------------------ */

const FEATURES: Array<{ icon: LucideIcon; title: string; description: string }> = [
  {
    icon: KeySquare,
    title: 'Credential Vaulting',
    description:
      'Rotate and store every privileged secret — passwords, SSH keys, API tokens — in a FIPS 140-2 validated vault with AES-256 encryption at rest and automatic rotation policies.',
  },
  {
    icon: Video,
    title: 'Session Recording',
    description:
      'Record every privileged session as searchable, frame-accurate video and keystroke logs. Replay any incident in seconds and export evidence for auditors with one click.',
  },
  {
    icon: Timer,
    title: 'Just-in-Time Access',
    description:
      'Eliminate standing privileges. Grant time-boxed elevation that auto-expires — 30 minutes of root when needed, zero permanent superusers ever again.',
  },
  {
    icon: GitPullRequestArrow,
    title: 'Approval Workflows',
    description:
      'Route access requests through multi-step approvals with reviewer quorums, SLA timers, and escalation paths. Access never ships without an accountable approver.',
  },
  {
    icon: FileSearch,
    title: 'Audit & Compliance',
    description:
      'Tamper-evident, immutable logs for every vault read, approval, and session. Pre-built reports map to SOC 2, ISO 27001, PCI-DSS, HIPAA, and DORA evidence requirements.',
  },
  {
    icon: Radar,
    title: 'Threat Analytics',
    description:
      'Behavioral baselining flags anomalous privileged activity in real time — impossible travel, off-hours vault reads, unusual command sequences — and can auto-terminate sessions.',
  },
];

export function Features() {
  return (
    <section id="features" className="lnd-section">
      <div className="lnd-container">
        <SectionHeading
          eyebrow="Capabilities"
          title={
            <>
              Everything a modern PAM <span className="lnd-gradient-text">must do</span>
            </>
          }
          description="Six pillars of privileged access security, engineered into a single platform your admins will actually enjoy using."
        />
        <div className="lnd-features-grid">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} as="article" delay={(i % 3) * 90} className="lnd-feature-card">
              <span className="lnd-feature-icon">
                <f.icon size={24} />
              </span>
              <h3 className="lnd-feature-title">{f.title}</h3>
              <p className="lnd-feature-desc">{f.description}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* How it works                                                        */
/* ------------------------------------------------------------------ */

const STEPS: Array<{ step: string; icon: LucideIcon; title: string; description: string }> = [
  {
    step: '01',
    icon: Lock,
    title: 'Onboard & vault',
    description:
      'Discover privileged accounts across your estate and import them into the encrypted vault. Automatic rotation starts immediately — no credential ever leaves the appliance unencrypted.',
  },
  {
    step: '02',
    icon: GitPullRequestArrow,
    title: 'Request & approve',
    description:
      'Engineers request access with business justification. Approvers review context — target, duration, command scope — and grant time-boxed elevation from Slack, Teams, or the console.',
  },
  {
    step: '03',
    icon: ScanEye,
    title: 'Launch & record',
    description:
      'One-click, credential-free sessions launch through the Bismarck gateway. Every keystroke and frame is recorded and indexed without touching the workflow of the user.',
  },
  {
    step: '04',
    icon: Fingerprint,
    title: 'Audit & improve',
    description:
      'Access expires automatically. Sessions land in the immutable audit lake, compliance reports generate themselves, and threat analytics tighten your policies week over week.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="lnd-section lnd-section-gradient">
      <div className="lnd-container">
        <SectionHeading
          eyebrow="Workflow"
          title="From vault to audit trail in four steps"
          description="A zero-friction access lifecycle that keeps engineers fast and auditors happier."
        />
        <ol className="lnd-steps-grid">
          {STEPS.map((s, i) => (
            <Reveal key={s.step} as="li" delay={i * 90} className="lnd-step-card">
              <div className="lnd-step-top">
                <span className="lnd-step-icon">
                  <s.icon size={22} />
                </span>
                <span className="lnd-step-num">{s.step}</span>
              </div>
              <h3 className="lnd-step-title">{s.title}</h3>
              <p className="lnd-step-desc">{s.description}</p>
              {i < STEPS.length - 1 && (
                <ArrowRight size={20} className="lnd-step-arrow" aria-hidden="true" />
              )}
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Security & compliance                                               */
/* ------------------------------------------------------------------ */

const SECURITY_POINTS = [
  {
    title: 'FIPS 140-2 validated cryptography',
    description:
      'AES-256-GCM at rest, TLS 1.3 in transit, hardware-backed key storage with optional HSM integration.',
  },
  {
    title: 'Zero-trust by default',
    description:
      'No standing privileges, no shared admin accounts. Every action is identity-bound, time-boxed, and fully attributed.',
  },
  {
    title: 'Immutable audit lake',
    description:
      'Write-once audit storage with cryptographic chaining — any tampering attempt is detectable and provable.',
  },
  {
    title: 'Air-gapped deployment options',
    description:
      'Run in your data center, your VPC, or fully air-gapped. Bismarck never requires outbound connectivity.',
  },
];

const COMPLIANCE = ['SOC 2 Type II', 'ISO 27001', 'PCI-DSS v4.0', 'HIPAA', 'GDPR', 'DORA'];

export function Security() {
  return (
    <section id="security" className="lnd-section">
      <div className="lnd-container">
        <div className="lnd-security-grid">
          <Reveal>
            <span className="lnd-eyebrow">Security &amp; Compliance</span>
            <h2 className="lnd-security-title">
              Built for regulators.
              <br />
              <span className="lnd-gradient-text">Trusted by auditors.</span>
            </h2>
            <p className="lnd-security-copy">
              Bismarck was designed from day one for the strictest regulated environments — banking,
              healthcare, and critical infrastructure. Cryptographic integrity, least-privilege
              enforcement, and examiner-ready evidence are not add-ons; they are the architecture.
            </p>
            <div className="lnd-compliance-row">
              {COMPLIANCE.map((c) => (
                <span key={c} className="lnd-chip">
                  {c}
                </span>
              ))}
            </div>
          </Reveal>

          <div className="lnd-security-cards">
            {SECURITY_POINTS.map((p, i) => (
              <Reveal key={p.title} delay={i * 80} className="lnd-security-card">
                <ShieldCheck size={24} />
                <h3>{p.title}</h3>
                <p>{p.description}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ — hand-rolled accordion (no external deps)                      */
/* ------------------------------------------------------------------ */

const FAQS = [
  {
    q: 'How is Bismarck deployed?',
    a: 'Bismarck ships as a hardened virtual appliance or Kubernetes deployment that runs entirely in your environment — on-premises, in your VPC, or air-gapped. No privileged credential or session recording ever leaves your infrastructure.',
  },
  {
    q: 'Will it slow my engineers down?',
    a: 'No. Engineers keep their normal SSH, RDP, and web workflows — Bismarck sits transparently as a broker. Just-in-time elevation is typically approved in under two minutes, and break-glass paths guarantee emergency access within seconds.',
  },
  {
    q: 'Which targets and protocols are supported?',
    a: 'Out of the box: SSH, RDP, HTTPS web consoles (AWS, Azure, GCP, and any SaaS admin UI), databases (PostgreSQL, MySQL, Oracle, SQL Server, MongoDB), Kubernetes, and network devices via SSH/Telnet. An SDK covers custom targets.',
  },
  {
    q: 'How long does rollout take?',
    a: 'Most teams vault their first 100 accounts within a day using discovery and import wizards. Full production rollout with approval workflows typically completes in 2–4 weeks, guided by our onboarding engineers.',
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="lnd-section lnd-section-tinted">
      <div className="lnd-container">
        <SectionHeading
          eyebrow="FAQ"
          title="Questions, answered"
          description="The things security teams ask us most before rolling out Bismarck."
        />
        <Reveal>
          <div className="lnd-faq-list">
            {FAQS.map((f, i) => {
              const open = openIndex === i;
              return (
                <div key={f.q} className="lnd-faq-item">
                  <button
                    type="button"
                    className="lnd-faq-trigger"
                    aria-expanded={open}
                    aria-controls={`faq-panel-${i}`}
                    onClick={() => setOpenIndex(open ? null : i)}
                  >
                    {f.q}
                    <ChevronDown size={18} />
                  </button>
                  <div
                    id={`faq-panel-${i}`}
                    className={['lnd-faq-panel', open ? 'is-open' : ''].filter(Boolean).join(' ')}
                    role="region"
                  >
                    <div className="lnd-faq-panel-inner">
                      <p>{f.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* CTA                                                                 */
/* ------------------------------------------------------------------ */

interface CtaProps {
  onGetStarted: () => void;
  onRequestAccess: () => void;
}

export function CtaSection({ onGetStarted, onRequestAccess }: CtaProps) {
  return (
    <section className="lnd-cta-wrap">
      <div className="lnd-container">
        <Reveal className="lnd-cta">
          <div className="lnd-grid-pattern" aria-hidden="true" />
          <div className="lnd-cta-blob a" aria-hidden="true" />
          <div className="lnd-cta-blob b" aria-hidden="true" />
          <div className="lnd-cta-inner">
            <h2 className="lnd-cta-title">Take command of your privileged access</h2>
            <p className="lnd-cta-sub">
              Start a guided pilot with your own infrastructure, or request a sandbox tenant and see
              every session recorded within the hour.
            </p>
            <div className="lnd-cta-actions">
              <button
                type="button"
                onClick={onGetStarted}
                className="lnd-btn lnd-btn-white lnd-btn-lg"
              >
                Sign in to Console
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={onRequestAccess}
                className="lnd-btn lnd-btn-ghost-white lnd-btn-lg"
              >
                Request Access
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
