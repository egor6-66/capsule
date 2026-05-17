import { describe, expect, it, vi } from 'vitest';
import { wrap } from '../types';

// wrap(raw) — pure обёртка над TanStack-роутером (AnyRouter), вынесена в types.ts
// без value-импорта @tanstack/solid-router. Благодаря этому покрывается в
// node-env без jsdom.
//
// Сам createRouter() тут не тестируется: он value-импортит @tanstack/solid-router,
// который тянет клиентские Solid-API (CatchBoundary и т.п.) и падает в node.
// Интеграция createRouter <-> wrap тривиальна — её держит apps/*/bootstrap.tsx
// как end-to-end smoke.

const mkRaw = (overrides: Partial<any> = {}) => {
  const navigate = vi.fn();
  const historyBack = vi.fn();
  const raw = {
    navigate,
    state: { location: { pathname: '/cur' } },
    history: { back: historyBack },
    options: { context: {} },
    ...overrides,
  } as any;
  return { raw, navigate, historyBack };
};

describe('wrap — shape', () => {
  it('returns ICapsuleRouter with goTo/back/current/raw', () => {
    const { raw } = mkRaw();
    const w = wrap(raw);
    expect(typeof w.goTo).toBe('function');
    expect(typeof w.back).toBe('function');
    expect(typeof w.current).toBe('function');
    expect(w.raw).toBe(raw);
  });
});

describe('wrap — goTo', () => {
  it('delegates to raw.navigate with { to, params }', () => {
    const { raw, navigate } = mkRaw();
    wrap(raw).goTo('/foo', { id: 1 });
    expect(navigate).toHaveBeenCalledWith({ to: '/foo', params: { id: 1 } });
  });

  it('passes undefined params if omitted', () => {
    const { raw, navigate } = mkRaw();
    wrap(raw).goTo('/bar');
    expect(navigate).toHaveBeenCalledWith({ to: '/bar', params: undefined });
  });

  it('does not throw on empty path', () => {
    const { raw, navigate } = mkRaw();
    expect(() => wrap(raw).goTo('')).not.toThrow();
    expect(navigate).toHaveBeenCalledWith({ to: '', params: undefined });
  });
});

describe('wrap — back', () => {
  it('delegates to raw.history.back (не window.history напрямую)', () => {
    const { raw, historyBack } = mkRaw();
    wrap(raw).back();
    expect(historyBack).toHaveBeenCalledOnce();
  });
});

describe('wrap — current', () => {
  it('returns raw.state.location.pathname', () => {
    const { raw } = mkRaw();
    expect(wrap(raw).current()).toBe('/cur');
  });

  it('reads pathname dynamically (не закешировано)', () => {
    const { raw } = mkRaw();
    const w = wrap(raw);
    expect(w.current()).toBe('/cur');
    raw.state.location.pathname = '/next';
    expect(w.current()).toBe('/next');
  });
});
