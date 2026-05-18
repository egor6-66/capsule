---
tags: [09-packages, renderer]
status: documented
type: guide
---

# 🖥️ @capsuletech/web-renderer

> [!info]
> Чистый runtime для рендера UI по JSON-схеме. Принимает дерево узлов + `registry` с компонентами по dot-path'у и эмиттит Solid JSX. Без deps на zod/manifests — design-time концерны живут в [[editor|@capsuletech/web-editor]].

## Концепция

Page-builder result viewer / CMS-runtime / editor-preview. Берёт `ISchema` (компоненты + интеракции), резолвит каждый `node.type` через `registry`-объект (`'ui.Button'` → `registry.ui.Button`) и рендерит дерево с children-связями. Stateless, без mutation.

```tsx
import { Renderer, type ISchema } from '@capsuletech/web-renderer';

const schema: ISchema = {
  components: {
    root: 'r',
    nodes: {
      r: { id: 'r', type: 'ui.Card', parentId: null, children: ['b1'] },
      b1: { id: 'b1', type: 'ui.Button', parentId: 'r', children: [],
            props: { children: 'Click', variant: 'default' } },
    },
  },
};

<Renderer
  schema={schema}
  registry={{
    ui: { Button, Card },
    Entities: { Viewer: { LoginForm } },
  }}
  mode="controlled"
/>
```

## Структура

```
packages/web/renderer/src/
├── index.ts        Renderer / resolvePath + types
├── renderer.tsx    основной компонент
├── resolve.ts      path → component lookup в registry
└── types.ts        ISchema / IEditorNode / IInteraction / RenderMode / Registry / IRendererProps
```

## RenderMode

Монотонная шкала возможностей:

| Mode | Поведение |
|---|---|
| `'static'` | Только `components`, `interactions` игнорируются. |
| `'controlled'` (default) | + `interactions.ref` на готовые Controllers/Features из registry (v1). |
| `'full'` | + `interactions.inline` JSON FSM-конфиг (v1.2+, not implemented). |

Каждый следующий — строгий супер-сет предыдущего: апгрейд `static` → `controlled` не сломает JSON.

## IEditorNode

```ts
interface IEditorNode {
  id: NodeId;
  type: string;                          // dot-path в registry
  parentId: NodeId | null;
  children: NodeId[];                    // порядок имеет значение
  props?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  styles?: Record<string, string>;
}
```

Stateless — никаких `selected`/`hover` флагов (это концерн редактора, хранится вне дерева).

## IInteraction

Привязка поведения к поддереву:

```ts
interface IInteraction {
  id: string;
  nodeId: NodeId;                        // узел и его потомки
  kind: 'controller' | 'feature';
  ref?: string;                          // dot-path: 'Controllers.Universal.Form'
  props?: Record<string, unknown>;       // overrides и т.п.
  inline?: Record<string, unknown>;      // JSON FSM (только в 'full', not implemented)
}
```

В моде `controlled` `inline` игнорируется с DEV-warning'ом.

## Registry

`Registry = Record<string, any>` — произвольной формы объект, в котором renderer ходит по ключам:

```ts
const registry = {
  ui: { Button, Input, Field, Layout, ... },
  Entities: { Viewer: { LoginForm } },
  Widgets: { Forms: { Auth } },
  Controllers: { Universal: { Form } },
  Features: { ... },
};
```

`node.type = 'Entities.Viewer.LoginForm'` → `resolvePath(registry, 'Entities.Viewer.LoginForm')` → компонент. Нет — `fallback` компонент рендерится (если задан в props), иначе тихий skip с DEV-warn'ом.

## Связанное

- [[editor|@capsuletech/web-editor]] — design-time стороны (manifests / state / inspector). Renderer-runtime отделён от него специально — prod-апп может консьюмить renderer без overhead'а редактора.
- [[core|@capsuletech/web-core]] — `Entities`/`Widgets`/`Controllers` registry, который часто скармливается renderer'у через `registry` prop.
