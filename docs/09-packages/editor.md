---
tags: [09-packages, editor]
status: documented
type: guide
---

# 🧩 @capsuletech/web-editor

> [!info]
> Design-time зона визуального редактора UI: реестр спецификаций компонентов, операции над JSON-деревом и generic-инспектор пропсов. Три ранее-отдельных пакета (`web-manifests` + `web-editor-state` + `web-inspector`) слиты в один с subpath exports.

Runtime-рендер по JSON-схеме — в отдельном пакете [[renderer|@capsuletech/web-renderer]] (там нет zod/lucide-deps, подходит для прода без overhead'а редактора).

## Структура

```
packages/web/editor/src/
├── index.ts                реэкспорт всех трёх subpaths
├── manifests/              реестр спецификаций компонентов
│   ├── index.ts            getManifest / getAllManifests / getCategories / listByCategory / canAcceptChild / summarize
│   ├── registry.ts         список всех manifests + by-type lookup
│   ├── manifests/          5 манифестов: animate, button, card, field, input
│   │   └── *.tsx
│   └── types.ts            IComponentManifest, IManifestSummary, ComponentCategory
├── state/                  операции над JSON-деревом редактора
│   ├── index.ts            addNode / removeNode / moveNode / updateNode / reorderChildren / createEmptyTree / ROOT_ID / generateId / createEditorSchema / EditorOpError
│   ├── operations.ts       pure-функции tree-операций
│   ├── ids.ts              generateId + ROOT_ID константа
│   ├── schema.ts           createEditorSchema(opts) — XState-схема для FSM-редактора
│   └── types.ts            IEditorTree, IEditorNode, NodeId, IEditorContext, payload-типы
└── inspector/              generic UI для редактирования полей
    ├── index.ts            Inspector / Category / renderField / parseUnit / formatUnit
    ├── Inspector.tsx       корневой UI с categories
    ├── Category.tsx        collapsible-секция
    ├── fields/             6 типов полей: text / textarea / number / number-unit / boolean / select
    └── types.ts            IFieldDef, ICategory, IInspectorProps, OnChangeFn, ValuesMap
```

## Точки входа

`package.json` экспортирует 4 подпути:

```jsonc
{
  "exports": {
    ".":           ".../dist/index.mjs",
    "./manifests": ".../dist/manifests.mjs",
    "./state":     ".../dist/state.mjs",
    "./inspector": ".../dist/inspector.mjs"
  }
}
```

Импортируй через subpath для лучшего tree-shaking:

```ts
import { getManifest, canAcceptChild } from '@capsuletech/web-editor/manifests';
import { addNode, moveNode }           from '@capsuletech/web-editor/state';
import { Inspector }                   from '@capsuletech/web-editor/inspector';
```

Корневой импорт `from '@capsuletech/web-editor'` тоже работает — реэкспортит всё.

## Manifest

`IComponentManifest` описывает один компонент для редактора:

```ts
export const ButtonManifest: IComponentManifest = {
  type: 'ui.Button',                          // dot-path в registry
  label: 'Button',
  category: 'control',
  icon: () => <MousePointerClick size={16} />,
  isLeaf: true,                               // детей быть не может
  defaultProps: { variant: 'default', children: 'Button' },
  propsSchema: z.object({                     // zod-схема для инспектора
    variant: z.enum(['default', 'destructive', ...]).default('default'),
    children: z.string().default('Button'),
  }),
};
```

Поля:
- `type` — dot-path для [[renderer|renderer'а]] (тот же ключ, что в JSON-схеме).
- `category` — `'control' | 'typography' | 'container' | 'composite' | 'feedback' | 'wrapper'` (закрытый список).
- `isLeaf` / `accepts(childType)` — drag-n-drop валидации.
- `styleSlots` — имена стилевых слотов для составных компонентов.
- `canBeRoot` — soft-rule, не enforced renderer'ом.

`getManifest(type)` — резолв по `node.type`. `canAcceptChild(parentType, childType)` — drop-валидация. `listByCategory(cat)` — для секций палитры.

## State

Operations — pure-функции над `IEditorTree`:

```ts
const tree = createEmptyTree('ui.Card');
const next = addNode(tree, {
  type: 'ui.Button',
  parentId: tree.root,
});
```

Все операции **возвращают новое дерево**, не мутируют исходное. Если операция нелегальна (например, `addNode` с `parent.isLeaf === true`) — бросают `EditorOpError`.

`createEditorSchema(opts)` собирает XState-схему для FSM-обёртки редактора (если ты хочешь сделать редактор как `Feature`).

## Inspector

Generic UI для редактирования полей — Inspector НЕ знает про manifests на уровне типов. Принимает `categories: ICategory[]`:

```tsx
<Inspector
  categories={[
    {
      id: 'basic',
      label: 'Основное',
      fields: [
        { key: 'children', type: 'text', label: 'Label' },
        { key: 'variant', type: 'select', label: 'Variant', options: [...] },
      ],
    },
  ]}
  values={values()}
  onChange={(key, value) => setValues((p) => ({ ...p, [key]: value }))}
/>
```

Дискриминированный union `IFieldDef` по `type`:
- `'text' | 'textarea'` — строки (с mono-флагом для технических полей).
- `'number'` — числа.
- `'number-unit'` — число с единицей (`'100px'`, `'50%'`, `'auto'`).
- `'boolean'` — чекбокс.
- `'select'` — dropdown с `options`.

**Конвертер `manifest.propsSchema → IFieldDef[]`** в пакете сейчас не предоставлен — это design decision (Inspector остаётся generic, конвертер пишется на стороне приложения). См. `apps/sandbox/src/widgets/demos/inspector.tsx` за примером.

## Связанное

- [[renderer|@capsuletech/web-renderer]] — runtime для JSON-схем (без manifests-deps).
- [[shape]] — фабрика для data-форм (Shape ≠ Manifest: Shape про runtime-данные, Manifest про edit-time).
