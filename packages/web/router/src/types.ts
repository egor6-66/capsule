import type { AnyRoute, AnyRouter, RouterCore } from '@tanstack/router-core';

/**
 * Контекст роутера на старте — пробрасывается в каждый route как `match.context`.
 * Используется для guards (например, `beforeLoad` с проверкой `isAuthenticated`).
 */
export interface ICapsuleRouterContext {
  isAuthenticated?: boolean;
  [k: string]: unknown;
}

/**
 * Публичный API роутера, который инжектится в Controller/Feature через `services.router`.
 * Скрывает детали TanStack — если когда-то поменяем движок, signature останется.
 *
 * Generic `TRouteTree` пробрасывается в `raw` для типизированного escape-hatch'а
 * (`raw.navigate({...})` с autocomplete-маршрутами). По умолчанию — `AnyRoute`,
 * что эквивалентно прежнему `AnyRouter` контракту.
 */
export interface ICapsuleRouter<TRouteTree extends AnyRoute = AnyRoute> {
  goTo(path: string, params?: Record<string, unknown>): void;
  back(): void;
  current(): string;
  /** Escape hatch для случаев, когда нужны API-возможности TanStack напрямую. */
  raw: RouterCore<TRouteTree, any, any, any, any>;
}

/**
 * Опции фабрики. `routeTree` обязателен, generic выводится из него; `context` —
 * initial-context роутера для guards.
 */
export interface ICreateRouterOpts<TRouteTree extends AnyRoute = AnyRoute> {
  routeTree: TRouteTree;
  context?: ICapsuleRouterContext;
}

/**
 * Пакетная обёртка над сырым TanStack-роутером. Вынесена отдельно от `createRouter`,
 * чтобы её можно было тестировать без value-импорта `@tanstack/solid-router`
 * (тот тянет клиентские Solid-API и падает в node-env). Принимает любой
 * `AnyRouter` — generic'и выведутся в публичной фабрике.
 */
export const wrap = <TRouteTree extends AnyRoute = AnyRoute>(
  raw: AnyRouter,
): ICapsuleRouter<TRouteTree> => ({
  raw: raw as RouterCore<TRouteTree, any, any, any, any>,
  goTo: (path, params) => {
    raw.navigate({ to: path, params } as never);
  },
  back: () => {
    raw.history.back();
  },
  current: () => raw.state.location.pathname,
});
