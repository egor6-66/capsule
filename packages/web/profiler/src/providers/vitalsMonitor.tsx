import {
  type JSX,
  createContext,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  useContext,
} from 'solid-js';
import { Dashboard } from '../components';
import {
  connectionCollector,
  memoryCollector,
  navigationCollector,
  networkCollector,
  webVitalsCollector,
} from '../collectors';
import { createMetricsBus } from '../core/bus';
import type { IMetricId, IMetricMeta, IMetricSample, IMetricsBus } from '../core/schema';

/** @deprecated use `useProfiler()` from `@capsuletech/web-profiler/api` (coming in Phase 2b). */
export interface IMonitoringContextType {
  updateComponentMetric: (name: string, value: number | string) => void;
  /** @internal */
  bus: IMetricsBus;
}

export const VitalsMonitoringContext = createContext<IMonitoringContextType | undefined>(undefined);

export interface VitalsMonitoringProviderProps {
  children: JSX.Element;
  showDashboard?: boolean;
}

const LEGACY_LABEL: Partial<Record<IMetricId, string>> = {
  cls: 'CLS',
  fcp: 'FCP',
  lcp: 'LCP',
  inp: 'INP',
  ttfb: 'TTFB',
  memory: '💻 Memory Usage',
  'network.transfer': '📡 Network Load',
  'network.decoded': '📦 Total Bundle',
  'dom.ready': '⏱️ Dom Ready',
  connection: '🌐 Network',
};

function toLegacyKey(id: IMetricId, meta: IMetricMeta | undefined): string {
  const fromTable = LEGACY_LABEL[id];
  if (fromTable) return fromTable;
  if (id.startsWith('custom.')) return meta?.label ?? id.slice('custom.'.length);
  return meta?.label ?? id;
}

export function VitalsMonitoringProvider(props: VitalsMonitoringProviderProps) {
  const bus = createMetricsBus();
  const showDashboard = () => props.showDashboard !== false;

  const [displayMetrics, setDisplayMetrics] = createSignal<Record<string, number | string>>({});
  const displayRef: Record<string, number | string> = {};
  let rafId: number | null = null;

  const scheduleFlush = () => {
    if (rafId !== null) return;
    if (typeof requestAnimationFrame === 'undefined') {
      setDisplayMetrics({ ...displayRef });
      return;
    }
    rafId = requestAnimationFrame(() => {
      setDisplayMetrics({ ...displayRef });
      rafId = null;
    });
  };

  const writeDisplay = (id: IMetricId, sample: IMetricSample, meta: IMetricMeta) => {
    const key = toLegacyKey(id, meta);
    if (displayRef[key] === sample.value) return;
    displayRef[key] = sample.value;
    scheduleFlush();
  };

  const updateComponentMetric = (name: string, value: number | string) => {
    bus.write(`custom.${name}` as IMetricId, value, { label: name });
  };

  onMount(() => {
    const unsubscribe = bus.subscribe(writeDisplay);
    const cleanups = [
      webVitalsCollector().init(bus),
      memoryCollector().init(bus),
      networkCollector().init(bus),
      navigationCollector().init(bus),
      connectionCollector().init(bus),
    ];

    onCleanup(() => {
      unsubscribe();
      for (const cleanup of cleanups) cleanup();
      if (rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(rafId);
      }
    });
  });

  const contextValue = createMemo<IMonitoringContextType>(() => ({
    updateComponentMetric,
    bus,
  }));

  return (
    <VitalsMonitoringContext.Provider value={contextValue()}>
      {props.children}
      {showDashboard() && <Dashboard metrics={displayMetrics()} />}
    </VitalsMonitoringContext.Provider>
  );
}

export function useVitalsContext(): IMonitoringContextType | undefined {
  return useContext(VitalsMonitoringContext);
}
