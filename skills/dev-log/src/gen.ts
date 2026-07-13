/**
 * `dev-log gen` — generate a paste-ready log statement for any language.
 *
 * The AI passes --lang, --type, --data (and optionally --ready) and gets back a
 * single code snippet it can drop into the user's source. No manual template
 * lookup, no placeholder substitution, no per-language SKILL.md section.
 */
import { randomBytes } from 'crypto';
import { renderLog, SUPPORTED_LANGS } from './templates.js';

export function newSessionId(): string {
  return 'sess_' + randomBytes(4).toString('hex');
}

export interface GenOptions {
  lang: string;
  type?: string;
  data?: string;
  ready?: boolean;
  /** When omitted a fresh sessionId is generated. */
  sessionId?: string;
  /** Endpoint URL; defaults to local fixed port. */
  url?: string;
}

export function generate(opts: GenOptions): string {
  const lang = opts.lang.toLowerCase();
  if (!SUPPORTED_LANGS.includes(lang)) {
    throw new Error(
      `Unsupported language: ${opts.lang}. Supported: ${SUPPORTED_LANGS.join(', ')}`
    );
  }

  return renderLog({
    lang,
    url: opts.url || 'http://localhost:7331',
    sessionId: opts.sessionId || newSessionId(),
    type: opts.ready ? '__ready__' : opts.type || 'state',
    data: opts.data,
    ready: opts.ready,
  });
}
