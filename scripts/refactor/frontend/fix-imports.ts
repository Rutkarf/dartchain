import { Project } from 'ts-morph';
import * as path from 'path';

const project = new Project({
  tsConfigFilePath: path.join(process.cwd(), 'apps/dartchain-frontend/Dart/tsconfig.app.json'),
});

const sourceFiles = project.getSourceFiles();

const REPLACEMENTS: Array<[RegExp, string]> = [
  [/(?:\.\.\/)+features\/showcase-/g, '@showcase/components/showcase-'],
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
  [/(?:\.\.\/)+core\//g, '@core/'],
];

console.log(`📄 ${sourceFiles.length} fichiers trouvés`);

let filesModified = 0;
let importsModified = 0;

sourceFiles.forEach((file) => {
  const filePath = file.getFilePath();
  const imports = file.getImportDeclarations();

  let fileModified = false;

  imports.forEach((imp) => {
    const moduleSpecifier = imp.getModuleSpecifierValue();
    let newImport = moduleSpecifier;

    for (const [pattern, replacement] of REPLACEMENTS) {
      newImport = newImport.replace(pattern, replacement);
    }

    if (newImport !== moduleSpecifier) {
      imp.setModuleSpecifier(newImport);
      fileModified = true;
      importsModified++;
      console.log(`   ${path.basename(filePath)}: ${moduleSpecifier} → ${newImport}`);
    }
  });

  if (fileModified) {
    file.saveSync();
    filesModified++;
  }
});

console.log('');
console.log('✅ Imports mis à jour');
console.log(`   Fichiers modifiés: ${filesModified}`);
console.log(`   Imports modifiés: ${importsModified}`);
