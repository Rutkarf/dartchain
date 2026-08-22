import fs from 'fs';
import path from 'path';

const DART = path.resolve('apps/dartchain-frontend/Dart');
const SRC = path.join(DART, 'src');

const GLOBAL_REPLACEMENTS = [
  [/(?:\.\.\/)+features\/dock-summary\//g, '@dock/components/dock-summary/'],
  [/(?:\.\.\/)+features\/dock-tabs\//g, '@dock/components/dock-tabs/'],
  [/(?:\.\.\/)+features\/dock-panel\//g, '@dock/components/dock-panel/'],
  [/(?:\.\.\/)+features\/wallet-panel\//g, '@wallet/wallet-panel/'],
  [/(?:\.\.\/)+features\/faucet\//g, '@faucet/faucet/'],
  [/(?:\.\.\/)+features\/quests-panel\//g, '@quests/quests-panel/'],
  [/(?:\.\.\/)+features\/peer-panel\//g, '@peers/peer-panel/'],
  [/(?:\.\.\/)+features\/peer-detail-drawer\//g, '@peers/peer-detail-drawer/'],
  [/(?:\.\.\/)+features\/admin-panel\//g, '@admin/admin-panel/'],
  [/(?:\.\.\/)+features\/auth-drawer\//g, '@auth/auth-drawer/'],
  [/(?:\.\.\/)+features\/blocks-list\//g, '@blockchain/blocks-list/'],
  [/(?:\.\.\/)+features\/block-composer\//g, '@blockchain/block-composer/'],
  [/(?:\.\.\/)+features\/block-detail-drawer\//g, '@blockchain/block-detail-drawer/'],
  [/(?:\.\.\/)+features\/chain-graph\//g, '@explorer/chain-graph/'],
  [/(?:\.\.\/)+features\/exchange-panel\//g, '@exchange/components/exchange-panel/'],
  [/\.\/features\/dock-tabs\//g, '@dock/components/dock-tabs/'],
  [/\.\/features\/auth-drawer\//g, '@auth/auth-drawer/'],
  [/\.\/features\/block-detail-drawer\//g, '@blockchain/block-detail-drawer/'],
  [/\.\/components\/swap\//g, '@exchange/components/swap/'],
  [/(?:\.\.\/)+block-composer\//g, '@blockchain/block-composer/'],
  [/(?:\.\.\/)+blocks-list\//g, '@blockchain/blocks-list/'],
  [/(?:\.\.\/)+chain-graph\//g, '@explorer/chain-graph/'],
  [/(?:\.\.\/)+quests-panel\//g, '@quests/quests-panel/'],
];

const DOMAIN_CORE_DIRS = [
  'src/app/dock',
  'src/app/exchange',
];

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name.endsWith('.ts')) acc.push(full);
  }
  return acc;
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  const rel = path.relative(DART, filePath).replace(/\\/g, '/');

  for (const [pattern, replacement] of GLOBAL_REPLACEMENTS) {
    content = content.replace(pattern, replacement);
  }

  if (DOMAIN_CORE_DIRS.some((dir) => rel.startsWith(dir))) {
    content = content.replace(/from ['"](\.\.\/)+core\//g, "from '@core/");
    content = content.replace(/from ['"](\.\.\/)+features\/r4v3-three\//g, "from '../../../features/r4v3-three/");
  }

  if (rel.startsWith('src/app/dock/components/')) {
    content = content.replace(
      /from ['"](\.\.\/)+pending-transactions\//g,
      "from '../../../features/pending-transactions/",
    );
    content = content.replace(
      /from ['"](\.\.\/)+mini-bar-slide-indicator\//g,
      "from '../../../features/mini-bar-slide-indicator/",
    );
  }

  if (rel.startsWith('src/app/showcase/components/')) {
    content = content.replace(
      /from ['"](\.\.\/)+features\/dock-summary\//g,
      "from '@dock/components/dock-summary/",
    );
    content = content.replace(
      /from ['"](\.\.\/)+features\/market-panel\//g,
      "from '../../../features/market-panel/",
    );
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

const files = walk(SRC);
let modified = 0;
for (const file of files) {
  if (fixFile(file)) modified++;
}

console.log(`Modified ${modified} / ${files.length} files`);
