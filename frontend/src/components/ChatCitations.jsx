import { FileText } from 'lucide-react';

/** The uploaded documents an answer drew on, and when its figures were read. */
export default function ChatCitations({ citations, tools }) {
    const sources = Array.isArray(citations) ? citations : [];
    const asOf = Array.isArray(tools) && tools[0]?.at ? new Date(tools[0].at) : null;
    if (!sources.length && !asOf) return null;

    return (
        <div className="ml-11 mt-1 space-y-1 text-[11px] text-gray-500 dark:text-gray-400">
            {sources.length > 0 && (
                <details className="group">
                    <summary className="cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200">
                        Sources ({sources.length})
                    </summary>
                    <ul className="mt-1 space-y-1">
                        {sources.map((c) => (
                            <li key={c.ref} className="flex gap-1.5">
                                <FileText className="w-3 h-3 mt-0.5 shrink-0" aria-hidden="true" />
                                <span>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">[{c.ref}] {c.filename}</span>
                                    {c.excerpt ? <span className="block text-gray-400 dark:text-gray-500">“{c.excerpt}…”</span> : null}
                                </span>
                            </li>
                        ))}
                    </ul>
                </details>
            )}
            {asOf && <p>Figures as of {asOf.toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}</p>}
        </div>
    );
}
