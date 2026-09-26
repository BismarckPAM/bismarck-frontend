import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, LogIn, Ticket } from 'lucide-react';
import { BismarckLogo } from './Logo';
import { cn } from '@/lib/cn';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Security', href: '#security' },
  { label: 'FAQ', href: '#faq' },
];

interface NavbarProps {
  onRaiseTicket: () => void;
  /** Lenis-powered anchor scroll provided by LandingPage (falls back to native). */
  onScrollTo: (target: string | number) => void;
}

export function Navbar({ onRaiseTicket, onScrollTo }: NavbarProps) {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (href: string) => {
    setMobileOpen(false);
    onScrollTo(href);
  };

  const goLogin = () => {
    setMobileOpen(false);
    navigate('/login');
  };

  const openTicket = () => {
    setMobileOpen(false);
    onRaiseTicket();
  };

  return (
    <header className={cn('lnd-navbar', scrolled && 'is-scrolled')}>
      <div className="lnd-container">
        <nav aria-label="Main">
          <button
            type="button"
            onClick={() => onScrollTo(0)}
            className="lnd-brand"
            aria-label="Bismarck home"
          >
            <BismarckLogo />
          </button>

          {/* Desktop links */}
          <div className="lnd-nav-links">
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                type="button"
                onClick={() => scrollTo(link.href)}
                className="lnd-nav-link"
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="lnd-nav-actions">
            <button type="button" onClick={goLogin} className="lnd-btn lnd-btn-outline">
              <LogIn size={16} />
              Login
            </button>
            <button type="button" onClick={openTicket} className="lnd-btn lnd-btn-primary">
              <Ticket size={16} />
              Raise a Ticket
            </button>
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            className="lnd-nav-burger"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>
      </div>

      {/* Mobile menu */}
      <div className={cn('lnd-mobile-menu', mobileOpen && 'is-open')}>
        <div className="lnd-container" style={{ display: 'flex', flexDirection: 'column' }}>
          {NAV_LINKS.map((link) => (
            <button
              key={link.href}
              type="button"
              onClick={() => scrollTo(link.href)}
              className="lnd-mobile-link"
            >
              {link.label}
            </button>
          ))}
          <div className="lnd-mobile-actions">
            <button type="button" onClick={goLogin} className="lnd-btn lnd-btn-outline">
              <LogIn size={16} /> Login
            </button>
            <button type="button" onClick={openTicket} className="lnd-btn lnd-btn-primary">
              <Ticket size={16} /> Raise a Ticket
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
