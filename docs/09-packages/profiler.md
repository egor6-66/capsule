---
tags: [09-packages, profiler]
status: documented
type: guide
---

# 📊 @capsuletech/web-profiler

> [!info]
> Performance-мониторинг для Solid-приложений: Web Vitals (CLS / FCP / INP / LCP / TTFB) + memory + network + connection-type + dashboard. Lightweight, non-intrusive — оборачивает приложение в один провайдер.

## Структура

```
packages/web/profiler/src/
├── index.ts                 реэкспорт всех subpaths
├── providers/
│   ├── index.ts             VitalsMonitoringProvider / useVitalsContext / VitalsMonitoringContext + типы
│   └── vitalsMonitor.tsx    Solid Context-провайдер на createSignal'ах
├── components/
│   ├── index.ts             Dashboard
│   └── dashboard.tsx        UI с метриками
└── utils.ts                 web-vitals integration (onCLS/onFCP/onINP/onLCP/onTTFB) + memory/network helpers
```

## Точки входа

```jsonc
{
  "exports": {
    ".":             ".../dist/index.mjs",
    "./providers":   ".../dist/providers.mjs",
    "./components":  ".../dist/components.mjs"
  }
}
```

## Использование

Оборачивай app в `VitalsMonitoringProvider`:

```tsx
import { VitalsMonitoringProvider } from '@capsuletech/web-profiler/providers';

export default function App() {
  return (
    <VitalsMonitoringProvider>
      <YourComponent />
    </VitalsMonitoringProvider>
  );
}
```

В Capsule-приложениях это обычно делается через [[core|BaseProviders]] с prop `vitals={true}` — провайдер подключается опционально, чтобы прод-бандлы apps/<app> не тянули overhead профайлера без необходимости.

Доступ к метрикам внутри компонентов:

```tsx
import { useVitalsContext } from '@capsuletech/web-profiler/providers';

const MyComponent = () => {
  const context = useVitalsContext();
  return <div>FCP: {context.fcp()?.value}</div>;
};
```

## Какие метрики

- **FCP** — First Contentful Paint.
- **LCP** — Largest Contentful Paint.
- **CLS** — Cumulative Layout Shift.
- **INP** — Interaction to Next Paint.
- **TTFB** — Time to First Byte.
- **Memory Usage** — JavaScript heap (через `performance.memory`, Chromium-only).
- **Network Load** — суммарный transferred-size resources.
- **Bundle Size** — суммарный resource bundle size.
- **Connection Type** — speed/effectiveType (через `navigator.connection`).

Все метрики имеют `rating`: `'good' | 'needs-improvement' | 'poor'` по Web Vitals thresholds.

## Dashboard

Опциональный визуальный overlay (для dev/staging). Подключается через `<VitalsMonitoringProvider showDashboard>{...}</VitalsMonitoringProvider>` или импортируется напрямую из `/components`:

```tsx
import { Dashboard } from '@capsuletech/web-profiler/components';
```

## Связанное

- [[core|@capsuletech/web-core]] — `BaseProviders` интегрирует `VitalsMonitoringProvider` по prop `vitals`.
