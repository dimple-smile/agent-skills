import { describe, it, expect } from 'vitest';
import { generate, newSessionId } from '../src/gen.js';

describe('newSessionId', () => {
  it('produces a sess_ + 8 hex chars id', () => {
    const id = newSessionId();
    expect(id).toMatch(/^sess_[0-9a-f]{8}$/);
  });

  it('produces unique ids', () => {
    const a = newSessionId();
    const b = newSessionId();
    expect(a).not.toBe(b);
  });
});

describe('generate - language support', () => {
  const LANGS = [
    'js', 'ts', 'python', 'go', 'swift', 'kotlin',
    'dart', 'cpp', 'rust', 'java', 'csharp', 'php', 'ruby',
  ];

  for (const lang of LANGS) {
    it(`emits a ${lang} snippet containing the endpoint and session`, () => {
      const code = generate({ lang, sessionId: 'sess_aaaaaaaa', type: 'state', data: 'DATA' });
      expect(code).toContain('http://localhost:7331');
      expect(code).toContain('sess_aaaaaaaa');
      expect(code).toContain('state');
      expect(code).toContain('DATA');
    });
  }

  it('is case-insensitive on lang', () => {
    const lower = generate({ lang: 'python', type: 'state' });
    const upper = generate({ lang: 'PYTHON', type: 'state' });
    expect(upper).toBe(lower);
  });

  it('throws on unsupported language', () => {
    expect(() => generate({ lang: 'brainfuck', type: 'state' })).toThrow(/Unsupported language/);
  });
});

describe('generate - ready probe', () => {
  it('emits __ready__ type when ready is set', () => {
    const code = generate({ lang: 'js', ready: true, sessionId: 'sess_aaaaaaaa' });
    expect(code).toContain('__ready__');
    // ready log should NOT include the user-supplied data
    expect(code).toContain('location.href');
    expect(code).toContain('location.protocol');
  });

  it('ready overrides --type', () => {
    const code = generate({ lang: 'js', ready: true, type: 'error' });
    expect(code).toContain('__ready__');
    expect(code).not.toContain("'error'");
  });
});

describe('generate - defaults', () => {
  it('defaults type to state', () => {
    const code = generate({ lang: 'js' });
    expect(code).toContain("'state'");
  });

  it('generates a session id when none provided', () => {
    const code = generate({ lang: 'js' });
    expect(code).toMatch(/sess_[0-9a-f]{8}/);
  });

  it('accepts a custom url', () => {
    const code = generate({ lang: 'js', url: 'https://abc.loca.lt' });
    expect(code).toContain('https://abc.loca.lt');
  });
});
