import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import logosm from '../assets/logosm.svg';

const fontDisplay = `'Fraunces', 'Cormorant Garamond', 'EB Garamond', Georgia, serif`;
const fontBody    = `'DM Sans', 'Inter', system-ui, -apple-system, sans-serif`;
const fontMono    = `'JetBrains Mono', ui-monospace, monospace`;

export default function LegalPageShell({ title, lastUpdated, children }) {
  return (
    <div
      className="min-h-screen bg-[#f5f0e6] text-[#0e0f12] dark:bg-neutral-950 dark:text-neutral-100"
      style={{ fontFamily: fontBody }}
    >
      <header className="border-b border-black/10 dark:border-white/10">
        <div className="max-w-[860px] mx-auto px-6 lg:px-10 py-6 flex items-center justify-between">
          <Link to="/welcome" className="flex items-center gap-2.5 hover:opacity-70 transition-opacity">
            <img src={logosm} alt="" className="h-6 w-6" />
            <span style={{ fontFamily: fontDisplay, fontWeight: 500 }} className="text-base">
              FSWealth <span className="italic text-[#0a5c3b] dark:text-emerald-400">Axis</span>
            </span>
          </Link>
          <Link
            to="/welcome"
            className="inline-flex items-center gap-1.5 text-xs hover:opacity-70 transition-opacity"
            style={{ fontFamily: fontMono }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            BACK
          </Link>
        </div>
      </header>

      <main className="max-w-[860px] mx-auto px-6 lg:px-10 py-16 lg:py-24">
        <div className="mb-12">
          <p
            className="text-[10px] tracking-[0.18em] uppercase mb-3 text-[#94908a] dark:text-neutral-400"
            style={{ fontFamily: fontMono }}
          >
            Legal · Last updated {lastUpdated}
          </p>
          <h1
            className="text-4xl lg:text-5xl leading-[1.05]"
            style={{ fontFamily: fontDisplay, fontWeight: 400 }}
          >
            {title}
          </h1>
        </div>

        <article className="legal-prose space-y-7 text-[15px] leading-[1.75] text-[#3a3a3f] dark:text-neutral-300">
          {children}
        </article>

        <footer className="mt-20 pt-8 border-t border-black/10 dark:border-white/10 text-xs text-[#94908a] dark:text-neutral-500" style={{ fontFamily: fontMono }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span>© {new Date().getFullYear()} FSWealth Axis</span>
            <div className="flex items-center gap-5">
              <Link to="/privacy" className="hover:opacity-70 transition-opacity">Privacy</Link>
              <Link to="/terms" className="hover:opacity-70 transition-opacity">Terms</Link>
              <Link to="/welcome" className="hover:opacity-70 transition-opacity">Home</Link>
            </div>
          </div>
        </footer>
      </main>

      <style>{`
        .legal-prose h2 {
          font-family: ${fontDisplay};
          font-weight: 500;
          font-size: 1.5rem;
          line-height: 1.3;
          margin-top: 2.5rem;
          margin-bottom: 0.75rem;
          color: #0e0f12;
        }
        .dark .legal-prose h2 { color: #f5f5f5; }
        .legal-prose h3 {
          font-family: ${fontBody};
          font-weight: 600;
          font-size: 1rem;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          color: #0e0f12;
        }
        .dark .legal-prose h3 { color: #f5f5f5; }
        .legal-prose p { margin: 0; }
        .legal-prose ul {
          margin: 0;
          padding-left: 1.25rem;
          list-style: disc;
        }
        .legal-prose ul li { margin-bottom: 0.4rem; }
        .legal-prose strong { color: #0e0f12; font-weight: 600; }
        .dark .legal-prose strong { color: #f5f5f5; }
        .legal-prose a {
          color: #0a5c3b;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .dark .legal-prose a { color: #34d399; }
      `}</style>
    </div>
  );
}
