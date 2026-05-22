import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Right-side offcanvas drawer. Mounts when `open` is true, slides in
 * with a CSS transition, dims the rest of the page behind a backdrop.
 *
 * Usage:
 *   <Drawer open={open} onClose={() => setOpen(false)} title="…">
 *     …body…
 *   </Drawer>
 */
export default function Drawer({ open, onClose, title, subtitle, children, footer, width = 'md' }) {
    useEffect(() => {
        if (!open) return;
        function onKey(e) { if (e.key === 'Escape') onClose?.(); }
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [open, onClose]);

    const widthClass = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
    }[width] || 'max-w-md';

    return (
        <div
            aria-hidden={!open}
            className={`fixed inset-0 z-[80] ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
        >
            {/* Backdrop */}
            <div
                onClick={onClose}
                className={`absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ${
                    open ? 'opacity-100' : 'opacity-0'
                }`}
            />

            {/* Panel */}
            <aside
                role="dialog"
                aria-modal="true"
                className={`absolute top-0 right-0 h-full w-full ${widthClass} bg-white dark:bg-neutral-950 border-l border-gray-200 dark:border-neutral-800 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
                    open ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-200 dark:border-neutral-800 shrink-0">
                    <div className="min-w-0">
                        {subtitle && (
                            <p className="text-[10px] uppercase tracking-[0.16em] text-gray-400 dark:text-neutral-500 font-semibold mb-1">
                                {subtitle}
                            </p>
                        )}
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {title}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors shrink-0"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {children}
                </div>

                {footer && (
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900/60 shrink-0">
                        {footer}
                    </div>
                )}
            </aside>
        </div>
    );
}
