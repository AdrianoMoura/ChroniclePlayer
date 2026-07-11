/**
 * Layer-boundary rules per .specs/architecture.md §Dependency rule:
 * core/ imports nothing from other layers (and no packages — pure domain);
 * adapters/ import core/ only; ui/ imports only ipc/; nothing imports ui/.
 * Violations are build errors (`npm run lint`).
 */
module.exports = {
  forbidden: [
    {
      name: 'core-is-pure',
      comment: 'core/ has zero I/O and zero framework imports (architecture.md)',
      severity: 'error',
      from: { path: '^src/core' },
      to: { pathNot: '^src/core' }
    },
    {
      name: 'ipc-is-standalone',
      comment: 'ipc/ is the shared contract; it depends on no layer',
      severity: 'error',
      from: { path: '^src/ipc' },
      to: { path: '^src/(core|adapters|platform|ui)' }
    },
    {
      name: 'ui-imports-only-ipc',
      comment: 'the renderer talks to the backend only through the typed contract',
      severity: 'error',
      from: { path: '^src/ui' },
      to: { path: '^src/(core|adapters|platform)' }
    },
    {
      name: 'nothing-imports-ui',
      severity: 'error',
      from: { path: '^src/(core|ipc|adapters|platform)' },
      to: { path: '^src/ui' }
    },
    {
      name: 'adapters-import-core-only',
      comment: 'adapters implement core ports; they never reach up or sideways',
      severity: 'error',
      from: { path: '^src/adapters' },
      to: { path: '^src/(ui|platform|ipc)' }
    }
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.node.json' },
    exclude: { path: '\\.test\\.ts$' }
  }
}
