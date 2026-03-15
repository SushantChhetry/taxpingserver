import { useEffect, useRef, useState } from 'react';

type JourneyMessage = {
  side: 'brand' | 'client';
  text: string;
  attachments?: string[];
};

type JourneyStep = {
  label: string;
  kicker: string;
  title: string;
  body: string;
  detail: string;
  messages: JourneyMessage[];
};

const JOURNEY_STEPS: JourneyStep[] = [
  {
    label: '01',
    kicker: 'Start',
    title: 'Client opens one text thread.',
    body: 'One message starts intake. TaxPing answers with the first short checklist.',
    detail: 'No login and no handoff. The whole intake stays in one thread.',
    messages: [
      { side: 'client', text: "Hi TaxPing, I'm ready to do my taxes." },
      {
        side: 'brand',
        text: "You're in. Send your W-2, photo ID, and last year's return here.",
      },
    ],
  },
  {
    label: '02',
    kicker: 'Confirm',
    title: 'TaxPing confirms each file.',
    body: 'The client sends the first batch. TaxPing says exactly what it found.',
    detail: 'Clients know it worked. Staff do not have to manually check the first upload.',
    messages: [
      {
        side: 'client',
        text: 'Sent the first batch.',
        attachments: ['W-2.pdf', 'Photo-ID.jpg', '1099-INT.pdf'],
      },
      {
        side: 'brand',
        text: 'Got them: W-2, ID, and 1099-INT.',
      },
    ],
  },
  {
    label: '03',
    kicker: 'Narrow',
    title: 'Only the missing item stays open.',
    body: 'The thread narrows to one missing document and one short question.',
    detail: 'No giant checklist. Just the next blocker holding up prep.',
    messages: [
      {
        side: 'brand',
        text: "I still need last year's return. One quick question: did you move states in 2025?",
      },
      {
        side: 'client',
        text: "Yes. Georgia to Alabama in June. Sending it now.",
      },
    ],
  },
  {
    label: '04',
    kicker: 'Finish',
    title: 'Reminders close the file.',
    body: 'If the client pauses, TaxPing follows up and marks the file ready when the last form arrives.',
    detail: 'The handoff is clear: complete, confirmed, and ready for prep.',
    messages: [
      {
        side: 'brand',
        text: "Quick reminder: I'm still waiting on your 1095-A.",
      },
      {
        side: 'client',
        text: 'Found it. Sending now.',
        attachments: ['1095-A.pdf'],
      },
      {
        side: 'brand',
        text: 'Perfect. Your file is complete and ready for prep.',
      },
    ],
  },
];

const JOURNEY_FOCUS_LINE_RATIO = 0.36;
const JOURNEY_FOCUS_LINE_MIN = 140;
const JOURNEY_FOCUS_LINE_MAX = 320;
const JOURNEY_FINAL_STEP_BUFFER = 120;
const JOURNEY_MOBILE_BREAKPOINT = 900;

const getJourneyFocusLine = (viewportHeight: number) =>
  Math.min(JOURNEY_FOCUS_LINE_MAX, Math.max(JOURNEY_FOCUS_LINE_MIN, viewportHeight * JOURNEY_FOCUS_LINE_RATIO));

function JourneyPreviewBody({ step }: { step: JourneyStep }) {
  return (
    <>
      <div className="lp-journey-preview-copy">
        <span className="lp-stage-kicker">
          Step {step.label} · {step.kicker}
        </span>
        <strong>{step.title}</strong>
        <span className="lp-journey-preview-note-label">Why it matters</span>
        <p>{step.detail}</p>
      </div>

      <div className="lp-journey-phone-panel">
        <div className="lp-journey-phone-header">
          <span className="lp-journey-phone-stage">Client view</span>
          <strong>{step.kicker}</strong>
        </div>

        <div className="lp-journey-phone-frame" aria-label="iPhone text thread showing the TaxPing intake flow">
          <div className="lp-journey-phone-notch" aria-hidden="true" />

          <div className="lp-journey-phone-screen">
            <div className="lp-journey-phone-status" aria-hidden="true">
              <span>9:41</span>
              <span>5G</span>
            </div>

            <div className="lp-journey-phone-topbar">
              <div className="lp-journey-phone-avatar">T</div>
              <div>
                <div className="lp-journey-phone-name">TaxPing</div>
                <div className="lp-journey-phone-label">iMessage</div>
              </div>
            </div>

            <div key={step.label} className="lp-journey-thread">
              {step.messages.map((message, index) => (
                <div
                  key={`${message.side}-${index}-${message.text}`}
                  className={`lp-journey-thread-row ${message.side === 'client' ? 'lp-journey-thread-row-client' : ''}`}
                  style={{ animationDelay: `${120 + index * 90}ms` }}
                >
                  <div
                    className={`lp-journey-thread-bubble ${message.side === 'client' ? 'lp-journey-thread-bubble-client' : 'lp-journey-thread-bubble-brand'}`}
                  >
                    <span>{message.text}</span>

                    {message.attachments?.length ? (
                      <div className="lp-journey-attachments">
                        {message.attachments.map((attachment) => (
                          <div key={attachment} className="lp-journey-attachment-chip">
                            {attachment}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="lp-journey-composer" aria-hidden="true">
              <div className="lp-journey-composer-input">iMessage</div>
              <div className="lp-journey-composer-send">Send</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function LandingJourneySection() {
  const [activeStep, setActiveStep] = useState(0);
  const sectionRef = useRef<HTMLElement | null>(null);
  const stepRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const summaryRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const mobilePreviewRef = useRef<HTMLElement | null>(null);
  const currentStep = JOURNEY_STEPS[activeStep];

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    let frame = 0;

    const updateActiveStep = () => {
      const focusLine = getJourneyFocusLine(window.innerHeight);
      const nodes = stepRefs.current.filter((node): node is HTMLButtonElement => node !== null);

      if (!nodes.length) {
        return;
      }

      const sectionBottom = sectionRef.current?.getBoundingClientRect().bottom ?? Number.POSITIVE_INFINITY;
      let nextStep = 0;

      for (let index = 0; index < nodes.length; index += 1) {
        const rect = nodes[index].getBoundingClientRect();
        if (rect.top <= focusLine) {
          nextStep = index;
          continue;
        }

        break;
      }

      if (sectionBottom <= focusLine + JOURNEY_FINAL_STEP_BUFFER) {
        nextStep = nodes.length - 1;
      }

      setActiveStep((current) => (current === nextStep ? current : nextStep));
    };

    const requestUpdate = () => {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateActiveStep();
      });
    };

    requestUpdate();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth > 640) {
      return;
    }

    summaryRefs.current[activeStep]?.scrollIntoView({
      block: 'nearest',
      inline: 'center',
    });
  }, [activeStep]);

  const scrollToJourneyStep = (stepIndex: number, source: 'summary' | 'step') => {
    const target = stepRefs.current[stepIndex];
    if (!target || typeof window === 'undefined') {
      return;
    }

    setActiveStep(stepIndex);

    if (window.innerWidth <= JOURNEY_MOBILE_BREAKPOINT) {
      if (source === 'summary') {
        target.scrollIntoView({
          block: 'start',
          behavior: 'smooth',
        });
      } else {
        window.requestAnimationFrame(() => {
          mobilePreviewRef.current?.scrollIntoView({
            block: 'start',
            behavior: 'smooth',
          });
        });
      }

      return;
    }

    const focusLine = getJourneyFocusLine(window.innerHeight);
    const targetTop = window.scrollY + target.getBoundingClientRect().top - focusLine;
    const maxScrollTop = document.documentElement.scrollHeight - window.innerHeight;

    window.scrollTo({
      top: Math.max(0, Math.min(targetTop, maxScrollTop)),
      behavior: 'smooth',
    });
  };

  return (
    <section id="journey" ref={sectionRef} className="lp-journey-wrap">
      <div className="lp-section lp-journey-shell">
        <div className="lp-journey-head">
          <div className="lp-eyebrow">From first text to ready file</div>
          <h2>Four quick steps. One clear thread.</h2>
          <p>Tap a step or scroll. The preview stays locked to the exact exchange on the right.</p>
        </div>

        <div className="lp-journey-summary" aria-label="Journey summary">
          {JOURNEY_STEPS.map((step, index) => (
            <button
              key={`${step.label}-summary`}
              type="button"
              ref={(node) => {
                summaryRefs.current[index] = node;
              }}
              className={`lp-journey-summary-pill ${activeStep === index ? 'lp-journey-summary-pill-active' : ''}`}
              onClick={() => scrollToJourneyStep(index, 'summary')}
            >
              <span className="lp-journey-summary-index">{step.label}</span>
              <span className="lp-journey-summary-title">{step.kicker}</span>
            </button>
          ))}
        </div>

        <div className="lp-journey-story">
          <div className="lp-journey-steps" aria-label="TaxPing journey steps">
            {JOURNEY_STEPS.map((step, index) => (
              <button
                key={step.label}
                ref={(node) => {
                  stepRefs.current[index] = node;
                }}
                type="button"
                aria-current={activeStep === index ? 'step' : undefined}
                className={`lp-journey-step ${activeStep === index ? 'lp-journey-step-active' : ''} ${index < activeStep ? 'lp-journey-step-complete' : ''}`}
                onClick={() => scrollToJourneyStep(index, 'step')}
              >
                <div className="lp-journey-step-meta">
                  <span className="lp-journey-step-index">{step.label}</span>
                  <span className="lp-journey-step-kicker">{step.kicker}</span>
                </div>
                <strong>{step.title}</strong>
                <p>{step.body}</p>
              </button>
            ))}
          </div>

          <aside className="lp-journey-preview lp-journey-preview-desktop">
            <JourneyPreviewBody step={currentStep} />
          </aside>

          <aside ref={mobilePreviewRef} className="lp-journey-preview-mobile">
            <JourneyPreviewBody step={currentStep} />
          </aside>
        </div>
      </div>
    </section>
  );
}
