import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  MessageSquareText,
  QrCode,
  Quote,
  Sparkles,
  Workflow,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import LandingJourneySection from '../components/LandingJourneySection';
import TaxPingLogo from '../components/TaxPingLogo';
import {
  LANDING_TRY_SMS_PHONE,
  buildSmsHref,
  buildQrImageUrl,
} from '../utils/publicIntake';
import '../components/TaxPingLogo.css';
import './LandingPage.css';

type Testimonial = {
  firm: string;
  name: string;
  quote: string;
  avatarUrl: string;
};

type CalendlyWindow = Window & typeof globalThis & {
  Calendly?: {
    initInlineWidget: (options: {
      url: string;
      parentElement: HTMLElement;
    }) => void;
    initPopupWidget: (options: {
      url: string;
    }) => void;
  };
};

const PRINCIPLES = [
  {
    step: '01',
    kicker: 'Start',
    icon: QrCode,
    title: 'Start by text',
    body: 'One link or QR code gets the client into the right thread. No portal or app.',
  },
  {
    step: '02',
    kicker: 'Confirm',
    icon: MessageSquareText,
    title: 'Confirm each file',
    body: 'TaxPing names what arrived, so the client knows the upload worked right away.',
  },
  {
    step: '03',
    kicker: 'Close',
    icon: Workflow,
    title: 'Ask only for the gap',
    body: 'The thread stays focused on the next missing item until the file is ready for prep.',
  },
];

const TESTIMONIALS: Testimonial[] = [
  {
    firm: 'Harbor Oak Tax Advisors',
    name: 'Maya Patel',
    quote: 'Clients reply faster because it feels like a normal text, not another login.',
    avatarUrl: 'https://randomuser.me/api/portraits/women/68.jpg',
  },
  {
    firm: 'Cedar Street Tax & Bookkeeping',
    name: 'Jason Romero',
    quote: 'We spend less time chasing documents and more time actually preparing returns.',
    avatarUrl: 'https://randomuser.me/api/portraits/men/41.jpg',
  },
  {
    firm: 'Bright Ledger Tax Co.',
    name: 'Elena Brooks',
    quote: 'The reminders are simple, polite, and they keep files moving without staff follow-up.',
    avatarUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
  },
  {
    firm: 'Pine Street Tax Group',
    name: 'Noah Bennett',
    quote: 'It is easier for our office to see what is missing and what is ready.',
    avatarUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
  },
  {
    firm: 'Northline Tax Studio',
    name: 'Sofia Nguyen',
    quote: 'Clients understand what to do right away, so onboarding feels much smoother.',
    avatarUrl: 'https://randomuser.me/api/portraits/women/26.jpg',
  },
  {
    firm: 'Westfield Tax & Payroll',
    name: 'Marcus Allen',
    quote: 'The text flow feels simple for clients and organized for our team.',
    avatarUrl: 'https://randomuser.me/api/portraits/men/54.jpg',
  },
];

const CONTACT_CTA_URL = 'https://calendly.com/sushantchhetry-iwvx/30min?hide_event_type_details=1&hide_gdpr_banner=1&primary_color=4b84d5';
const CONTACT_CTA_EMAIL = 'pilot@taxping.ai';
const CALENDLY_SCRIPT_SRC = 'https://assets.calendly.com/assets/external/widget.js';
const CALENDLY_STYLE_HREF = 'https://assets.calendly.com/assets/external/widget.css';

function HeroWorkflowStage() {
  const threadMessages = [
    {
      side: 'brand' as const,
      text: "Hi Maria. Send your W-2, 1099-INT, and 2024 return here.",
    },
    {
      side: 'client' as const,
      text: 'Uploading the first two now.',
      attachments: ['W-2.jpg', '1099-INT.pdf'],
    },
    {
      side: 'brand' as const,
      text: 'Got them. I still need your 2024 return.',
    },
  ];

  return (
    <div className="lp-hero-phone-frame" aria-label="iPhone mockup showing the TaxPing text exchange">
      <div className="lp-hero-phone-notch" aria-hidden="true" />

      <div className="lp-hero-phone-screen">
        <div className="lp-hero-phone-status" aria-hidden="true">
          <span>9:41</span>
          <span>5G</span>
        </div>

        <div className="lp-hero-phone-topbar">
          <div className="lp-hero-phone-contact">
            <span className="lp-hero-phone-contact-avatar">T</span>
            <div>
              <strong>TaxPing</strong>
              <span>iMessage</span>
            </div>
          </div>
        </div>

        <div className="lp-hero-thread" aria-label="TaxPing text exchange">
          {threadMessages.map((message, index) => (
            <div
              key={`${message.side}-${index}-${message.text}`}
              className={`lp-hero-thread-row ${message.side === 'client' ? 'lp-hero-thread-row-client' : ''}`}
              style={{ animationDelay: `${140 + index * 120}ms` }}
            >
              <div
                className={[
                  'lp-hero-thread-bubble',
                  message.side === 'client'
                    ? 'lp-hero-thread-bubble-client'
                    : 'lp-hero-thread-bubble-brand',
                ].join(' ').trim()}
              >
                <span>{message.text}</span>

                {message.attachments?.length ? (
                  <div className="lp-hero-thread-attachments">
                    {message.attachments.map((attachment) => (
                      <span key={attachment} className="lp-hero-thread-attachment">
                        {attachment}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="lp-hero-phone-composer" aria-hidden="true">
          <div className="lp-hero-phone-composer-input">iMessage</div>
          <div className="lp-hero-phone-composer-send">Send</div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [showTalkFloat, setShowTalkFloat] = useState(false);
  const [ctaInView, setCtaInView] = useState(false);
  const calendlyRef = useRef<HTMLDivElement | null>(null);
  const ctaSectionRef = useRef<HTMLElement | null>(null);
  const landingTryTextPath = '/landing/try-text';
  const landingTryQrUrl = buildQrImageUrl(buildSmsHref(LANDING_TRY_SMS_PHONE, ''), 480);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-lp-reveal]'));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('lp-visible');
          }
        });
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const updateTalkFloat = () => {
      const shouldShow = window.scrollY > 420;
      setShowTalkFloat((current) => (current === shouldShow ? current : shouldShow));
    };

    updateTalkFloat();
    window.addEventListener('scroll', updateTalkFloat, { passive: true });

    return () => {
      window.removeEventListener('scroll', updateTalkFloat);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !ctaSectionRef.current) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setCtaInView(entry.isIntersecting);
      },
      { threshold: 0.2 }
    );

    observer.observe(ctaSectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const calendlyWindow = window as CalendlyWindow;
    const existingStyle = document.querySelector<HTMLLinkElement>(`link[href="${CALENDLY_STYLE_HREF}"]`);
    const style = existingStyle ?? document.createElement('link');

    if (!existingStyle) {
      style.rel = 'stylesheet';
      style.href = CALENDLY_STYLE_HREF;
      document.head.appendChild(style);
    }

    const initializeCalendly = () => {
      const parentElement = calendlyRef.current;
      if (!parentElement || !calendlyWindow.Calendly?.initInlineWidget) {
        return;
      }

      parentElement.replaceChildren();
      calendlyWindow.Calendly.initInlineWidget({
        url: CONTACT_CTA_URL,
        parentElement,
      });
    };

    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${CALENDLY_SCRIPT_SRC}"]`);
    const script = existingScript ?? document.createElement('script');

    if (!existingScript) {
      script.src = CALENDLY_SCRIPT_SRC;
      script.async = true;
      document.body.appendChild(script);
    }

    if (calendlyWindow.Calendly?.initInlineWidget) {
      initializeCalendly();
      return undefined;
    }

    script.addEventListener('load', initializeCalendly);

    return () => {
      script.removeEventListener('load', initializeCalendly);
    };
  }, []);

  const openCalendlyPopup = () => {
    if (typeof window === 'undefined') {
      return;
    }

    const calendlyWindow = window as CalendlyWindow;
    if (calendlyWindow.Calendly?.initPopupWidget) {
      calendlyWindow.Calendly.initPopupWidget({ url: CONTACT_CTA_URL });
      return;
    }

    window.open(CONTACT_CTA_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="lp-shell">
      <div className="lp-grid" aria-hidden="true" />
      <div className="lp-orb lp-orb-left" aria-hidden="true" />
      <div className="lp-orb lp-orb-right" aria-hidden="true" />

      <header className="lp-header lp-load-in lp-load-delay-1">
        <Link to="/landing" className="lp-brand" aria-label="TaxPing landing page">
          <TaxPingLogo size="xxxl" className="lp-brand-mark" />
        </Link>

        <div className="lp-header-actions">
          <button type="button" className="lp-header-talk-button" onClick={openCalendlyPopup}>
            Let&apos;s talk
          </button>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-hero-copy lp-load-in lp-load-delay-2">
            <div className="lp-eyebrow">
              <Sparkles size={14} />
              Collect tax files by text
            </div>

            <h1>
              <span className="lp-hero-message-stack">
                <span className="lp-hero-message-row lp-hero-message-row-client">
                  <span className="lp-hero-message-bubble lp-hero-message-bubble-client">Your clients text.</span>
                </span>
                <span className="lp-hero-message-row lp-hero-message-row-brand">
                  <span className="lp-hero-message-bubble lp-hero-message-bubble-brand">TaxPing collects.</span>
                </span>
                <span className="lp-hero-message-row lp-hero-message-row-client">
                  <span className="lp-hero-message-bubble lp-hero-message-bubble-client">Your client asks.</span>
                </span>
                <span className="lp-hero-message-row lp-hero-message-row-brand">
                  <span className="lp-hero-message-bubble lp-hero-message-bubble-brand">TaxPing answers.</span>
                </span>
              </span>
            </h1>

            <p className="lp-hero-lead">
              Clients text like they normally do. TaxPing asks for what is missing, follows up for you, and keeps each file moving.
            </p>

          </div>

          <div className="lp-hero-stage lp-load-in lp-load-delay-3">
            <HeroWorkflowStage />
          </div>
        </section>

        <section id="product" className="lp-section lp-how-section">
          <div className="lp-how-shell">
            <div className="lp-section-heading">
              <div className="lp-eyebrow">How it works</div>
              <h2>See the flow in one glance.</h2>
              <p>
                Clients start by text. TaxPing confirms what arrived, asks for what is missing, and closes the loop.
              </p>
            </div>

            <div className="lp-principles-grid">
              {PRINCIPLES.map((principle) => {
                const Icon = principle.icon;

                return (
                  <article
                    key={principle.title}
                    className="lp-principle-card"
                  >
                    <div className="lp-principle-top">
                      <div className="lp-principle-icon">
                        <Icon size={20} />
                      </div>
                      <span className="lp-principle-step">{principle.step}</span>
                    </div>
                    <div className="lp-principle-kicker">{principle.kicker}</div>
                    <h3>{principle.title}</h3>
                    <p>{principle.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <LandingJourneySection />

        <section className="lp-section">
          <div className="lp-try-panel lp-reveal" data-lp-reveal>
            <div className="lp-try-copy">
              <div className="lp-eyebrow">Try it yourself</div>
              <h2>Try the text flow on your phone.</h2>
              <p>Scan once and open the same kind of text handoff your clients would see when they start.</p>

              <div className="lp-try-steps">
                <div className="lp-try-step">
                  <span className="lp-try-step-number">1</span>
                  <div>
                    <strong>Scan on your phone</strong>
                    <p>Point your camera at the code and tap the link.</p>
                  </div>
                </div>

                <div className="lp-try-step">
                  <span className="lp-try-step-number">2</span>
                  <div>
                    <strong>Open the sample text</strong>
                    <p>Your phone jumps straight into the message flow.</p>
                  </div>
                </div>

                <div className="lp-try-step">
                  <span className="lp-try-step-number">3</span>
                  <div>
                    <strong>Follow the intake</strong>
                    <p>See how TaxPing moves the file from first reply to ready.</p>
                  </div>
                </div>
              </div>

              <div className="lp-try-note">Best on your phone. Opens in iPhone and Android texting apps.</div>
            </div>

            <Link to={landingTryTextPath} className="lp-try-qr-card" aria-label="Open the TaxPing text demo">
              <div className="lp-try-qr-header">
                <div className="lp-try-qr-kicker">Phone demo</div>
                <strong>Scan to try it</strong>
              </div>

              <div className="lp-try-qr-frame">
                {landingTryQrUrl ? (
                  <img
                    src={landingTryQrUrl}
                    alt="Scan to open the TaxPing text demo"
                    className="lp-try-qr-image"
                    loading="lazy"
                  />
                ) : null}
              </div>
              <div className="lp-try-qr-caption">
                <QrCode size={16} />
                Point your camera here
              </div>
            </Link>
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-testimonials-intro lp-reveal" data-lp-reveal>
            <div className="lp-eyebrow">What are users saying</div>
            <h2>Hear from our users.</h2>
            <p>These are the kinds of comments we hear from teams using TaxPing.</p>
          </div>

          <div className="lp-testimonials-grid">
            {TESTIMONIALS.map((testimonial) => (
              <article
                key={`${testimonial.firm}-${testimonial.name}`}
                className="lp-testimonial-card"
              >
                <img
                  src={testimonial.avatarUrl}
                  alt={`${testimonial.name} from ${testimonial.firm}`}
                  className="lp-testimonial-avatar"
                  loading="lazy"
                />
                <strong className="lp-testimonial-firm">{testimonial.firm}</strong>
                <div className="lp-testimonial-name">{testimonial.name}</div>
                <p className="lp-testimonial-quote">{testimonial.quote}</p>
                <Quote size={24} className="lp-testimonial-quote-mark" aria-hidden="true" />
              </article>
            ))}
          </div>
        </section>

        <section className="lp-section" ref={ctaSectionRef}>
          <div className="lp-cta-panel">
            <div className="lp-cta-copy">
              <div className="lp-eyebrow">Quick onboarding</div>
              <h2>Book a short call and get TaxPing live fast.</h2>
              <p>We will set up the core flow with you, answer your questions, and make sure you leave with a working client intake path.</p>

              <div className="lp-cta-points">
                <div className="lp-cta-point">
                  <CheckCircle2 size={16} />
                  We set up your branding and first message with you
                </div>
                <div className="lp-cta-point">
                  <CheckCircle2 size={16} />
                  We keep the onboarding simple and focused
                </div>
                <div className="lp-cta-point">
                  <CheckCircle2 size={16} />
                  You leave with a live signup link and QR code
                </div>
              </div>

              <div className="lp-cta-note">
                Questions before booking? <a href={`mailto:${CONTACT_CTA_EMAIL}`}>Contact us by email</a>.
              </div>
            </div>

            <div className="lp-cta-booking">
              <div className="lp-cta-booking-header">
                <div className="lp-cta-booking-kicker">Book time</div>
                <strong>Pick a time that works for you.</strong>
              </div>

              <div className="lp-calendly-shell">
                <div ref={calendlyRef} className="lp-calendly-widget" aria-label="Calendly booking widget" />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-footer-panel">
          <div className="lp-footer-brand">
            <TaxPingLogo size="xxl" className="lp-footer-logo" />
            <p>Text-first document collection for tax firms.</p>
          </div>

          <div className="lp-footer-links">
            <div className="lp-footer-column">
              <span>Product</span>
              <a href="#product">How it works</a>
              <a href="#journey">See the steps</a>
            </div>

            <div className="lp-footer-column">
              <span>Demo</span>
              <Link to="/public/demo/signup">Open demo</Link>
              <Link to="/public/demo/connect">Text demo</Link>
            </div>

            <div className="lp-footer-column">
              <span>Try it</span>
              <Link to="/landing/try-text">Send a text</Link>
              <Link to="/public/demo/qr">Open QR demo</Link>
            </div>
          </div>
        </div>

        <div className="lp-footer-bottom">
          <span>© {new Date().getFullYear()} TaxPing</span>
          <span>Built for firms that want faster replies.</span>
        </div>
      </footer>

      <button
        type="button"
        className={`lp-talk-float ${showTalkFloat && !ctaInView ? 'lp-talk-float-visible' : ''}`}
        onClick={openCalendlyPopup}
        aria-label="Open the Calendly booking popup"
      >
        Let&apos;s talk
      </button>
    </div>
  );
}
