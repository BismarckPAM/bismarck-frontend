import { useCallback, useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { useNavigate } from 'react-router-dom';
import './landing.css';

import { Navbar } from './Navbar';
import { Hero } from './Hero';
import { IntegrationsStrip, Features, HowItWorks, Security, Faq, CtaSection } from './Sections';
import { Footer } from './Footer';
import { TicketDialog } from './TicketDialog';

/**
 * Public marketing landing page (route: "/").
 *
 * Completely self-contained: styles are scoped under `.lnd-` (landing.css),
 * Lenis smooth scrolling is instantiated here and DESTROYED on unmount so
 * the authenticated console (AppLayout + pages) keeps native scrolling and
 * its own dark design system untouched.
 *
 * "Login" routes to the real /login page (AuthContext flow).
 * "Raise a Ticket" opens a portal dialog that posts to the public tickets
 * endpoint (src/api/tickets.ts).
 */
export function LandingPage() {
  const navigate = useNavigate();
  const lenisRef = useRef<Lenis | null>(null);
  const [ticketOpen, setTicketOpen] = useState(false);

  // Scoped Lenis smooth scrolling — only while the landing page is mounted.
  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.09,
      duration: 1.15,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    lenisRef.current = lenis;

    let rafId = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const scrollTo = useCallback((target: string | number) => {
    const lenis = lenisRef.current;
    if (lenis) {
      lenis.scrollTo(target, { offset: typeof target === 'string' ? -72 : 0, duration: 1.4 });
    } else if (typeof target === 'number') {
      window.scrollTo({ top: target, behavior: 'smooth' });
    } else {
      document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handleScrollLock = useCallback((locked: boolean) => {
    const lenis = lenisRef.current;
    if (locked) {
      lenis?.stop();
      document.body.style.overflow = 'hidden';
    } else {
      lenis?.start();
      document.body.style.overflow = '';
    }
  }, []);

  const goLogin = useCallback(() => navigate('/login'), [navigate]);

  return (
    <div className="lnd-page">
      <Navbar onRaiseTicket={() => setTicketOpen(true)} onScrollTo={scrollTo} />

      <main>
        <Hero onGetStarted={goLogin} onRequestAccess={() => setTicketOpen(true)} />
        <IntegrationsStrip />
        <Features />
        <HowItWorks />
        <Security />
        <Faq />
        <CtaSection onGetStarted={goLogin} onRequestAccess={() => setTicketOpen(true)} />
      </main>

      <Footer />

      <TicketDialog
        open={ticketOpen}
        onClose={() => setTicketOpen(false)}
        onScrollLockChange={handleScrollLock}
      />
    </div>
  );
}

export default LandingPage;
