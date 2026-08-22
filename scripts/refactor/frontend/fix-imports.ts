import { Project } from 'ts-morph';
import * as path from 'path';

const project = new Project({
  tsConfigFilePath: path.join(process.cwd(), 'apps/dartchain-frontend/Dart/tsconfig.app.json'),
});

const sourceFiles = project.getSourceFiles();

console.log(`📄 ${sourceFiles.length} fichiers trouvés`);

let filesModified = 0;
let importsModified = 0;

sourceFiles.forEach(file => {
  const filePath = file.getFilePath();
  const imports = file.getImportDeclarations();
  
  let fileModified = false;
  
  imports.forEach(imp => {
    const moduleSpecifier = imp.getModuleSpecifierValue();
    let newImport = moduleSpecifier;
    
    // Remplacer ../../features/showcase-* par @showcase/*
    if (newImport.includes('../features/showcase-')) {
      newImport = newImport.replace(/\.\.\/features\/showcase-/g, '@showcase/');
    }
    
    // Remplacer ../../../features/showcase-* par @showcase/*
    if (newImport.includes('../../features/showcase-')) {
      newImport = newImport.replace(/\.\.\/\.\.\/features\/showcase-/g, '@showcase/');
    }
    
    // Remplacer ../../core/ par @core/
    if (newImport.includes('../../core/')) {
      newImport = newImport.replace(/\.\.\/\.\.\/core\//g, '@core/');
    }
    
    // Remplacer ../../../core/ par @core/
    if (newImport.includes('../../../core/')) {
      newImport = newImport.replace(/\.\.\/\.\.\/\.\.\/core\//g, '@core/');
    }
    
    // Remplacer ../../shared/ par @shared/
    if (newImport.includes('../../shared/')) {
      newImport = newImport.replace(/\.\.\/\.\.\/shared\//g, '@shared/');
    }
    
    // Remplacer ../../../shared/ par @shared/
    if (newImport.includes('../../../shared/')) {
      newImport = newImport.replace(/\.\.\/\.\.\/\.\.\/shared\//g, '@shared/');
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