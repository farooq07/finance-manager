import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { animate, stagger, createTimeline } from 'animejs';
import {
  ArrowUpRight, ArrowRight, MoveRight, TrendingUp, Sparkles,
  ShieldCheck, FileText, MessageSquareText, Lock, Fingerprint,
  ArrowDownRight, Circle
} from 'lucide-react';
import logosm from '../assets/logosm.svg';

/* ─────────────────────────────────────────────────────────────────
   FSWealth Axis — Landing Page
   Design direction: editorial, asymmetric, financial-publication.
   Avoid: centered SaaS hero, purple gradients, generic feature grid.
   Palette: cream paper + charcoal ink + deep emerald + rust accent.
   Type pair: Fraunces (display serif) + DM Sans (body).
   ───────────────────────────────────────────────────────────────── */

const palette = {
  paper: '#f5f0e6',
  paperDeep: '#ede6d6',
  ink: '#0e0f12',
  inkSoft: '#3a3a3f',
  brand: '#0a5c3b',
  brandSoft: '#13744c',
  accent: '#c75a2f',
  mute: '#94908a',
};

const fontDisplay = `'Fraunces', 'Cormorant Garamond', 'EB Garamond', Georgia, serif`;
const fontBody = `'DM Sans', 'Inter', system-ui, -apple-system, sans-serif`;
const fontMono = `'JetBrains Mono', ui-monospace, monospace`;

/* Tracks elapsed seconds since mount — used for subtle clock animation */
function useClock() {
  const [t, setT] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setT(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return new Date(t);
}

export default function Landing() {
  return (
    <div
      style={{
        background: palette.paper,
        color: palette.ink,
        fontFamily: fontBody,
        minHeight: '100vh',
      }}
    >
      <Nav />
      <Hero />
      <Marquee />
      <CategoryIndex />
      <ThreePillars />
      <NumbersBand />
      <Trust />
      <ClosingCta />
      <Footer />
    </div>
  );
}

/* ─── Top nav — minimal, paper-on-paper ─── */
function Nav() {
  return (
    <header className="relative">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12 py-6 flex items-center justify-between">
        <Link to="/welcome" className="flex items-center gap-2.5 group">
          <img src={logosm} alt="" className="h-7 w-7" />
          <span style={{ fontFamily: fontDisplay, fontWeight: 500 }} className="text-lg tracking-tight">
            FSWealth <span style={{ fontStyle: 'italic', color: palette.brand }}>Axis</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-9 text-sm" style={{ color: palette.inkSoft }}>
          <a href="#tracked" className="hover:text-black transition-colors">What's tracked</a>
          <a href="#pillars" className="hover:text-black transition-colors">How it works</a>
          <a href="#trust" className="hover:text-black transition-colors">Trust</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/login" className="hidden sm:inline text-sm hover:underline" style={{ color: palette.inkSoft }}>
            Sign in
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: palette.ink }}
          >
            Start free
            <MoveRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ─── Hero — asymmetric 7/5 split with animated visual ─── */
function Hero() {
  const clock = useClock();
  const time = clock.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });

  const eyebrowRef = useRef(null);
  const headlineRef = useRef(null);
  const subRef = useRef(null);
  const ctasRef = useRef(null);

  // Entrance choreography
  useEffect(() => {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });

    if (eyebrowRef.current) {
      tl.add(eyebrowRef.current, { opacity: [0, 1], translateY: [12, 0], duration: 700 }, 0);
    }
    if (headlineRef.current) {
      const words = headlineRef.current.querySelectorAll('.word');
      tl.add(words, {
        opacity: [0, 1],
        translateY: [40, 0],
        rotate: [-2, 0],
        duration: 900,
        delay: stagger(70),
      }, 100);
    }
    if (subRef.current) {
      tl.add(subRef.current, { opacity: [0, 1], translateY: [16, 0], duration: 700 }, 700);
    }
    if (ctasRef.current) {
      tl.add(ctasRef.current.children, {
        opacity: [0, 1],
        translateY: [8, 0],
        duration: 500,
        delay: stagger(80),
      }, 900);
    }
  }, []);

  // Split a string into per-word spans so each can be animated
  const renderWords = (text) =>
    text.split(' ').map((w, i) => (
      <span key={i} className="word inline-block opacity-0" style={{ marginRight: '0.18em' }}>
        {w}
      </span>
    ));

  return (
    <section className="relative pt-8 pb-24 lg:pb-32 overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Eyebrow strip */}
        <div
          ref={eyebrowRef}
          className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] mb-12 opacity-0"
          style={{ color: palette.mute }}
        >
          <span className="block w-8 h-px" style={{ background: palette.mute }} />
          <span>Volume I</span>
          <span style={{ color: palette.inkSoft }}>·</span>
          <span>Personal finance, made for Pakistan</span>
          <span className="hidden md:inline ml-auto font-mono text-[10px]" style={{ fontFamily: fontMono }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ background: palette.accent, animation: 'pulseDot 2s ease-in-out infinite' }} />
            KHI · {time}
          </span>
        </div>

        <div className="grid grid-cols-12 gap-x-6 gap-y-10 items-center">
          {/* Headline — spans 7 cols */}
          <div className="col-span-12 lg:col-span-7">
            <h1
              ref={headlineRef}
              style={{ fontFamily: fontDisplay, fontWeight: 400, lineHeight: 0.95, letterSpacing: '-0.025em' }}
              className="text-[56px] sm:text-[80px] lg:text-[112px] xl:text-[128px]"
            >
              {renderWords('Your money,')}
              <br />
              <span className="word inline-block opacity-0" style={{ fontStyle: 'italic', fontWeight: 300, marginRight: '0.18em' }}>finally</span>
              {renderWords('in one')}
              <br />
              <span className="word inline-block opacity-0" style={{ color: palette.brand, marginRight: '0.18em' }}>quiet</span>
              <span className="word inline-block opacity-0">place.</span>
            </h1>

            <div ref={subRef} className="opacity-0 mt-10 max-w-xl">
              <p className="text-lg lg:text-xl leading-relaxed" style={{ color: palette.inkSoft }}>
                Track every rupee across your banks, wallets, dues and investments. Upload a statement
                and let it sort itself. Ask anything in plain English. Pay your Zakat without a spreadsheet.
              </p>

              <div ref={ctasRef} className="flex flex-wrap items-center gap-3 mt-7">
                <Link
                  to="/register"
                  className="opacity-0 inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-medium text-white transition-all hover:translate-x-0.5"
                  style={{ background: palette.brand }}
                >
                  Open your free ledger
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/login"
                  className="opacity-0 inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-medium border transition-all hover:bg-black/5"
                  style={{ borderColor: palette.ink, color: palette.ink }}
                >
                  I already have one
                </Link>
              </div>
            </div>
          </div>

          {/* Right column — animated visual */}
          <div className="col-span-12 lg:col-span-5 lg:pl-6">
            <HeroVisual />
          </div>
        </div>
      </div>

      {/* Side rotated label */}
      <div
        className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 rotate-90 origin-right text-[10px] tracking-[0.4em] uppercase pr-4"
        style={{ color: palette.mute, fontFamily: fontMono }}
      >
        — Issue 01 / Built in Karachi
      </div>

      <style>{`
        @keyframes pulseDot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.6); opacity: 0.4; }
        }
      `}</style>
    </section>
  );
}

/* ─── HeroVisual — animated illustration: chart + balance card + drifting tags ─── */
function HeroVisual() {
  const wrapRef = useRef(null);
  const lineRef = useRef(null);
  const areaRef = useRef(null);
  const dotsRef = useRef(null);
  const labelsRef = useRef(null);
  const cardRef = useRef(null);
  const tagsRef = useRef(null);
  const [balance, setBalance] = useState(0);
  const target = 1284520;

  useEffect(() => {
    const tl = createTimeline({ defaults: { ease: 'outQuart' } });

    // 1. Visual frame enters
    if (wrapRef.current) {
      tl.add(wrapRef.current, { opacity: [0, 1], translateY: [24, 0], duration: 900 }, 200);
    }

    // 2. Card slides in
    if (cardRef.current) {
      tl.add(cardRef.current, {
        opacity: [0, 1],
        translateY: [16, 0],
        duration: 700,
      }, 400);
    }

    // 3. Line draws in via stroke-dashoffset
    if (lineRef.current) {
      const pathEl = lineRef.current.querySelector('.draw-line');
      if (pathEl) {
        const len = pathEl.getTotalLength();
        pathEl.style.strokeDasharray = len;
        pathEl.style.strokeDashoffset = len;
        tl.add(pathEl, {
          strokeDashoffset: [len, 0],
          duration: 1800,
          ease: 'inOutQuad',
        }, 800);
      }
    }

    // 4. Area fades in after line
    if (areaRef.current) {
      tl.add(areaRef.current, { opacity: [0, 1], duration: 800 }, 1600);
    }

    // 5. Dots on the line pop in
    if (dotsRef.current) {
      tl.add(dotsRef.current.children, {
        opacity: [0, 1],
        scale: [0, 1],
        duration: 500,
        delay: stagger(80),
        ease: 'outBack',
      }, 1800);
    }

    // 6. X-axis labels
    if (labelsRef.current) {
      tl.add(labelsRef.current.children, {
        opacity: [0, 1],
        translateY: [6, 0],
        duration: 500,
        delay: stagger(50),
      }, 2000);
    }

    // 7. Drifting transaction tags
    if (tagsRef.current) {
      tl.add(tagsRef.current.children, {
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 700,
        delay: stagger(150),
      }, 1400);

      // Continuous gentle float — runs forever
      Array.from(tagsRef.current.children).forEach((tag, i) => {
        animate(tag, {
          translateY: [-4, 4],
          duration: 3500 + i * 400,
          alternate: true,
          loop: true,
          ease: 'inOutSine',
          delay: i * 250,
        });
      });
    }

    // 8. Count-up balance — runs after card slides in
    const start = performance.now();
    const duration = 1800;
    let raf;
    const tick = (now) => {
      const elapsed = Math.min((now - start - 400) / duration, 1);
      if (elapsed > 0) {
        const eased = 1 - Math.pow(1 - elapsed, 3); // easeOutCubic
        setBalance(Math.floor(target * eased));
      }
      if (elapsed < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Sample chart data points (month-end balances)
  const points = [
    { x: 20, y: 130, m: 'Dec' },
    { x: 95, y: 105, m: 'Jan' },
    { x: 170, y: 115, m: 'Feb' },
    { x: 245, y: 75, m: 'Mar' },
    { x: 320, y: 85, m: 'Apr' },
    { x: 395, y: 35, m: 'May' },
  ];
  const pathD = `M${points.map(p => `${p.x},${p.y}`).join(' L')}`;
  const areaD = `${pathD} L${points[points.length - 1].x},180 L${points[0].x},180 Z`;

  return (
    <div ref={wrapRef} className="opacity-0 relative">
      {/* Background dotted grid */}
      <svg className="absolute inset-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hero-grid" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.8" fill={palette.mute} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-grid)" />
      </svg>

      {/* Main card */}
      <div
        ref={cardRef}
        className="relative rounded-3xl border p-6 lg:p-7 opacity-0 z-10"
        style={{
          background: '#fbf8f1',
          borderColor: 'rgba(14,15,18,0.1)',
          boxShadow: '0 30px 80px -40px rgba(14,15,18,0.18)',
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="block w-1.5 h-1.5 rounded-full" style={{ background: palette.brand, animation: 'pulseDot 2s ease-in-out infinite' }} />
            <span className="text-[10px] tracking-[0.18em] uppercase" style={{ color: palette.mute }}>
              Live · All accounts
            </span>
          </div>
          <span
            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(10,92,59,0.08)', color: palette.brand }}
          >
            <TrendingUp className="w-3 h-3" /> 4.2%
          </span>
        </div>

        {/* Counting balance */}
        <div className="flex items-baseline gap-2 mb-1">
          <span style={{ fontFamily: fontDisplay, fontWeight: 400 }} className="text-3xl tracking-tight">
            PKR
          </span>
          <span
            style={{ fontFamily: fontDisplay, fontWeight: 400, letterSpacing: '-0.02em' }}
            className="text-5xl lg:text-6xl tracking-tight tabular-nums"
          >
            {balance.toLocaleString('en-IN')}
          </span>
        </div>
        <p className="text-xs mb-5" style={{ color: palette.mute }}>
          across 6 banks, 3 wallets, 2 funds
        </p>

        {/* Inline animated chart */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(14,15,18,0.025)' }}>
          <svg ref={lineRef} viewBox="0 0 420 200" className="w-full h-[140px]" preserveAspectRatio="none">
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={palette.brand} stopOpacity="0.18" />
                <stop offset="100%" stopColor={palette.brand} stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Filled area below line */}
            <path ref={areaRef} d={areaD} fill="url(#areaGrad)" className="opacity-0" />

            {/* Main line — animated draw via anime.js */}
            <path
              className="draw-line"
              d={pathD}
              stroke={palette.brand}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Dots on each data point */}
            <g ref={dotsRef}>
              {points.map((p, i) => (
                <g key={i} className="opacity-0">
                  <circle cx={p.x} cy={p.y} r="4" fill={palette.paper} stroke={palette.brand} strokeWidth="2" />
                  {i === points.length - 1 && (
                    <circle cx={p.x} cy={p.y} r="8" fill="none" stroke={palette.brand} strokeOpacity="0.3" strokeWidth="1.5">
                      <animate attributeName="r" from="4" to="14" dur="1.6s" repeatCount="indefinite" />
                      <animate attributeName="stroke-opacity" from="0.4" to="0" dur="1.6s" repeatCount="indefinite" />
                    </circle>
                  )}
                </g>
              ))}
            </g>
          </svg>

          {/* X-axis labels */}
          <div ref={labelsRef} className="flex justify-between px-3 pb-3 text-[10px]" style={{ fontFamily: fontMono, color: palette.mute }}>
            {points.map((p, i) => (
              <span key={i} className="opacity-0">{p.m}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Small floating transaction tag used around the hero card */
function FloatTag({ style, icon, label, amount, tone }) {
  const toneStyle = {
    credit: { bg: 'rgba(10,92,59,0.08)', fg: palette.brand },
    debit: { bg: 'rgba(199,90,47,0.1)', fg: palette.accent },
    ai: { bg: '#fbf8f1', fg: palette.ink },
  }[tone];

  return (
    <div
      className="absolute opacity-0 rounded-full border px-3 py-1.5 flex items-center gap-2 text-xs shadow-[0_8px_30px_-12px_rgba(14,15,18,0.25)]"
      style={{
        ...style,
        background: toneStyle.bg,
        borderColor: 'rgba(14,15,18,0.08)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <span style={{ color: toneStyle.fg }}>{icon}</span>
      <span style={{ color: palette.inkSoft }} className="font-medium">{label}</span>
      <span style={{ fontFamily: fontMono, color: toneStyle.fg }} className="text-[11px]">
        {amount}
      </span>
    </div>
  );
}

/* ─── Horizontal marquee strip ─── */
function Marquee() {
  const words = [
    'Bank statements', 'Wallets', 'Beneficiaries', 'Dues ledger',
    'Mutual funds', 'PSX stocks', 'Rent tracker', 'Zakat',
    'Physical assets', 'Cash flow', 'AI assistant', 'Auto-categorise',
  ];
  return (
    <section
      className="border-y py-7 overflow-hidden"
      style={{ borderColor: 'rgba(14,15,18,0.1)', background: palette.paperDeep }}
    >
      <div className="flex gap-12 whitespace-nowrap animate-[marquee_45s_linear_infinite]">
        {[...words, ...words, ...words].map((w, i) => (
          <span
            key={i}
            style={{ fontFamily: fontDisplay, fontStyle: 'italic', fontWeight: 300, color: palette.inkSoft }}
            className="text-2xl lg:text-3xl"
          >
            {w} <span style={{ color: palette.accent }}>·</span>
          </span>
        ))}
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-33.333%) } }`}</style>
    </section>
  );
}

/* ─── Category index — magazine-style list of everything tracked ─── */
function CategoryIndex() {
  const items = [
    { n: '01', title: 'Bank accounts', body: 'Multiple banks, multi-currency, balance auto-synced from your uploaded statement.' },
    { n: '02', title: 'Wallets & cash', body: 'NayaPay, Easypaisa, JazzCash, your wallet, your drawer. All on one ledger.' },
    { n: '03', title: 'Beneficiaries', body: 'Name a contact once. Every transfer to them is auto-linked across statements.' },
    { n: '04', title: 'Dues ledger', body: 'Who owes you, who you owe. Send reminders by email when it gets uncomfortable.' },
    { n: '05', title: 'Mutual funds', body: 'NAV-tracked daily. See realised gains, holding period, and tax position at a glance.' },
    { n: '06', title: 'PSX stocks', body: 'Symbol-level P&L with the live PSX feed. Dividends auto-credited to the right book.' },
    { n: '07', title: 'Rent tracker', body: 'Tenants, due dates, late fees, deposits. Quietly nudges you when the month begins.' },
    { n: '08', title: 'Zakat', body: 'A real Hijri calendar. Nisab threshold check. One number when the day comes.' },
    { n: '09', title: 'Physical assets', body: 'Gold, property, vehicles, anything that isn\'t liquid. Valued, dated, and on the books.' },
    { n: '10', title: 'Expenses', body: 'AI categorisation that learns your style. Override once, it remembers forever.' },
    { n: '11', title: 'AI assistant', body: 'Ask it anything. It runs a real query on your real data — never makes numbers up.' },
    { n: '12', title: 'Reports', body: 'Monthly summaries delivered to your inbox. Category breakdowns when you want them.' },
  ];

  return (
    <section id="tracked" className="py-24 lg:py-36">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-12 gap-x-6 mb-16 lg:mb-20">
          <p className="col-span-12 lg:col-span-3 text-xs uppercase tracking-[0.18em] mb-4 lg:mb-0" style={{ color: palette.mute }}>
            § Index of contents
          </p>
          <h2
            className="col-span-12 lg:col-span-9 text-[36px] sm:text-[52px] lg:text-[64px] leading-[1.0] tracking-tight"
            style={{ fontFamily: fontDisplay, fontWeight: 400, letterSpacing: '-0.02em' }}
          >
            Twelve kinds of money,
            <br />
            <span style={{ fontStyle: 'italic', color: palette.brand }}>one quiet</span> ledger.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
          {items.map((it) => (
            <article key={it.n} className="group">
              <div className="flex items-baseline gap-3 mb-3">
                <span
                  className="text-xs"
                  style={{ fontFamily: fontMono, color: palette.mute, letterSpacing: '0.1em' }}
                >
                  {it.n} —
                </span>
                <h3
                  className="text-2xl lg:text-[28px] leading-tight"
                  style={{ fontFamily: fontDisplay, fontWeight: 500, letterSpacing: '-0.01em' }}
                >
                  {it.title}
                </h3>
              </div>
              <p className="text-[15px] leading-relaxed pl-8" style={{ color: palette.inkSoft }}>
                {it.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Three pillars — full-width feature strips, each visually distinct ─── */
function ThreePillars() {
  return (
    <section id="pillars" className="space-y-px" style={{ background: palette.ink, color: palette.paper }}>
      <PillarUpload />
      <PillarAi />
      <PillarLocal />
    </section>
  );
}

/* Pillar 1 — Statement upload */
function PillarUpload() {
  return (
    <div className="py-24 lg:py-32 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12 grid grid-cols-12 gap-x-6 gap-y-12 items-center">
        <div className="col-span-12 lg:col-span-5">
          <span className="inline-block text-[10px] tracking-[0.22em] uppercase mb-6 pb-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
            01 — Statements
          </span>
          <h3
            className="text-4xl lg:text-[56px] leading-[1.05] mb-6"
            style={{ fontFamily: fontDisplay, fontWeight: 400, letterSpacing: '-0.02em' }}
          >
            Upload your PDF.
            <br />
            <span style={{ fontStyle: 'italic', color: '#7fd1a4' }}>That's the end</span> of the work.
          </h3>
          <p className="text-base lg:text-lg leading-relaxed mb-8" style={{ color: 'rgba(245,240,230,0.7)' }}>
            Drop in a bank statement — protected or not, scanned or digital — and it parses every row,
            de-duplicates against history, classifies each line into the right category, and updates
            your account balance from the closing figure. You review, you approve, you're done.
          </p>
          <div className="flex items-center gap-3 text-sm" style={{ color: 'rgba(245,240,230,0.5)' }}>
            <FileText className="w-4 h-4" />
            PDF · CSV · Password-protected · Scanned
          </div>
        </div>

        <div className="col-span-12 lg:col-span-7 lg:pl-12">
          <StatementMock />
        </div>
      </div>
    </div>
  );
}

function StatementMock() {
  const rows = [
    { d: '07/05', label: 'RAAST P2P · Hamza', cat: 'Transfer', amt: '-200,000', kind: 'debit' },
    { d: '06/05', label: 'SALARY · ACME Pvt Ltd', cat: 'Salary', amt: '+450,000', kind: 'credit' },
    { d: '05/05', label: 'FOODPANDA', cat: 'Food', amt: '-1,840', kind: 'debit' },
    { d: '04/05', label: 'K-ELECTRIC BILL', cat: 'Utilities', amt: '-12,450', kind: 'debit' },
    { d: '02/05', label: 'METRO CASH&CARRY', cat: 'Groceries', amt: '-6,720', kind: 'debit' },
  ];
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}
    >
      {/* Header strip */}
      <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div>
          <p className="text-xs" style={{ color: 'rgba(245,240,230,0.4)' }}>HBL · ****4521</p>
          <p style={{ fontFamily: fontDisplay }} className="text-lg">May 2026 Statement</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(245,240,230,0.4)' }}>Closing balance</p>
          <p style={{ fontFamily: fontMono }} className="text-sm" >PKR 1,006,232.25</p>
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {rows.map((r, i) => (
          <div key={i} className="px-5 py-3.5 flex items-center gap-4 text-sm" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <span style={{ fontFamily: fontMono, color: 'rgba(245,240,230,0.4)' }} className="text-xs w-10 shrink-0">
              {r.d}
            </span>
            <span className="flex-1 truncate">{r.label}</span>
            <span
              className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(245,240,230,0.55)' }}
            >
              {r.cat}
            </span>
            <span
              style={{
                fontFamily: fontMono,
                color: r.kind === 'credit' ? '#7fd1a4' : '#f9a98a',
              }}
              className="w-24 text-right text-sm"
            >
              {r.amt}
            </span>
          </div>
        ))}
      </div>

      <div className="px-5 py-3 flex items-center justify-between text-xs" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <span style={{ color: 'rgba(245,240,230,0.45)' }}>847 transactions parsed in 4.2s</span>
        <span className="inline-flex items-center gap-1" style={{ color: '#7fd1a4' }}>
          <Sparkles className="w-3 h-3" /> Auto-categorised
        </span>
      </div>
    </div>
  );
}

/* Pillar 2 — AI assistant */
function PillarAi() {
  return (
    <div className="py-24 lg:py-32 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12 grid grid-cols-12 gap-x-6 gap-y-12 items-center">
        <div className="col-span-12 lg:col-span-7 lg:order-1 order-2">
          <ChatMock />
        </div>
        <div className="col-span-12 lg:col-span-5 lg:order-2 order-1 lg:pl-12">
          <span className="inline-block text-[10px] tracking-[0.22em] uppercase mb-6 pb-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
            02 — Assistant
          </span>
          <h3
            className="text-4xl lg:text-[56px] leading-[1.05] mb-6"
            style={{ fontFamily: fontDisplay, fontWeight: 400, letterSpacing: '-0.02em' }}
          >
            Ask in English.
            <br />
            Get an <span style={{ fontStyle: 'italic', color: '#7fd1a4' }}>honest</span> answer.
          </h3>
          <p className="text-base lg:text-lg leading-relaxed mb-8" style={{ color: 'rgba(245,240,230,0.7)' }}>
            Most "AI for finance" tools hallucinate numbers. Ours runs a real query on your real data
            and shows you the rows it used. Twelve hand-built tools cover every common question — and when
            it can't answer, it tells you instead of guessing.
          </p>
          <div className="flex items-center gap-3 text-sm" style={{ color: 'rgba(245,240,230,0.5)' }}>
            <MessageSquareText className="w-4 h-4" />
            Function-calling RAG · Gemini + Groq fallback
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatMock() {
  return (
    <div className="rounded-2xl border p-6 lg:p-8 space-y-5" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
      {/* User bubble */}
      <div className="flex justify-end">
        <div className="max-w-sm rounded-2xl rounded-tr-md px-4 py-2.5 text-sm" style={{ background: palette.paper, color: palette.ink }}>
          How much did I spend on food last month?
        </div>
      </div>

      {/* Assistant — narration + data */}
      <div className="max-w-md">
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'rgba(245,240,230,0.9)' }}>
          You spent <span style={{ fontFamily: fontMono, color: '#7fd1a4' }}>PKR 38,420</span> on food
          in April 2026 across <span style={{ fontFamily: fontMono }}>23</span> transactions. Foodpanda
          accounted for 41% of that.
        </p>
        <div
          className="rounded-xl border overflow-hidden mt-3"
          style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
        >
          {[
            ['Foodpanda', '15,820', '41%'],
            ['Cheetay', '9,240', '24%'],
            ['Local restaurants', '8,360', '22%'],
            ['Groceries', '5,000', '13%'],
          ].map(([k, v, pct], i) => (
            <div
              key={k}
              className="px-4 py-2.5 flex items-center justify-between text-xs"
              style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}
            >
              <span style={{ color: 'rgba(245,240,230,0.8)' }}>{k}</span>
              <div className="flex items-center gap-3">
                <span style={{ fontFamily: fontMono, color: 'rgba(245,240,230,0.6)' }}>{pct}</span>
                <span style={{ fontFamily: fontMono, color: '#7fd1a4' }} className="w-20 text-right">PKR {v}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-[11px] flex items-center gap-2" style={{ color: 'rgba(245,240,230,0.4)' }}>
        <span>Tool called:</span>
        <span style={{ fontFamily: fontMono }}>getExpenseSummary(months=1, category="Food")</span>
      </div>
    </div>
  );
}

/* Pillar 3 — Local-aware */
function PillarLocal() {
  return (
    <div className="py-24 lg:py-32">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12 grid grid-cols-12 gap-x-6 gap-y-12 items-center">
        <div className="col-span-12 lg:col-span-5">
          <span className="inline-block text-[10px] tracking-[0.22em] uppercase mb-6 pb-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
            03 — Made here
          </span>
          <h3
            className="text-4xl lg:text-[56px] leading-[1.05] mb-6"
            style={{ fontFamily: fontDisplay, fontWeight: 400, letterSpacing: '-0.02em' }}
          >
            Built for the way
            <br />
            <span style={{ fontStyle: 'italic', color: '#7fd1a4' }}>Pakistan</span> handles money.
          </h3>
          <p className="text-base lg:text-lg leading-relaxed" style={{ color: 'rgba(245,240,230,0.7)' }}>
            Every value is PKR. Every Hijri date is real. Every bank format — HBL, MCB, Meezan,
            Standard Chartered, Bank Alfalah — is supported out of the box. Statements come password-protected.
            We handle that too.
          </p>
        </div>

        <div className="col-span-12 lg:col-span-7 lg:pl-12">
          <div className="grid grid-cols-2 gap-3">
            {[
              { k: 'HBL', sub: 'Habib Bank' },
              { k: 'MCB', sub: 'MCB Bank' },
              { k: 'Meezan', sub: 'Islamic Banking' },
              { k: 'SCB', sub: 'Standard Chartered' },
              { k: 'BAFL', sub: 'Bank Alfalah' },
              { k: 'UBL', sub: 'United Bank' },
              { k: 'NayaPay', sub: 'Wallet' },
              { k: 'Easypaisa', sub: 'Wallet' },
            ].map((b) => (
              <div
                key={b.k}
                className="rounded-xl border p-5 transition-all hover:bg-white/5"
                style={{ borderColor: 'rgba(255,255,255,0.1)' }}
              >
                <p style={{ fontFamily: fontDisplay, fontWeight: 500 }} className="text-xl">{b.k}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(245,240,230,0.5)' }}>{b.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Big numbers band ─── */
function NumbersBand() {
  const stats = [
    { v: '12L+', l: 'PKR tracked across early users' },
    { v: '8', l: 'Pakistani banks parsed natively' },
    { v: '12', l: 'Tools the AI can run on your data' },
    { v: '0', l: 'Numbers ever made up' },
  ];
  return (
    <section className="py-24 lg:py-32" style={{ background: palette.paperDeep }}>
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-12 gap-x-6">
          {stats.map((s, i) => (
            <div key={i}>
              <p
                style={{ fontFamily: fontDisplay, fontWeight: 400, letterSpacing: '-0.03em', lineHeight: 0.9 }}
                className="text-6xl lg:text-7xl mb-3"
              >
                {s.v}
              </p>
              <p className="text-sm max-w-[180px]" style={{ color: palette.inkSoft }}>
                {s.l}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Trust strip — specific, not generic ─── */
function Trust() {
  const items = [
    {
      icon: ShieldCheck,
      title: 'Row-level security on every table',
      body: 'Postgres RLS denies all anon access by default. Even a leaked API key cannot read a row.',
    },
    {
      icon: Lock,
      title: 'Two-factor by default',
      body: 'Every sign-in needs a 6-digit code sent to your email. Sessions expire after 7 days.',
    },
    {
      icon: Fingerprint,
      title: 'Master PIN gate',
      body: 'A six-digit PIN you choose stands between casual eyes and your balance figures.',
    },
  ];
  return (
    <section id="trust" className="py-24 lg:py-32">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-12 gap-x-6 mb-16">
          <p className="col-span-12 lg:col-span-3 text-xs uppercase tracking-[0.18em] mb-4 lg:mb-0" style={{ color: palette.mute }}>
            § A note on safety
          </p>
          <h2
            className="col-span-12 lg:col-span-9 text-[36px] sm:text-[52px] lg:text-[64px] leading-[1.0] tracking-tight"
            style={{ fontFamily: fontDisplay, fontWeight: 400, letterSpacing: '-0.02em' }}
          >
            You bring the data.
            <br />
            <span style={{ fontStyle: 'italic', color: palette.brand }}>We keep it</span> to ourselves.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px" style={{ background: 'rgba(14,15,18,0.1)' }}>
          {items.map((it) => (
            <div
              key={it.title}
              className="p-8 lg:p-10"
              style={{ background: palette.paper }}
            >
              <it.icon className="w-6 h-6 mb-6" style={{ color: palette.brand }} strokeWidth={1.5} />
              <h3 style={{ fontFamily: fontDisplay, fontWeight: 500 }} className="text-xl lg:text-2xl mb-3 leading-tight">
                {it.title}
              </h3>
              <p className="text-[15px] leading-relaxed" style={{ color: palette.inkSoft }}>
                {it.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Closing CTA — large serif, asymmetric ─── */
function ClosingCta() {
  return (
    <section className="py-32 lg:py-44">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-12 gap-x-6 items-end">
          <div className="col-span-12 lg:col-span-9">
            <p className="text-xs uppercase tracking-[0.18em] mb-8" style={{ color: palette.mute }}>
              § Step one
            </p>
            <h2
              style={{ fontFamily: fontDisplay, fontWeight: 400, lineHeight: 0.95, letterSpacing: '-0.025em' }}
              className="text-[48px] sm:text-[80px] lg:text-[120px]"
            >
              Take your money
              <br />
              <span style={{ fontStyle: 'italic', color: palette.brand }}>seriously</span>, gently.
            </h2>
          </div>

          <div className="col-span-12 lg:col-span-3 lg:pb-6 mt-10 lg:mt-0">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-full text-base font-medium text-white transition-all hover:translate-x-1 group"
              style={{ background: palette.ink }}
            >
              Begin
              <ArrowUpRight className="w-5 h-5 transition-transform group-hover:rotate-45" />
            </Link>
            <p className="text-sm mt-4" style={{ color: palette.inkSoft }}>
              Free while we're small.<br />
              No card asked. Cancel anytime.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function Footer() {
  return (
    <footer className="border-t py-12" style={{ borderColor: 'rgba(14,15,18,0.1)' }}>
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <img src={logosm} alt="" className="h-6 w-6" />
          <span style={{ fontFamily: fontDisplay, fontWeight: 500 }} className="text-base">
            FSWealth <span style={{ fontStyle: 'italic', color: palette.brand }}>Axis</span>
          </span>
        </div>

        <p className="text-xs" style={{ color: palette.mute, fontFamily: fontMono }}>
          © {new Date().getFullYear()} — Designed and built in Karachi.
        </p>

        <div className="flex items-center gap-6 text-sm" style={{ color: palette.inkSoft }}>
          <Link to="/login" className="hover:text-black">Sign in</Link>
          <Link to="/register" className="hover:text-black">Start free</Link>
        </div>
      </div>
    </footer>
  );
}
