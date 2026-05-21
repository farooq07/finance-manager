import { Link } from 'react-router-dom';
import { useEffect, useRef, useState, createContext, useContext } from 'react';
import { animate, stagger, createTimeline } from 'animejs';
import {
  ArrowUpRight, ArrowRight, MoveRight, TrendingUp, Sparkles,
  ShieldCheck, FileText, MessageSquareText, Lock, Fingerprint,
  ArrowDownRight, Circle, Moon, Sun,
} from 'lucide-react';
import logosm from '../assets/logosm.svg';
import { useTheme } from '../context/ThemeContext';

/* ─────────────────────────────────────────────────────────────────
   FSWealth Axis — Landing Page
   Design direction: editorial, asymmetric, financial-publication.
   Palette: cream paper + charcoal ink + deep emerald + rust accent.
   Type pair: Fraunces (display serif) + DM Sans (body).
   ───────────────────────────────────────────────────────────────── */

const fontDisplay = `'Fraunces', 'Cormorant Garamond', 'EB Garamond', Georgia, serif`;
const fontBody = `'DM Sans', 'Inter', system-ui, -apple-system, sans-serif`;
const fontMono = `'JetBrains Mono', ui-monospace, monospace`;

const lightPalette = {
  paper: '#f5f0e6',
  paperDeep: '#ede6d6',
  ink: '#0e0f12',
  inkSoft: '#3a3a3f',
  brand: '#0a5c3b',
  brandSoft: '#13744c',
  accent: '#c75a2f',
  mute: '#94908a',
  cardBg: '#fbf8f1',
  cardBorder: 'rgba(14,15,18,0.1)',
  cardShadow: '0 30px 80px -40px rgba(14,15,18,0.18)',
  marqueeBg: '#ede6d6',
  marqueeBorder: 'rgba(14,15,18,0.1)',
  numbersBg: '#ede6d6',
  trustCardBg: '#f5f0e6',
  trustGrid: 'rgba(14,15,18,0.1)',
  divider: 'rgba(14,15,18,0.1)',
  // ThreePillars is always dark regardless of mode
  pillarsBg: '#0e0f12',
  pillarsAlt: '#141618',
  pillarsText: '#f5f0e6',
  pillarsTextSoft: 'rgba(245,240,230,0.7)',
  pillarsTextMute: 'rgba(245,240,230,0.5)',
  pillarsAccent: '#7fd1a4',
  pillarsBorder: 'rgba(255,255,255,0.08)',
  pillarsBorderFaint: 'rgba(255,255,255,0.06)',
};

const darkPalette = {
  paper: '#0f1115',
  paperDeep: '#13161d',
  ink: '#eae4d8',
  inkSoft: '#b3aca3',
  brand: '#2db87a',
  brandSoft: '#38d490',
  accent: '#e07048',
  mute: '#777068',
  cardBg: '#1c1f28',
  cardBorder: 'rgba(234,228,216,0.1)',
  cardShadow: '0 30px 80px -40px rgba(0,0,0,0.55)',
  marqueeBg: '#13161d',
  marqueeBorder: 'rgba(234,228,216,0.08)',
  numbersBg: '#13161d',
  trustCardBg: '#0f1115',
  trustGrid: 'rgba(234,228,216,0.1)',
  divider: 'rgba(234,228,216,0.08)',
  // ThreePillars stays dark but slightly differentiated
  pillarsBg: '#1c1f28',
  pillarsAlt: '#0f1115',
  pillarsText: '#f5f0e6',
  pillarsTextSoft: 'rgba(245,240,230,0.7)',
  pillarsTextMute: 'rgba(245,240,230,0.5)',
  pillarsAccent: '#7fd1a4',
  pillarsBorder: 'rgba(255,255,255,0.1)',
  pillarsBorderFaint: 'rgba(255,255,255,0.07)',
};

const PaletteCtx = createContext(lightPalette);

/* ── Clock — ticks every second ── */
function useClock() {
  const [t, setT] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setT(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return new Date(t);
}

/* ── IntersectionObserver-based scroll reveal trigger ── */
function useScrollReveal(threshold = 0.18) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

/* ── RotatingWord — cycles through synonyms with fade+rise ── */
function RotatingWord({ words, interval = 2800 }) {
  const ref = useRef(null);
  const [index, setIndex] = useState(0);
  const longest = words.reduce((a, b) => (b.length > a.length ? b : a), '');

  useEffect(() => {
    const id = setInterval(() => {
      const el = ref.current;
      if (!el) return;
      animate(el, {
        opacity: [1, 0], translateY: [0, -14], rotate: [0, -3],
        duration: 380, ease: 'inQuad',
        complete: () => {
          setIndex(i => (i + 1) % words.length);
          animate(el, { opacity: [0, 1], translateY: [14, 0], rotate: [3, 0], duration: 520, ease: 'outBack' });
        },
      });
    }, interval);
    return () => clearInterval(id);
  }, [words, interval]);

  return (
    <span style={{ position: 'relative', display: 'inline-block', whiteSpace: 'nowrap' }}>
      <span aria-hidden="true" style={{ visibility: 'hidden' }}>{longest}</span>
      <span ref={ref} style={{ position: 'absolute', left: 0, top: 0, display: 'inline-block', willChange: 'transform, opacity' }}>
        {words[index]}
      </span>
    </span>
  );
}

/* ── Root ── */
export default function Landing() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const p = isDark ? darkPalette : lightPalette;

  return (
    <PaletteCtx.Provider value={p}>
      <div
        style={{
          background: p.paper,
          color: p.ink,
          fontFamily: fontBody,
          minHeight: '100vh',
          transition: 'background-color 0.35s ease, color 0.25s ease',
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
    </PaletteCtx.Provider>
  );
}

/* ─── Nav ─── */
function Nav() {
  const p = useContext(PaletteCtx);
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="relative">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12 py-6 flex items-center justify-between">
        <Link to="/welcome" className="flex items-center gap-2.5">
          <img src={logosm} alt="" className="h-7 w-7" />
          <span style={{ fontFamily: fontDisplay, fontWeight: 500 }} className="text-lg tracking-tight">
            FSWealth <span style={{ fontStyle: 'italic', color: p.brand }}>Axis</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-9 text-sm" style={{ color: p.inkSoft }}>
          <a href="#tracked" className="hover:opacity-70 transition-opacity">What's tracked</a>
          <a href="#pillars" className="hover:opacity-70 transition-opacity">How it works</a>
          <a href="#trust" className="hover:opacity-70 transition-opacity">Trust</a>
        </nav>

        <div className="flex items-center gap-3">
          {/* Dark mode toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="w-8 h-8 flex items-center justify-center rounded-full transition-all hover:scale-110"
            style={{ color: p.mute, background: 'transparent', border: `1px solid ${p.divider}` }}
          >
            {theme === 'dark'
              ? <Sun className="w-3.5 h-3.5" />
              : <Moon className="w-3.5 h-3.5" />
            }
          </button>

          <Link to="/login" className="hidden sm:inline text-sm hover:underline" style={{ color: p.inkSoft }}>
            Sign in
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: p.ink, color: p.paper }}
          >
            Start free
            <MoveRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ─── Hero ─── */
function Hero() {
  const p = useContext(PaletteCtx);
  const clock = useClock();
  const time = clock.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });

  const eyebrowRef = useRef(null);
  const headlineRef = useRef(null);
  const subRef = useRef(null);
  const ctasRef = useRef(null);

  useEffect(() => {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });
    if (eyebrowRef.current)
      tl.add(eyebrowRef.current, { opacity: [0, 1], translateY: [12, 0], duration: 700 }, 0);
    if (headlineRef.current) {
      const words = headlineRef.current.querySelectorAll('.word');
      tl.add(words, { opacity: [0, 1], translateY: [40, 0], rotate: [-2, 0], duration: 900, delay: stagger(70) }, 100);
    }
    if (subRef.current)
      tl.add(subRef.current, { opacity: [0, 1], translateY: [16, 0], duration: 700 }, 700);
    if (ctasRef.current)
      tl.add(ctasRef.current.children, { opacity: [0, 1], translateY: [8, 0], duration: 500, delay: stagger(80) }, 900);
  }, []);

  const renderWords = (text) =>
    text.split(' ').map((w, i) => (
      <span key={i} className="word inline-block opacity-0" style={{ marginRight: '0.18em' }}>{w}</span>
    ));

  return (
    <section className="relative pt-8 pb-24 lg:pb-32 overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Eyebrow */}
        <div
          ref={eyebrowRef}
          className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] mb-12 opacity-0"
          style={{ color: p.mute }}
        >
          <span className="block w-8 h-px" style={{ background: p.mute }} />
          <span>Volume I</span>
          <span style={{ color: p.inkSoft }}>·</span>
          <span>Personal finance, made for Pakistan</span>
          <span className="hidden md:inline ml-auto font-mono text-[10px]" style={{ fontFamily: fontMono }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ background: p.accent, animation: 'pulseDot 2s ease-in-out infinite' }} />
            KHI · {time}
          </span>
        </div>

        <div className="grid grid-cols-12 gap-x-6 gap-y-10 items-center">
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
              <span className="word inline-block opacity-0" style={{ color: p.brand, marginRight: '0.18em' }}>
                <RotatingWord words={['quiet', 'single', 'honest', 'clear']} interval={2600} />
              </span>
              <span className="word inline-block opacity-0">place.</span>
            </h1>

            <div ref={subRef} className="opacity-0 mt-10 max-w-xl">
              <p className="text-lg lg:text-xl leading-relaxed" style={{ color: p.inkSoft }}>
                Track every rupee across your banks, wallets, dues and investments. Upload a statement
                and let it sort itself. Ask anything in plain English. Pay your Zakat without a spreadsheet.
              </p>
              <div ref={ctasRef} className="flex flex-wrap items-center gap-3 mt-7">
                <Link
                  to="/register"
                  className="opacity-0 inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-medium text-white transition-all hover:translate-x-0.5"
                  style={{ background: p.brand }}
                >
                  Open your free ledger
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/login"
                  className="opacity-0 inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-medium border transition-all hover:opacity-70"
                  style={{ borderColor: p.ink, color: p.ink }}
                >
                  I already have one
                </Link>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-5 lg:pl-6">
            <HeroVisual />
          </div>
        </div>
      </div>

      <div
        className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 rotate-90 origin-right text-[10px] tracking-[0.4em] uppercase pr-4"
        style={{ color: p.mute, fontFamily: fontMono }}
      >
        — Issue 01 / Built in Lahore
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

/* ─── HeroVisual ─── */
function HeroVisual() {
  const p = useContext(PaletteCtx);
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
    const wrap = wrapRef.current;
    const card = cardRef.current;
    if (!wrap || !card) return;
    let frame;
    const onMove = (e) => {
      const r = wrap.getBoundingClientRect();
      const cx = (e.clientX - r.left) / r.width - 0.5;
      const cy = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        card.style.transform = `perspective(1200px) rotateX(${-cy * 4}deg) rotateY(${cx * 6}deg) translateZ(0)`;
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      animate(card, { rotateX: 0, rotateY: 0, duration: 700, ease: 'outQuart' });
    };
    wrap.addEventListener('mousemove', onMove);
    wrap.addEventListener('mouseleave', onLeave);
    return () => { wrap.removeEventListener('mousemove', onMove); wrap.removeEventListener('mouseleave', onLeave); cancelAnimationFrame(frame); };
  }, []);

  useEffect(() => {
    const tl = createTimeline({ defaults: { ease: 'outQuart' } });
    if (wrapRef.current) tl.add(wrapRef.current, { opacity: [0, 1], translateY: [24, 0], duration: 900 }, 200);
    if (cardRef.current) tl.add(cardRef.current, { opacity: [0, 1], translateY: [16, 0], duration: 700 }, 400);
    if (lineRef.current) {
      const pathEl = lineRef.current.querySelector('.draw-line');
      if (pathEl) {
        const len = pathEl.getTotalLength();
        pathEl.style.strokeDasharray = len;
        pathEl.style.strokeDashoffset = len;
        tl.add(pathEl, { strokeDashoffset: [len, 0], duration: 1800, ease: 'inOutQuad' }, 800);
      }
    }
    if (areaRef.current) tl.add(areaRef.current, { opacity: [0, 1], duration: 800 }, 1600);
    if (dotsRef.current) tl.add(dotsRef.current.children, { opacity: [0, 1], scale: [0, 1], duration: 500, delay: stagger(80), ease: 'outBack' }, 1800);
    if (labelsRef.current) tl.add(labelsRef.current.children, { opacity: [0, 1], translateY: [6, 0], duration: 500, delay: stagger(50) }, 2000);
    if (tagsRef.current) {
      tl.add(tagsRef.current.children, { opacity: [0, 1], translateY: [20, 0], duration: 700, delay: stagger(150) }, 1400);
      Array.from(tagsRef.current.children).forEach((tag, i) => {
        animate(tag, { translateY: [-4, 4], duration: 3500 + i * 400, alternate: true, loop: true, ease: 'inOutSine', delay: i * 250 });
      });
    }
    const start = performance.now();
    const dur = 1800;
    let raf;
    const tick = (now) => {
      const elapsed = Math.min((now - start - 400) / dur, 1);
      if (elapsed > 0) setBalance(Math.floor(target * (1 - Math.pow(1 - elapsed, 3))));
      if (elapsed < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const points = [
    { x: 20, y: 130, m: 'Dec' }, { x: 95, y: 105, m: 'Jan' },
    { x: 170, y: 115, m: 'Feb' }, { x: 245, y: 75, m: 'Mar' },
    { x: 320, y: 85, m: 'Apr' }, { x: 395, y: 35, m: 'May' },
  ];
  const pathD = `M${points.map(pt => `${pt.x},${pt.y}`).join(' L')}`;
  const areaD = `${pathD} L${points[points.length - 1].x},180 L${points[0].x},180 Z`;

  return (
    <div ref={wrapRef} className="opacity-0 relative">
      <svg className="absolute inset-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hero-grid" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.8" fill={p.mute} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-grid)" />
      </svg>

      <div
        ref={cardRef}
        className="relative rounded-3xl border p-6 lg:p-7 opacity-0 z-10"
        style={{ background: p.cardBg, borderColor: p.cardBorder, boxShadow: p.cardShadow }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="block w-1.5 h-1.5 rounded-full" style={{ background: p.brand, animation: 'pulseDot 2s ease-in-out infinite' }} />
            <span className="text-[10px] tracking-[0.18em] uppercase" style={{ color: p.mute }}>Live · All accounts</span>
          </div>
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full" style={{ background: `${p.brand}14`, color: p.brand }}>
            <TrendingUp className="w-3 h-3" /> 4.2%
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-1">
          <span style={{ fontFamily: fontDisplay, fontWeight: 400 }} className="text-3xl tracking-tight">PKR</span>
          <span style={{ fontFamily: fontDisplay, fontWeight: 400, letterSpacing: '-0.02em' }} className="text-5xl lg:text-6xl tracking-tight tabular-nums">
            {balance.toLocaleString('en-IN')}
          </span>
        </div>
        <p className="text-xs mb-5" style={{ color: p.mute }}>across 6 banks, 3 wallets, 2 funds</p>

        <div className="rounded-xl overflow-hidden" style={{ background: `${p.ink}08` }}>
          <svg ref={lineRef} viewBox="0 0 420 200" className="w-full h-[140px]" preserveAspectRatio="none">
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={p.brand} stopOpacity="0.18" />
                <stop offset="100%" stopColor={p.brand} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path ref={areaRef} d={areaD} fill="url(#areaGrad)" className="opacity-0" />
            <path className="draw-line" d={pathD} stroke={p.brand} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <g ref={dotsRef}>
              {points.map((pt, i) => (
                <g key={i} className="opacity-0">
                  <circle cx={pt.x} cy={pt.y} r="4" fill={p.cardBg} stroke={p.brand} strokeWidth="2" />
                  {i === points.length - 1 && (
                    <circle cx={pt.x} cy={pt.y} r="8" fill="none" stroke={p.brand} strokeOpacity="0.3" strokeWidth="1.5">
                      <animate attributeName="r" from="4" to="14" dur="1.6s" repeatCount="indefinite" />
                      <animate attributeName="stroke-opacity" from="0.4" to="0" dur="1.6s" repeatCount="indefinite" />
                    </circle>
                  )}
                </g>
              ))}
            </g>
          </svg>
          <div ref={labelsRef} className="flex justify-between px-3 pb-3 text-[10px]" style={{ fontFamily: fontMono, color: p.mute }}>
            {points.map((pt, i) => <span key={i} className="opacity-0">{pt.m}</span>)}
          </div>
        </div>
      </div>

      <div ref={tagsRef} className="absolute inset-0 pointer-events-none z-20">
        <FloatTag style={{ top: '-3%', left: '-8%' }} icon={<ArrowDownRight className="w-3 h-3" />} label="Salary" amount="+450,000" tone="credit" />
        <FloatTag style={{ top: '38%', right: '-12%' }} icon={<ArrowUpRight className="w-3 h-3" />} label="K-Electric" amount="−12,450" tone="debit" />
        <FloatTag style={{ bottom: '-5%', left: '12%' }} icon={<Sparkles className="w-3 h-3" />} label="Auto-categorised" amount="847 rows" tone="ai" />
      </div>
    </div>
  );
}

function FloatTag({ style, icon, label, amount, tone }) {
  const p = useContext(PaletteCtx);
  const toneStyle = {
    credit: { bg: `${p.brand}14`, fg: p.brand },
    debit: { bg: `${p.accent}1a`, fg: p.accent },
    ai: { bg: p.cardBg, fg: p.ink },
  }[tone];

  return (
    <div
      className="absolute opacity-0 rounded-full border px-3 py-1.5 flex items-center gap-2 text-xs shadow-[0_8px_30px_-12px_rgba(14,15,18,0.25)]"
      style={{ ...style, background: toneStyle.bg, borderColor: p.cardBorder, backdropFilter: 'blur(6px)' }}
    >
      <span style={{ color: toneStyle.fg }}>{icon}</span>
      <span style={{ color: p.inkSoft }} className="font-medium">{label}</span>
      <span style={{ fontFamily: fontMono, color: toneStyle.fg }} className="text-[11px]">{amount}</span>
    </div>
  );
}

/* ─── Marquee ─── */
function Marquee() {
  const p = useContext(PaletteCtx);
  const words = [
    'Bank statements', 'Wallets', 'Beneficiaries', 'Dues ledger',
    'Mutual funds', 'PSX stocks', 'Rent tracker', 'Zakat',
    'Physical assets', 'Cash flow', 'AI assistant', 'Auto-categorise',
  ];
  return (
    <section
      className="border-y py-7 overflow-hidden"
      style={{ borderColor: p.marqueeBorder, background: p.marqueeBg }}
    >
      <div className="flex gap-12 whitespace-nowrap animate-[marquee_45s_linear_infinite]">
        {[...words, ...words, ...words].map((w, i) => (
          <span key={i} style={{ fontFamily: fontDisplay, fontStyle: 'italic', fontWeight: 300, color: p.inkSoft }} className="text-2xl lg:text-3xl">
            {w} <span style={{ color: p.accent }}>·</span>
          </span>
        ))}
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-33.333%) } }`}</style>
    </section>
  );
}

/* ─── CategoryIndex ─── */
function CategoryIndex() {
  const p = useContext(PaletteCtx);
  const [headRef, headVisible] = useScrollReveal(0.2);
  const [gridRef, gridVisible] = useScrollReveal(0.08);

  useEffect(() => {
    if (!headVisible || !headRef.current) return;
    const words = headRef.current.querySelectorAll('.s-word');
    animate(words, {
      opacity: [0, 1], translateY: [44, 0], rotate: [-2, 0],
      duration: 900, delay: stagger(55), ease: 'outExpo',
    });
  }, [headVisible]);

  useEffect(() => {
    if (!gridVisible || !gridRef.current) return;
    const articles = gridRef.current.querySelectorAll('article');
    animate(articles, {
      opacity: [0, 1], translateY: [28, 0],
      duration: 700, delay: stagger(50), ease: 'outExpo',
    });
  }, [gridVisible]);

  const items = [
    { n: '01', title: 'Bank accounts', body: 'Multiple banks, multi-currency, balance auto-synced from your uploaded statement.' },
    { n: '02', title: 'Wallets & cash', body: 'NayaPay, Easypaisa, JazzCash, your wallet, your drawer. All on one ledger.' },
    { n: '03', title: 'Beneficiaries', body: 'Name a contact once. Every transfer to them is auto-linked across statements.' },
    { n: '04', title: 'Dues ledger', body: 'Who owes you, who you owe. Send reminders by email when it gets uncomfortable.' },
    { n: '05', title: 'Mutual funds', body: 'NAV-tracked daily. See realised gains, holding period, and tax position at a glance.' },
    { n: '06', title: 'PSX stocks', body: 'Symbol-level P&L with the live PSX feed. Dividends auto-credited to the right book.' },
    { n: '07', title: 'Rent tracker', body: 'Tenants, due dates, late fees, deposits. Quietly nudges you when the month begins.' },
    { n: '08', title: 'Zakat', body: 'A real Hijri calendar. Nisab threshold check. One number when the day comes.' },
    { n: '09', title: 'Physical assets', body: "Gold, property, vehicles, anything that isn't liquid. Valued, dated, and on the books." },
    { n: '10', title: 'Expenses', body: 'AI categorisation that learns your style. Override once, it remembers forever.' },
    { n: '11', title: 'AI assistant', body: 'Ask it anything. It runs a real query on your real data — never makes numbers up.' },
    { n: '12', title: 'Reports', body: 'Monthly summaries delivered to your inbox. Category breakdowns when you want them.' },
  ];

  return (
    <section id="tracked" className="py-24 lg:py-36">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-12 gap-x-6 mb-16 lg:mb-20">
          <p className="col-span-12 lg:col-span-3 text-xs uppercase tracking-[0.18em] mb-4 lg:mb-0" style={{ color: p.mute }}>
            § Index of contents
          </p>
          <h2
            ref={headRef}
            className="col-span-12 lg:col-span-9 text-[36px] sm:text-[52px] lg:text-[64px] leading-[1.0]"
            style={{ fontFamily: fontDisplay, fontWeight: 400, letterSpacing: '-0.02em' }}
          >
            {'Twelve kinds of money,'.split(' ').map((w, i) => (
              <span key={i} className="s-word inline-block opacity-0" style={{ marginRight: '0.2em' }}>{w}</span>
            ))}
            <br />
            <span className="s-word inline-block opacity-0" style={{ fontStyle: 'italic', color: p.brand, marginRight: '0.18em' }}>
              one{' '}
              <RotatingWord words={['quiet', 'honest', 'clear', 'orderly']} interval={3000} />
            </span>
            <span className="s-word inline-block opacity-0">ledger.</span>
          </h2>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
          {items.map((it) => (
            <article key={it.n} className="group" style={{ opacity: 0 }}>
              <div className="flex items-baseline gap-3 mb-3">
                <span className="text-xs" style={{ fontFamily: fontMono, color: p.mute, letterSpacing: '0.1em' }}>
                  {it.n} —
                </span>
                <h3 className="text-2xl lg:text-[28px] leading-tight" style={{ fontFamily: fontDisplay, fontWeight: 500, letterSpacing: '-0.01em' }}>
                  {it.title}
                </h3>
              </div>
              <p className="text-[15px] leading-relaxed pl-8" style={{ color: p.inkSoft }}>{it.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── ThreePillars ─── */
function ThreePillars() {
  const p = useContext(PaletteCtx);
  return (
    <section id="pillars" className="space-y-px" style={{ background: p.pillarsBg, color: p.pillarsText }}>
      <PillarUpload />
      <PillarAi />
      <PillarLocal />
    </section>
  );
}

function PillarUpload() {
  const p = useContext(PaletteCtx);
  const [headRef, headVisible] = useScrollReveal(0.2);

  useEffect(() => {
    if (!headVisible || !headRef.current) return;
    const lines = headRef.current.querySelectorAll('.s-line');
    animate(lines, {
      opacity: [0, 1], translateX: [-24, 0],
      duration: 800, delay: stagger(120), ease: 'outExpo',
    });
  }, [headVisible]);

  return (
    <div className="py-24 lg:py-32 border-b" style={{ borderColor: p.pillarsBorder }}>
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12 grid grid-cols-12 gap-x-6 gap-y-12 items-center">
        <div className="col-span-12 lg:col-span-5">
          <span className="inline-block text-[10px] tracking-[0.22em] uppercase mb-6 pb-2 border-b" style={{ borderColor: p.pillarsBorder }}>
            01 — Statements
          </span>
          <h3
            ref={headRef}
            className="text-4xl lg:text-[56px] leading-[1.05] mb-6"
            style={{ fontFamily: fontDisplay, fontWeight: 400, letterSpacing: '-0.02em' }}
          >
            <span className="s-line block opacity-0">Upload your PDF.</span>
            <span className="s-line block opacity-0">
              <span style={{ fontStyle: 'italic', color: p.pillarsAccent }}>That's the end</span> of the work.
            </span>
          </h3>
          <p className="text-base lg:text-lg leading-relaxed mb-8" style={{ color: p.pillarsTextSoft }}>
            Drop in a bank statement — protected or not, scanned or digital — and it parses every row,
            de-duplicates against history, classifies each line into the right category, and updates
            your account balance from the closing figure. You review, you approve, you're done.
          </p>
          <div className="flex items-center gap-3 text-sm" style={{ color: p.pillarsTextMute }}>
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
  const p = useContext(PaletteCtx);
  const rows = [
    { d: '07/05', label: 'RAAST P2P · Hamza', cat: 'Transfer', amt: '-200,000', kind: 'debit' },
    { d: '06/05', label: 'SALARY · ACME Pvt Ltd', cat: 'Salary', amt: '+450,000', kind: 'credit' },
    { d: '05/05', label: 'FOODPANDA', cat: 'Food', amt: '-1,840', kind: 'debit' },
    { d: '04/05', label: 'K-ELECTRIC BILL', cat: 'Utilities', amt: '-12,450', kind: 'debit' },
    { d: '02/05', label: 'METRO CASH&CARRY', cat: 'Groceries', amt: '-6,720', kind: 'debit' },
  ];
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: p.pillarsBorder, background: 'rgba(255,255,255,0.03)' }}>
      <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: p.pillarsBorderFaint }}>
        <div>
          <p className="text-xs" style={{ color: 'rgba(245,240,230,0.4)' }}>HBL · ****4521</p>
          <p style={{ fontFamily: fontDisplay }} className="text-lg">May 2026 Statement</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(245,240,230,0.4)' }}>Closing balance</p>
          <p style={{ fontFamily: fontMono }} className="text-sm">PKR 1,006,232.25</p>
        </div>
      </div>
      <div className="divide-y" style={{ borderColor: p.pillarsBorderFaint }}>
        {rows.map((r, i) => (
          <div key={i} className="px-5 py-3.5 flex items-center gap-4 text-sm" style={{ borderColor: p.pillarsBorderFaint }}>
            <span style={{ fontFamily: fontMono, color: 'rgba(245,240,230,0.4)' }} className="text-xs w-10 shrink-0">{r.d}</span>
            <span className="flex-1 truncate">{r.label}</span>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(245,240,230,0.55)' }}>
              {r.cat}
            </span>
            <span style={{ fontFamily: fontMono, color: r.kind === 'credit' ? p.pillarsAccent : '#f9a98a' }} className="w-24 text-right text-sm">
              {r.amt}
            </span>
          </div>
        ))}
      </div>
      <div className="px-5 py-3 flex items-center justify-between text-xs" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <span style={{ color: 'rgba(245,240,230,0.45)' }}>847 transactions parsed in 4.2s</span>
        <span className="inline-flex items-center gap-1" style={{ color: p.pillarsAccent }}>
          <Sparkles className="w-3 h-3" /> Auto-categorised
        </span>
      </div>
    </div>
  );
}

function PillarAi() {
  const p = useContext(PaletteCtx);
  const [headRef, headVisible] = useScrollReveal(0.2);

  useEffect(() => {
    if (!headVisible || !headRef.current) return;
    const lines = headRef.current.querySelectorAll('.s-line');
    animate(lines, {
      opacity: [0, 1], translateX: [24, 0],
      duration: 800, delay: stagger(120), ease: 'outExpo',
    });
  }, [headVisible]);

  return (
    <div className="py-24 lg:py-32 border-b" style={{ borderColor: p.pillarsBorder }}>
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12 grid grid-cols-12 gap-x-6 gap-y-12 items-center">
        <div className="col-span-12 lg:col-span-7 lg:order-1 order-2">
          <ChatMock />
        </div>
        <div className="col-span-12 lg:col-span-5 lg:order-2 order-1 lg:pl-12">
          <span className="inline-block text-[10px] tracking-[0.22em] uppercase mb-6 pb-2 border-b" style={{ borderColor: p.pillarsBorder }}>
            02 — Assistant
          </span>
          <h3
            ref={headRef}
            className="text-4xl lg:text-[56px] leading-[1.05] mb-6"
            style={{ fontFamily: fontDisplay, fontWeight: 400, letterSpacing: '-0.02em' }}
          >
            <span className="s-line block opacity-0">Ask in English.</span>
            <span className="s-line block opacity-0">
              Get an <span style={{ fontStyle: 'italic', color: p.pillarsAccent }}>honest</span> answer.
            </span>
          </h3>
          <p className="text-base lg:text-lg leading-relaxed mb-8" style={{ color: p.pillarsTextSoft }}>
            Most "AI for finance" tools hallucinate numbers. Ours runs a real query on your real data
            and shows you the rows it used. Twelve hand-built tools cover every common question — and when
            it can't answer, it tells you instead of guessing.
          </p>
          <div className="flex items-center gap-3 text-sm" style={{ color: p.pillarsTextMute }}>
            <MessageSquareText className="w-4 h-4" />
            Function-calling RAG · Gemini + Groq fallback
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatMock() {
  const p = useContext(PaletteCtx);
  return (
    <div className="rounded-2xl border p-6 lg:p-8 space-y-5" style={{ borderColor: p.pillarsBorder, background: 'rgba(255,255,255,0.03)' }}>
      <div className="flex justify-end">
        <div className="max-w-sm rounded-2xl rounded-tr-md px-4 py-2.5 text-sm" style={{ background: p.paper, color: p.ink }}>
          How much did I spend on food last month?
        </div>
      </div>
      <div className="max-w-md">
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'rgba(245,240,230,0.9)' }}>
          You spent <span style={{ fontFamily: fontMono, color: p.pillarsAccent }}>PKR 38,420</span> on food
          in April 2026 across <span style={{ fontFamily: fontMono }}>23</span> transactions. Foodpanda accounted for 41% of that.
        </p>
        <div className="rounded-xl border overflow-hidden mt-3" style={{ borderColor: p.pillarsBorderFaint, background: 'rgba(255,255,255,0.02)' }}>
          {[['Foodpanda', '15,820', '41%'], ['Cheetay', '9,240', '24%'], ['Local restaurants', '8,360', '22%'], ['Groceries', '5,000', '13%']].map(([k, v, pct], i) => (
            <div key={k} className="px-4 py-2.5 flex items-center justify-between text-xs" style={{ borderTop: i === 0 ? 'none' : `1px solid ${p.pillarsBorderFaint}` }}>
              <span style={{ color: 'rgba(245,240,230,0.8)' }}>{k}</span>
              <div className="flex items-center gap-3">
                <span style={{ fontFamily: fontMono, color: 'rgba(245,240,230,0.6)' }}>{pct}</span>
                <span style={{ fontFamily: fontMono, color: p.pillarsAccent }} className="w-20 text-right">PKR {v}</span>
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

function PillarLocal() {
  const p = useContext(PaletteCtx);
  const [headRef, headVisible] = useScrollReveal(0.2);
  const [tilesRef, tilesVisible] = useScrollReveal(0.15);

  useEffect(() => {
    if (!headVisible || !headRef.current) return;
    const lines = headRef.current.querySelectorAll('.s-line');
    animate(lines, {
      opacity: [0, 1], translateY: [30, 0],
      duration: 800, delay: stagger(120), ease: 'outExpo',
    });
  }, [headVisible]);

  useEffect(() => {
    if (!tilesVisible || !tilesRef.current) return;
    const tiles = tilesRef.current.querySelectorAll('.bank-tile');
    animate(tiles, {
      opacity: [0, 1], scale: [0.92, 1], translateY: [12, 0],
      duration: 600, delay: stagger(60), ease: 'outBack',
    });
  }, [tilesVisible]);

  const banks = [
    { k: 'HBL', sub: 'Habib Bank' },
    { k: 'MCB', sub: 'MCB Bank' },
    { k: 'Meezan', sub: 'Islamic Banking' },
    { k: 'SCB', sub: 'Standard Chartered' },
    { k: 'BAFL', sub: 'Bank Alfalah' },
    { k: 'UBL', sub: 'United Bank' },
    { k: 'NayaPay', sub: 'Wallet' },
    { k: 'Easypaisa', sub: 'Wallet' },
  ];

  return (
    <div className="py-24 lg:py-32">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12 grid grid-cols-12 gap-x-6 gap-y-12 items-center">
        <div className="col-span-12 lg:col-span-5">
          <span className="inline-block text-[10px] tracking-[0.22em] uppercase mb-6 pb-2 border-b" style={{ borderColor: p.pillarsBorder }}>
            03 — Made here
          </span>
          <h3
            ref={headRef}
            className="text-4xl lg:text-[56px] leading-[1.05] mb-6"
            style={{ fontFamily: fontDisplay, fontWeight: 400, letterSpacing: '-0.02em' }}
          >
            <span className="s-line block opacity-0">Built for the way</span>
            <span className="s-line block opacity-0">
              <span style={{ fontStyle: 'italic', color: p.pillarsAccent }}>Pakistan</span> handles money.
            </span>
          </h3>
          <p className="text-base lg:text-lg leading-relaxed" style={{ color: p.pillarsTextSoft }}>
            Every value is PKR. Every Hijri date is real. Every bank format — HBL, MCB, Meezan,
            Standard Chartered, Bank Alfalah — is supported out of the box. Statements come password-protected. We handle that too.
          </p>
        </div>
        <div className="col-span-12 lg:col-span-7 lg:pl-12">
          <div ref={tilesRef} className="grid grid-cols-2 gap-3">
            {banks.map((b) => (
              <div key={b.k} className="bank-tile rounded-xl border p-5 transition-all hover:bg-white/5" style={{ borderColor: p.pillarsBorder, opacity: 0 }}>
                <p style={{ fontFamily: fontDisplay, fontWeight: 500 }} className="text-xl">{b.k}</p>
                <p className="text-xs mt-0.5" style={{ color: p.pillarsTextMute }}>{b.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── NumbersBand ─── */
function NumbersBand() {
  const p = useContext(PaletteCtx);
  const [ref, visible] = useScrollReveal(0.25);

  const stats = [
    { v: '12L+', l: 'PKR tracked across early users' },
    { v: '8', l: 'Pakistani banks parsed natively' },
    { v: '12', l: 'Tools the AI can run on your data' },
    { v: '0', l: 'Numbers ever made up' },
  ];

  useEffect(() => {
    if (!visible || !ref.current) return;
    const vals = ref.current.querySelectorAll('.stat-val');
    const labels = ref.current.querySelectorAll('.stat-lbl');
    animate(vals, {
      opacity: [0, 1], translateY: [40, 0], scale: [0.85, 1],
      duration: 800, delay: stagger(100), ease: 'outExpo',
    });
    animate(labels, {
      opacity: [0, 1], translateY: [10, 0],
      duration: 600, delay: stagger(100, { start: 300 }), ease: 'outExpo',
    });
  }, [visible]);

  return (
    <section className="py-24 lg:py-32" style={{ background: p.numbersBg }}>
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        <div ref={ref} className="grid grid-cols-2 lg:grid-cols-4 gap-y-12 gap-x-6">
          {stats.map((s, i) => (
            <div key={i}>
              <p
                className="stat-val text-6xl lg:text-7xl mb-3"
                style={{ fontFamily: fontDisplay, fontWeight: 400, letterSpacing: '-0.03em', lineHeight: 0.9, opacity: 0 }}
              >
                {s.v}
              </p>
              <p className="stat-lbl text-sm max-w-[180px]" style={{ color: p.inkSoft, opacity: 0 }}>
                {s.l}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Trust ─── */
function Trust() {
  const p = useContext(PaletteCtx);
  const [headRef, headVisible] = useScrollReveal(0.2);
  const [cardsRef, cardsVisible] = useScrollReveal(0.1);

  useEffect(() => {
    if (!headVisible || !headRef.current) return;
    const words = headRef.current.querySelectorAll('.s-word');
    animate(words, {
      opacity: [0, 1], translateY: [40, 0], rotate: [-1.5, 0],
      duration: 900, delay: stagger(55), ease: 'outExpo',
    });
  }, [headVisible]);

  useEffect(() => {
    if (!cardsVisible || !cardsRef.current) return;
    const cards = cardsRef.current.querySelectorAll('.trust-card');
    animate(cards, {
      opacity: [0, 1], translateY: [32, 0],
      duration: 700, delay: stagger(100), ease: 'outExpo',
    });
  }, [cardsVisible]);

  const items = [
    {
      icon: ShieldCheck, title: 'Row-level security on every table',
      body: 'Postgres RLS denies all anon access by default. Even a leaked API key cannot read a row.'
    },
    {
      icon: Lock, title: 'Two-factor by default',
      body: 'Every sign-in needs a 6-digit code sent to your email. Sessions expire after 7 days.'
    },
    {
      icon: Fingerprint, title: 'Master PIN gate',
      body: 'A four-digit PIN you choose stands between casual eyes and your balance figures.'
    },
  ];

  return (
    <section id="trust" className="py-24 lg:py-32">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-12 gap-x-6 mb-16">
          <p className="col-span-12 lg:col-span-3 text-xs uppercase tracking-[0.18em] mb-4 lg:mb-0" style={{ color: p.mute }}>
            § A note on safety
          </p>
          <h2
            ref={headRef}
            className="col-span-12 lg:col-span-9 text-[36px] sm:text-[52px] lg:text-[64px] leading-[1.0]"
            style={{ fontFamily: fontDisplay, fontWeight: 400, letterSpacing: '-0.02em' }}
          >
            {'You bring the data.'.split(' ').map((w, i) => (
              <span key={`a${i}`} className="s-word inline-block opacity-0" style={{ marginRight: '0.2em' }}>{w}</span>
            ))}
            <br />
            <span className="s-word inline-block opacity-0" style={{ fontStyle: 'italic', color: p.brand, marginRight: '0.2em' }}>We keep it</span>
            {'to ourselves.'.split(' ').map((w, i) => (
              <span key={`b${i}`} className="s-word inline-block opacity-0" style={{ marginRight: '0.2em' }}>{w}</span>
            ))}
          </h2>
        </div>

        <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-3 gap-px" style={{ background: p.trustGrid }}>
          {items.map((it) => (
            <div key={it.title} className="trust-card p-8 lg:p-10" style={{ background: p.trustCardBg, opacity: 0 }}>
              <it.icon className="w-6 h-6 mb-6" style={{ color: p.brand }} strokeWidth={1.5} />
              <h3 style={{ fontFamily: fontDisplay, fontWeight: 500 }} className="text-xl lg:text-2xl mb-3 leading-tight">
                {it.title}
              </h3>
              <p className="text-[15px] leading-relaxed" style={{ color: p.inkSoft }}>{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── ClosingCta ─── */
function ClosingCta() {
  const p = useContext(PaletteCtx);
  const [headRef, headVisible] = useScrollReveal(0.2);
  const [ctaRef, ctaVisible] = useScrollReveal(0.3);

  useEffect(() => {
    if (!headVisible || !headRef.current) return;
    const words = headRef.current.querySelectorAll('.s-word');
    animate(words, {
      opacity: [0, 1], translateY: [50, 0], rotate: [-2, 0],
      duration: 1000, delay: stagger(65), ease: 'outExpo',
    });
  }, [headVisible]);

  useEffect(() => {
    if (!ctaVisible || !ctaRef.current) return;
    animate(ctaRef.current.children, {
      opacity: [0, 1], translateY: [16, 0],
      duration: 600, delay: stagger(80), ease: 'outExpo',
    });
  }, [ctaVisible]);

  return (
    <section className="py-32 lg:py-44">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-12 gap-x-6 items-end">
          <div className="col-span-12 lg:col-span-9">
            <p className="text-xs uppercase tracking-[0.18em] mb-8" style={{ color: p.mute }}>§ Step one</p>
            <h2
              ref={headRef}
              style={{ fontFamily: fontDisplay, fontWeight: 400, lineHeight: 0.95, letterSpacing: '-0.025em' }}
              className="text-[48px] sm:text-[80px] lg:text-[120px]"
            >
              {'Take your money'.split(' ').map((w, i) => (
                <span key={`a${i}`} className="s-word inline-block opacity-0" style={{ marginRight: '0.18em' }}>{w}</span>
              ))}
              <br />
              <span className="s-word inline-block opacity-0" style={{ fontStyle: 'italic', color: p.brand, marginRight: '0.1em' }}>
                <RotatingWord words={['seriously', 'calmly', 'thoughtfully', 'kindly']} interval={3200} />
              </span>
              <span className="s-word inline-block opacity-0">, gently.</span>
            </h2>
          </div>

          <div ref={ctaRef} className="col-span-12 lg:col-span-3 lg:pb-6 mt-10 lg:mt-0">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-full text-base font-medium transition-all hover:translate-x-1 group"
              style={{ background: p.ink, color: p.paper, opacity: 0 }}
            >
              Begin
              <ArrowUpRight className="w-5 h-5 transition-transform group-hover:rotate-45" />
            </Link>
            <p className="text-sm mt-4" style={{ color: p.inkSoft, opacity: 0 }}>
              Free while we're small.<br />No card asked. Cancel anytime.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function Footer() {
  const p = useContext(PaletteCtx);
  return (
    <footer className="border-t py-12" style={{ borderColor: p.divider }}>
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <img src={logosm} alt="" className="h-6 w-6" />
          <span style={{ fontFamily: fontDisplay, fontWeight: 500 }} className="text-base">
            FSWealth <span style={{ fontStyle: 'italic', color: p.brand }}>Axis</span>
          </span>
        </div>
        <p className="text-xs" style={{ color: p.mute, fontFamily: fontMono }}>
          © {new Date().getFullYear()} — Designed and built in Lahore.
        </p>
        <div className="flex items-center gap-5 text-sm flex-wrap" style={{ color: p.inkSoft }}>
          <Link to="/privacy" className="hover:opacity-70 transition-opacity">Privacy</Link>
          <Link to="/terms" className="hover:opacity-70 transition-opacity">Terms</Link>
          <Link to="/login" className="hover:opacity-70 transition-opacity">Sign in</Link>
          <Link to="/register" className="hover:opacity-70 transition-opacity">Start free</Link>
        </div>
      </div>
    </footer>
  );
}
