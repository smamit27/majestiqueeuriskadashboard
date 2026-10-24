const fs = require('fs');
const path = require('path');
const { getAllJsxFiles, migrateConditionalsInFile } = require('./migrate-conditional-styles.cjs');

const isDryRun = process.argv.includes('--dry-run');

console.log(`Starting conditional style migration (mode: ${isDryRun ? 'DRY-RUN' : 'LIVE'})...\n`);

const jsxFiles = getAllJsxFiles('src');
let totalFiles = 0;
let totalProperties = 0;
let totalClasses = 0;

for (const file of jsxFiles) {
  try {
    const res = migrateConditionalsInFile(file);
    if (res && res.convertedCount > 0) {
      totalFiles++;
      totalProperties += res.convertedCount;
      totalClasses += res.classesCreated;

      if (!isDryRun) {
        fs.writeFileSync(res.filePath, res.newCode, 'utf8');
        fs.appendFileSync(res.cssPath, res.cssAppend, 'utf8');
      }

      console.log(`✓ ${path.basename(res.filePath)} (${res.convertedCount} conditional props -> ${res.classesCreated} classes)`);
    }
  } catch (err) {
    console.error(`✗ Error processing ${file}:`, err);
  }
}

console.log('\n=============================================');
console.log(`Conditional Migration Summary:`);
console.log(`- Files updated: ${totalFiles}`);
console.log(`- Conditional properties migrated: ${totalProperties}`);
console.log(`- New CSS classes generated: ${totalClasses}`);
console.log('=============================================\n');
