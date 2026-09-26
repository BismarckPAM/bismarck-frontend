import { BismarckLogo } from './Logo';

const FOOTER_COLS = [
  {
    title: 'Product',
    links: [
      'Credential Vaulting',
      'Session Recording',
      'Just-in-Time Access',
      'Approval Workflows',
      'Threat Analytics',
    ],
  },
  {
    title: 'Solutions',
    links: [
      'Financial Services',
      'Healthcare',
      'Public Sector',
      'Critical Infrastructure',
      'Cloud-Native Teams',
    ],
  },
  {
    title: 'Resources',
    links: ['Documentation', 'API Reference', 'Deployment Guide', 'Compliance Center', 'Changelog'],
  },
  {
    title: 'Company',
    links: ['About', 'Security', 'Trust Center', 'Careers', 'Contact'],
  },
];

export function Footer() {
  return (
    <footer className="lnd-footer">
      <div className="lnd-container">
        <div className="lnd-footer-grid">
          <div className="lnd-footer-about">
            <BismarckLogo />
            <p className="lnd-footer-blurb">
              Enterprise privileged access management. Vault every secret, record every session, and
              prove compliance — without slowing your engineers down.
            </p>
            <p className="lnd-footer-copy">
              © {new Date().getFullYear()} Bismarck Security, Inc.
              <br />
              All rights reserved.
            </p>
          </div>
          {FOOTER_COLS.map((col) => (
            <nav key={col.title} aria-label={col.title} className="lnd-footer-col">
              <h3>{col.title}</h3>
              <ul>
                {col.links.map((link) => (
                  <li key={link}>
                    <span tabIndex={0}>{link}</span>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="lnd-footer-bottom">
          <p>SOC 2 Type II · ISO 27001 · GDPR · DORA ready</p>
          <div className="lnd-footer-legal">
            <span tabIndex={0}>Privacy Policy</span>
            <span tabIndex={0}>Terms of Service</span>
            <span tabIndex={0}>Cookie Settings</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
