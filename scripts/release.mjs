#!/usr/bin/env node
/**
 * release — обёртка над `nx release` для двух сценариев:
 *
 *   1. DEV (по умолчанию) → publish в локальный verdaccio
 *      pnpm release:local                          # bump по conventional-commits с момента tag'а
 *      pnpm release:local -- patch                 # явный patch-бамп
 *      pnpm release:local -- minor                 # минорный
 *      pnpm release:local -- --first-release       # только при ПЕРВОМ релизе (нет git tag)
 *
 *   2. PROD (`--mode=prod`) → требует явный `--registry=<url>`
 *      pnpm release:prod -- patch --registry=https://registry.npmjs.org
 *      pnpm release:prod -- --registry=https://nexus.company.com/repo/npm/
 *
 * Specifier (позиционный аргумент, передаётся как есть в `nx release`):
 *   patch | minor | major | prerelease | 1.2.3 | <отсутствует — conventional-commits>
 *
 * Авторизация (опционально):
 *   NPM_AUTH_TOKEN — bearer-token для хоста из --registry. Пишется во временный
 *   .npmrc на время публикации, чистится в finally + on SIGINT.
 *
 * Verdaccio URL переопределяется через NPM_REGISTRY_VERDACCIO env (дефолт http://localhost:4873).
 *
 * Внутри: `nx release` не принимает --registry на top-level, поэтому делаем
 * два шага — `version --skip-publish` затем `publish --registry=<url>`.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const isDev = (mode) => mode !== 'prod';

// Рекурсивно собираем package.json + CHANGELOG.md внутри packages/.
// Не полагаемся на git — снапшот делаем чистыми Buffer'ами в памяти,
// чтобы откат работал даже когда исходный pkg был uncommitted/staged/в conflict-state.
const RELEASE_FILE_NAMES = new Set(['package.json', 'CHANGELOG.md']);

const walkPackages = (dir, out) => {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.git') continue;
      walkPackages(p, out);
    } else if (e.isFile() && RELEASE_FILE_NAMES.has(e.name)) {
      out.push(p);
    }
  }
};

const snapshotPackageFiles = () => {
  const files = [];
  walkPackages(resolve('packages'), files);
  const original = new Map(); // absPath -> Buffer | null (null = файл не существовал)
  for (const p of files) {
    try { original.set(p, readFileSync(p)); } catch {}
  }
  return { dir: resolve('packages'), original };
};

let _restoreDone = false;
const restorePackageFiles = (snapshot) => {
  if (!snapshot || _restoreDone) return;
  _restoreDone = true;
  // Вернуть содержимое снапшотнутых файлов как было.
  for (const [path, buf] of snapshot.original) {
    try { writeFileSync(path, buf); } catch {}
  }
  // Удалить новые CHANGELOG.md / package.json, которых не было до bump'а.
  const after = [];
  walkPackages(snapshot.dir, after);
  for (const p of after) {
    if (!snapshot.original.has(p)) {
      try { unlinkSync(p); } catch {}
    }
  }
};

const installCleanupHooks = (snapshot) => {
  if (!snapshot) return;
  const cleanup = () => restorePackageFiles(snapshot);
  process.on('exit', cleanup);
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK']) {
    process.on(sig, () => { cleanup(); process.exit(130); });
  }
  process.on('uncaughtException', (e) => {
    cleanup();
    console.error(e);
    process.exit(1);
  });
};

const rawArgs = process.argv.slice(2);
const positional = rawArgs.filter((a) => !a.startsWith('--')); // patch / minor / major / 1.2.3 / etc
const args = new Map(
  rawArgs
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, v] = a.replace(/^--/, '').split('=');
      return [k, v ?? true];
    }),
);

const VERDACCIO = process.env.NPM_REGISTRY_VERDACCIO || 'http://localhost:4873';

const mode = args.get('mode'); // 'prod' | undefined (=dev)
const groupArg = args.get('group');
const registryArg = args.get('registry');

let registry;
if (mode === 'prod') {
  if (!registryArg || registryArg === true) {
    console.error('[release] --mode=prod требует явный --registry=<url>');
    console.error('  Пример: pnpm release:prod -- --registry=https://registry.npmjs.org');
    process.exit(1);
  }
  registry = String(registryArg);
} else {
  registry = registryArg && registryArg !== true ? String(registryArg) : VERDACCIO;
}

const groupFlag = groupArg && groupArg !== 'all' ? ['--group', groupArg] : [];
const dryRun = args.has('dry-run') ? ['--dry-run'] : [];
const firstRelease = args.has('first-release') ? ['--first-release'] : [];

const run = (cmd) => {
  console.log(`\x1b[36m[release]\x1b[0m pnpm ${cmd.join(' ')}`);
  const r = spawnSync('pnpm', cmd, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  return r.status ?? 1;
};

const setupAuth = () => {
  const token = process.env.NPM_AUTH_TOKEN;
  if (!token) return { cleanup: () => {} };

  const url = new URL(registry);
  const base = `//${url.host}${url.pathname.replace(/\/?$/, '/')}`;
  const line = `${base}:_authToken=${token}`;

  const npmrcPath = resolve('.npmrc');
  const backup = existsSync(npmrcPath) ? readFileSync(npmrcPath, 'utf8') : null;
  writeFileSync(npmrcPath, `${backup ?? ''}\n# release temp auth\n${line}\n`);
  console.log(`\x1b[36m[release]\x1b[0m auth для ${url.host} → .npmrc`);

  const cleanup = () => {
    try {
      if (backup === null) unlinkSync(npmrcPath);
      else writeFileSync(npmrcPath, backup);
    } catch (e) {
      console.warn(`[release] не удалось восстановить .npmrc: ${e.message}`);
    }
  };
  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    process.exit(130);
  });
  return { cleanup };
};

// Без `dist/` `pnpm publish` соберёт тарбол без кода (в package.json
// `files: ["dist"]`). Гоним билд в две фазы:
//   1) `shared-vite` — он бандлит compliance/file-manager внутрь dist,
//      поэтому его vite.config не требует чужого dist на диске.
//   2) Всё остальное — `shared-*` (кроме biome) + `web-*` + `cli` —
//      используют готовый `shared-vite/dist/index.mjs` (с забандленными
//      compliance/file-manager) в своих vite.config через `libConfig`.
const phases = [
  {
    name: 'shared-vite',
    filters: ['--filter', '@capsule/shared-vite'],
  },
  {
    name: 'shared-* (rest) + web-* + cli',
    filters: [
      '--filter',
      '@capsule/shared-*',
      '--filter',
      '!@capsule/shared-biome',
      '--filter',
      '!@capsule/shared-vite',
      '--filter',
      '@capsule/web-*',
      '--filter',
      '@capsule/cli',
    ],
  },
];

for (const phase of phases) {
  console.log(`\x1b[36m[release]\x1b[0m build phase: ${phase.name}`);
  const status = run([
    '-r',
    '--workspace-concurrency=4',
    ...phase.filters,
    'run',
    'build',
  ]);
  if (status !== 0) {
    console.error(`[release] build phase "${phase.name}" failed — aborting publish`);
    process.exit(status);
  }
}

// DEV-режим: bump'аем версии только в файлах через `nx release version`
//   (--no-git-* флаги поддерживает только эта субкоманда, не top-level `nx release`).
//   Changelog не генерим — всё равно откатим в finally.
// PROD-режим: оркестратор `nx release --skip-publish` как было — bump + changelog + commit + tag.
const snapshot = isDev(mode) ? snapshotPackageFiles() : null;
installCleanupHooks(snapshot);

const versionCmd = isDev(mode)
  ? [
      'nx',
      'release',
      'version',
      ...positional,
      ...groupFlag,
      ...firstRelease,
      ...dryRun,
      '--no-git-commit',
      '--no-git-tag',
      '--no-stage-changes',
      '--verbose',
    ]
  : [
      'nx',
      'release',
      ...positional,
      ...groupFlag,
      ...firstRelease,
      ...dryRun,
      '--skip-publish',
      '--verbose',
    ];

const versionStatus = run(versionCmd);
if (versionStatus !== 0) {
  if (snapshot) restorePackageFiles(snapshot);
  process.exit(versionStatus);
}

const auth = setupAuth();
let publishStatus = 1;
try {
  publishStatus = run([
    'nx',
    'release',
    'publish',
    ...groupFlag,
    ...firstRelease,
    ...dryRun,
    '--registry',
    registry,
    '--verbose',
  ]);
} finally {
  auth.cleanup();
  // process.exit() в Node не выполняет finally блоки — поэтому restore делаем здесь,
  // а exit вынесли наружу.
  if (snapshot) restorePackageFiles(snapshot);
}
process.exit(publishStatus);
