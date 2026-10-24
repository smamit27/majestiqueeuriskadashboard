const fs = require('fs');
const path = require('path');
const { getAllJsxFiles, migrateComponent } = require('./migrate-all-inline-styles.cjs');

const isDryRun = process.argv.includes('--dry-run');

console.log(`Starting inline style migration (mode: ${isDryRun ? 'DRY-RUN' : 'LIVE'})...\n`);

const jsxFiles = getAllJsxFiles('src');
console.log(`Found ${jsxFiles.length} JSX files to inspect.`);

let totalMigratedFiles = 0;
let totalNewCssFiles = 0;
let totalClassesCreated = 0;
let totalStaticStylesMigrated = 0;
let totalDynamicRetained = 0;

const results = [];

for (const file of jsxFiles) {
  try {
    const res = migrateComponent(file);
    if (res && res.classesCount > 0) {
      totalMigratedFiles++;
      totalNewCssFiles++;
      totalClassesCreated += res.classesCount;
      totalStaticStylesMigrated += res.staticStylesCount;
      totalDynamicRetained += res.dynamicStylesCount;

      results.push({
        jsxFile: res.filePath,
        cssFile: res.cssFilePath,
        classes: res.classesCount,
        staticCount: res.staticStylesCount,
        dynamicCount: res.dynamicStylesCount
      });

      if (!isDryRun) {
        // Write new CSS file
        fs.writeFileSync(res.cssFilePath, res.cssContent, 'utf8');
        // Update JSX file
        fs.writeFileSync(res.filePath, res.newCode, 'utf8');
      }

      console.log(`✓ ${path.basename(res.filePath)} -> ${path.basename(res.cssFilePath)} (${res.classesCount} classes, ${res.staticStylesCount} static props migrated)`);
    }
  } catch (err) {
    console.error(`✗ Error processing ${file}:`, err);
  }
}

console.log('\n=============================================');
console.log(`Migration Summary:`);
console.log(`- Total JSX components updated: ${totalMigratedFiles}`);
console.log(`- New CSS files created: ${totalNewCssFiles}`);
console.log(`- Total CSS classes generated: ${totalClassesCreated}`);
console.log(`- Total static style properties migrated: ${totalStaticStylesMigrated}`);
console.log(`- Runtime/dynamic style properties retained: ${totalDynamicRetained}`);
console.log('=============================================\n');
