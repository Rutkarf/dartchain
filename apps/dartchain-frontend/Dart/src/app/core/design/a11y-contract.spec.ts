import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const specDir = dirname(fileURLToPath(import.meta.url));
const frontRoot = join(specDir, '../../../..');
const appSrc = join(frontRoot, 'src/app');
const repoRoot = join(frontRoot, '../../..');
const backendRoot = join(repoRoot, 'apps/dartchain-backend');

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

function expectContains(label: string, pattern: string | RegExp, filePath: string, content: string) {
  const ok = typeof pattern === 'string' ? content.includes(pattern) : pattern.test(content);
  expect(ok, `FAIL ${label} (${filePath})`).toBe(true);
}

describe('a11y & UX contract (ex verify-a11y-ux.sh)', () => {
  it('Phase Y — shell UX & accessibilité', () => {
    expectContains('skip-link', 'app-skip-link', 'app.html', read(join(appSrc, 'app.html')));
    expectContains(
      'focus-trap directive',
      'FocusTrapDirective',
      'focus-trap.directive.ts',
      read(join(appSrc, 'core/directives/focus-trap.directive.ts')),
    );
    expectContains(
      'auth drawer focus trap',
      'appFocusTrap',
      'auth-drawer.html',
      read(join(appSrc, 'auth/auth-drawer/auth-drawer.html')),
    );
    expectContains(
      'block drawer focus trap',
      'appFocusTrap',
      'block-detail-drawer.html',
      read(join(appSrc, 'blockchain/block-detail-drawer/block-detail-drawer.html')),
    );
    expectContains(
      'launch drawer focus trap',
      'appFocusTrap',
      'launch-form-drawer.html',
      read(join(appSrc, 'showcase/components/launch-form-drawer/launch-form-drawer.html')),
    );
    expectContains(
      'chain graph component',
      'app-chain-graph',
      'blocks-list.html',
      read(join(appSrc, 'blockchain/blocks-list/blocks-list.html')),
    );
    expectContains(
      'locale service',
      'LocaleService',
      'locale.service.ts',
      read(join(appSrc, 'core/i18n/locale.service.ts')),
    );
    expectContains(
      'showcase defer',
      '@defer',
      'showcase-window.html',
      read(join(appSrc, 'showcase/components/showcase-window/showcase-window.html')),
    );
    expectContains('dock aria-label', 'aria-label', 'app.html', read(join(appSrc, 'app.html')));
  });

  it('Phase Z — produit commercial', () => {
    expectContains(
      'product config service',
      'ProductConfigService',
      'product-config.service.ts',
      read(join(appSrc, 'core/config/product-config.service.ts')),
    );
    expectContains(
      'commercial env prod',
      'commercial: true',
      'environment.prod.ts',
      read(join(frontRoot, 'src/environments/environment.prod.ts')),
    );
    expectContains(
      'faucet gated in dock',
      'product.faucetEnabled',
      'dock-tabs-shell.component.html',
      read(join(appSrc, 'dock/components/dock-tabs-shell/dock-tabs-shell.component.html')),
    );
    expectContains(
      'health v1 controller',
      'HealthV1Controller',
      'HealthV1Controller.java',
      read(
        join(
          backendRoot,
          'src/main/java/io/dartchain/backend/ops/infrastructure/web/HealthV1Controller.java',
        ),
      ),
    );
  });

  it('Phase AA — contrat API natif', () => {
    expectContains(
      'api contract catalog',
      'ApiContractCatalog',
      'ApiContractCatalog.java',
      read(join(backendRoot, 'src/main/java/io/dartchain/backend/api/ApiContractCatalog.java')),
    );

    const txController = read(
      join(
        backendRoot,
        'src/main/java/io/dartchain/backend/blockchain/infrastructure/web/TransactionController.java',
      ),
    );
    expect(txController.includes('@CrossOrigin'), '@CrossOrigin on TransactionController').toBe(false);

    const explorerController = read(
      join(backendRoot, 'src/main/java/io/dartchain/backend/explorer/infrastructure/web/ExplorerController.java'),
    );
    expect(explorerController.includes('GetMapping("/blocks")'), 'GET /api/explorer/blocks').toBe(true);
  });
});
