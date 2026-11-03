'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  Phone,
  Mail,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  CheckSquare,
  Square,
  Lightbulb,
  ExternalLink,
} from 'lucide-react';

interface CivicMarkdownProps {
  content: string;
  onOpenSource?: (sourceId: string) => void;
}

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'code'; lang: string; code: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'blockquote'; text: string }
  | { type: 'tip'; text: string }
  | { type: 'alert'; variant: 'guardrail' | 'civic'; text: string }
  | { type: 'ul'; items: { text: string; checked?: boolean }[] }
  | { type: 'ol'; items: string[] }
  | { type: 'hr' }
  | { type: 'paragraph'; lines: string[] };

export function CivicMarkdown({ content, onOpenSource }: CivicMarkdownProps) {
  if (!content) return null;

  const blocks = parseMarkdownBlocks(content);

  return (
    <div className="w-full text-[14.5px] sm:text-[15px] leading-[1.65] text-slate-800 font-normal">
      {blocks.map((block, bIdx) => {
        switch (block.type) {
          case 'heading': {
            const HeadingTag =
              block.level === 1
                ? 'h1'
                : block.level === 2
                  ? 'h2'
                  : block.level === 3
                    ? 'h3'
                    : 'h4';
            const sizeClass =
              block.level === 1
                ? 'text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-4 mb-2 first:mt-0'
                : block.level === 2
                  ? 'text-lg sm:text-xl font-bold tracking-tight text-slate-900 mt-3.5 mb-1.5 first:mt-0'
                  : block.level === 3
                    ? 'text-[16px] font-semibold tracking-tight text-slate-900 mt-3 mb-1 first:mt-0'
                    : 'text-[14.5px] font-semibold text-slate-800 mt-2.5 mb-1 first:mt-0';

            return (
              <HeadingTag key={`h-${bIdx}`} className={sizeClass}>
                <FormattedLine text={block.text} onOpenSource={onOpenSource} />
              </HeadingTag>
            );
          }

          case 'code':
            return <CodeBlock key={`code-${bIdx}`} lang={block.lang} code={block.code} />;

          case 'table':
            return (
              <div
                key={`tbl-${bIdx}`}
                className="my-3 w-full overflow-x-auto rounded-xl border border-slate-200/90 shadow-2xs"
              >
                <table className="w-full border-collapse text-left text-xs sm:text-[13.5px]">
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700">
                      {block.headers.map((h, hIdx) => (
                        <th key={`th-${hIdx}`} className="px-3 py-2 font-semibold tracking-tight">
                          <FormattedLine text={h} onOpenSource={onOpenSource} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {block.rows.map((row, rIdx) => (
                      <tr key={`tr-${rIdx}`} className="hover:bg-slate-50/50 transition-colors">
                        {row.map((cell, cIdx) => (
                          <td key={`td-${cIdx}`} className="px-3 py-2 text-slate-700">
                            <FormattedLine text={cell} onOpenSource={onOpenSource} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case 'blockquote':
            return (
              <blockquote
                key={`bq-${bIdx}`}
                className="my-2.5 border-l-3 border-emerald-500 bg-slate-50/80 px-3.5 py-1.5 text-slate-700 italic rounded-r-lg"
              >
                <FormattedLine text={block.text} onOpenSource={onOpenSource} />
              </blockquote>
            );

          case 'tip':
            return (
              <div
                key={`tip-${bIdx}`}
                className="my-2.5 rounded-xl border border-amber-200/90 bg-amber-50/70 p-3 text-amber-950 shadow-2xs"
              >
                <div className="flex items-start gap-2.5">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div className="flex-1 space-y-0.5 leading-relaxed">
                    <FormattedLine text={block.text} onOpenSource={onOpenSource} />
                  </div>
                </div>
              </div>
            );

          case 'alert':
            return (
              <div
                key={`alert-${bIdx}`}
                className={`my-2.5 rounded-xl border p-3.5 shadow-2xs ${
                  block.variant === 'guardrail'
                    ? 'border-rose-200/90 bg-rose-50/80 text-rose-950'
                    : 'border-blue-200/80 bg-blue-50/70 text-blue-950'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {block.variant === 'guardrail' ? (
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  ) : (
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  )}
                  <div className="flex-1 space-y-1">
                    <FormattedLine text={block.text} onOpenSource={onOpenSource} />
                  </div>
                </div>
              </div>
            );

          case 'ul':
            return (
              <ul key={`ul-${bIdx}`} className="my-2 space-y-1.5 pl-1.5">
                {block.items.map((item, iIdx) => (
                  <li key={`uli-${iIdx}`} className="flex items-start gap-2">
                    {item.checked !== undefined ? (
                      item.checked ? (
                        <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      ) : (
                        <Square className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      )
                    ) : (
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                    )}
                    <span className="flex-1">
                      <FormattedLine text={item.text} onOpenSource={onOpenSource} />
                    </span>
                  </li>
                ))}
              </ul>
            );

          case 'ol':
            return (
              <ol key={`ol-${bIdx}`} className="my-2 space-y-1.5 pl-1">
                {block.items.map((item, iIdx) => (
                  <li key={`oli-${iIdx}`} className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[11px] font-bold text-emerald-800 border border-emerald-200/80">
                      {iIdx + 1}
                    </span>
                    <span className="flex-1">
                      <FormattedLine text={item} onOpenSource={onOpenSource} />
                    </span>
                  </li>
                ))}
              </ol>
            );

          case 'hr':
            return <hr key={`hr-${bIdx}`} className="my-3 border-t border-slate-200" />;

          case 'paragraph':
            return (
              <p key={`p-${bIdx}`} className="mb-2.5 last:mb-0 leading-[1.65]">
                {block.lines.map((line, lIdx) => (
                  <React.Fragment key={`l-${lIdx}`}>
                    {lIdx > 0 && <br />}
                    <FormattedLine text={line} onOpenSource={onOpenSource} />
                  </React.Fragment>
                ))}
              </p>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 text-slate-100 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/90 px-3.5 py-1.5 text-xs text-slate-400">
        <span className="font-mono text-[11px] font-medium tracking-wide uppercase">
          {lang || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 text-slate-400" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 font-mono text-xs sm:text-[13px] leading-relaxed text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function parseMarkdownBlocks(text: string): Block[] {
  const lines = text.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Skip empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // Fenced Code Block: ```
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // consume closing ```
      blocks.push({ type: 'code', lang, code: codeLines.join('\n') });
      continue;
    }

    // Markdown Table: starts with | and next line has |---
    if (trimmed.startsWith('|') && i + 1 < lines.length && lines[i + 1].trim().match(/^\|(?:\s*:?-+:?\s*\|)+$/)) {
      const headers = trimmed
        .split('|')
        .slice(1, -1)
        .map((h) => h.trim());
      i += 2; // skip header and separator line
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const rowCells = lines[i]
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
        rows.push(rowCells);
        i++;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    // Horizontal Rule: --- or ***
    if (trimmed.match(/^(?:-{3,}|\*{3,}|_{3,})$/)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Civic Tip / Paalala: starts with 💡 or 📌 or Tip: or Paalala:
    if (
      trimmed.startsWith('💡') ||
      trimmed.startsWith('📌') ||
      trimmed.toLowerCase().startsWith('tip:') ||
      trimmed.toLowerCase().startsWith('paalala:')
    ) {
      blocks.push({ type: 'tip', text: trimmed });
      i++;
      continue;
    }

    // Alert Banner: starts with 🚨 or 🛡️ or **Guardrail Alert
    if (
      trimmed.startsWith('🚨') ||
      trimmed.startsWith('🛡️') ||
      trimmed.includes('**Guardrail Alert')
    ) {
      blocks.push({ type: 'alert', variant: 'guardrail', text: trimmed });
      i++;
      continue;
    }

    // Civic Callout: starts with 🇵🇭
    if (trimmed.startsWith('🇵🇭')) {
      blocks.push({ type: 'alert', variant: 'civic', text: trimmed });
      i++;
      continue;
    }

    // Blockquote: starts with >
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'blockquote', text: quoteLines.join(' ') });
      continue;
    }

    // Headings: #, ##, ###, ####
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      blocks.push({ type: 'heading', level, text: headingMatch[2].trim() });
      i++;
      continue;
    }

    // Unordered List: starts with - or *
    if (trimmed.match(/^[-*]\s+/)) {
      const items: { text: string; checked?: boolean }[] = [];
      while (i < lines.length && lines[i].trim().match(/^[-*]\s+/)) {
        const itemLine = lines[i].trim().replace(/^[-*]\s+/, '');
        // Check for task checklist: [ ] or [x]
        const checkMatch = itemLine.match(/^\[([ xX])\]\s*(.*)$/);
        if (checkMatch) {
          items.push({
            checked: checkMatch[1].toLowerCase() === 'x',
            text: checkMatch[2].trim(),
          });
        } else {
          items.push({ text: itemLine });
        }
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // Ordered List: starts with 1. or 2.
    if (trimmed.match(/^\d+\.\s+/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().match(/^\d+\.\s+/)) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // Regular Paragraph: gather lines until next blank line or structural block
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('|') &&
      !lines[i].trim().startsWith('>') &&
      !lines[i].trim().match(/^#{1,4}\s+/) &&
      !lines[i].trim().match(/^[-*]\s+/) &&
      !lines[i].trim().match(/^\d+\.\s+/) &&
      !lines[i].trim().match(/^(?:-{3,}|\*{3,}|_{3,})$/) &&
      !lines[i].trim().startsWith('🚨') &&
      !lines[i].trim().startsWith('🛡️') &&
      !lines[i].trim().startsWith('💡') &&
      !lines[i].trim().startsWith('📌') &&
      !lines[i].trim().toLowerCase().startsWith('tip:') &&
      !lines[i].trim().toLowerCase().startsWith('paalala:')
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }

    if (paraLines.length > 0) {
      blocks.push({ type: 'paragraph', lines: paraLines });
    }
  }

  return blocks;
}

function renderTextWithLinks(raw: string, onOpenSource?: (sourceId: string) => void) {
  // Match markdown links [label](https://...) and raw URLs (https://... or http://...)
  const subTokens = raw.split(/(\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<>)"]+)/g);

  return subTokens.map((st, i) => {
    if (!st) return null;

    // Markdown link: [label](url)
    const mdLinkMatch = st.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (mdLinkMatch) {
      const label = mdLinkMatch[1];
      const href = mdLinkMatch[2];
      return (
        <a
          key={`st-${i}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-900 hover:bg-emerald-50/70 rounded px-1 transition-colors"
        >
          <span>{label}</span>
          <ExternalLink className="inline h-3 w-3 shrink-0 ml-0.5 opacity-80" />
        </a>
      );
    }

    // Raw URL: https://...
    if (st.startsWith('http://') || st.startsWith('https://')) {
      let cleanUrl = st;
      let trailingPunct = '';
      const punctMatch = cleanUrl.match(/[.,;:)]+$/);
      if (punctMatch) {
        trailingPunct = punctMatch[0];
        cleanUrl = cleanUrl.slice(0, -trailingPunct.length);
      }

      return (
        <React.Fragment key={`st-${i}`}>
          <a
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-900 break-all transition-colors px-0.5"
          >
            <span>{cleanUrl}</span>
            <ExternalLink className="inline h-3 w-3 shrink-0 ml-0.5 opacity-80" />
          </a>
          {trailingPunct}
        </React.Fragment>
      );
    }

    return <React.Fragment key={`st-${i}`}>{st}</React.Fragment>;
  });
}

function FormattedLine({
  text,
  onOpenSource,
}: {
  text: string;
  onOpenSource?: (sourceId: string) => void;
}) {
  // Tokenize string for code (`...`), bold (**...**), italics (*...*)
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);

  return (
    <>
      {tokens.map((token, idx) => {
        if (!token) return null;

        // Inline Code `...`
        if (token.startsWith('`') && token.endsWith('`')) {
          const codeText = token.slice(1, -1);

          // Citizen's Charter Citation (e.g. `[NBI Citizen's Charter 2025]`)
          if (
            codeText.includes("Citizen's Charter") ||
            codeText.includes('Charter') ||
            codeText.includes('Helpline') ||
            codeText.startsWith('[')
          ) {
            let targetId = 'src-nbi-2025';
            const lower = codeText.toLowerCase();
            if (lower.includes('psa') || lower.includes('helpline')) targetId = 'src-psa-2025';
            if (lower.includes('philhealth')) targetId = 'src-philhealth-2025';

            // Clean subtle citation rather than loud button
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onOpenSource?.(targetId)}
                className="mx-0.5 inline-flex items-center gap-1 rounded bg-slate-100 hover:bg-emerald-50 hover:text-emerald-900 px-1.5 py-0.5 text-[11px] font-medium text-slate-700 align-baseline border border-slate-200/60 transition-colors cursor-pointer"
                title={`Tingnan ang batayan sa ${codeText}`}
              >
                <span>{codeText.replace(/^\[|\]$/g, '')}</span>
              </button>
            );
          }

          // Phone number / hotline
          if (/\b(?:\(?0\d{1,2}\)?\s*)?\d{3,4}[-\s]?\d{4}\b|\b137-772\b/.test(codeText)) {
            const cleanPhone = codeText.replace(/[^\d+]/g, '');
            return (
              <a
                key={idx}
                href={`tel:${cleanPhone}`}
                title={`Tumawag sa ${codeText}`}
                className="mx-0.5 inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[12px] font-semibold text-blue-700 hover:bg-blue-100 hover:underline transition-colors align-baseline"
              >
                <Phone className="h-2.5 w-2.5 text-blue-600 shrink-0" />
                <span>{codeText}</span>
              </a>
            );
          }

          // Email address
          if (codeText.includes('@')) {
            return (
              <a
                key={idx}
                href={`mailto:${codeText}`}
                title={`Mag-email sa ${codeText}`}
                className="mx-0.5 inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[12px] font-semibold text-blue-700 hover:bg-blue-100 hover:underline transition-colors align-baseline"
              >
                <Mail className="h-2.5 w-2.5 text-blue-600 shrink-0" />
                <span>{codeText}</span>
              </a>
            );
          }

          // Currency or Free (₱ or LIBRE)
          if (codeText.includes('₱') || codeText.toUpperCase().includes('LIBRE')) {
            return (
              <span
                key={idx}
                className="mx-0.5 inline-flex items-center gap-1 rounded-md border border-emerald-300/80 bg-emerald-100/70 px-1.5 py-0.5 text-[12px] font-bold text-emerald-900 align-baseline"
              >
                <CheckCircle2 className="h-3 w-3 text-emerald-700 shrink-0" />
                <span>{codeText}</span>
              </span>
            );
          }

          // Generic mono chip
          return (
            <code
              key={idx}
              className="mx-0.5 rounded-[5px] border border-slate-200/80 bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] font-medium text-slate-800 align-baseline"
            >
              {codeText}
            </code>
          );
        }

        // Bold **...**
        if (token.startsWith('**') && token.endsWith('**')) {
          const boldText = token.slice(2, -2);
          return (
            <strong key={idx} className="font-semibold text-slate-900">
              {renderTextWithLinks(boldText, onOpenSource)}
            </strong>
          );
        }

        // Italics *...*
        if (token.startsWith('*') && token.endsWith('*')) {
          const italicText = token.slice(1, -1);
          return (
            <em key={idx} className="italic text-slate-700">
              {renderTextWithLinks(italicText, onOpenSource)}
            </em>
          );
        }

        // Plain text with clickable links
        return (
          <React.Fragment key={idx}>
            {renderTextWithLinks(token, onOpenSource)}
          </React.Fragment>
        );
      })}
    </>
  );
}
