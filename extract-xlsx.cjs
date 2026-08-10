const fs = require('fs/promises');
const path = require('path');

// We'll use a lightweight approach: read xlsx as a zip, extract shared strings + sheet XML
// But actually, let's just use the xlsx package which should already be installed or we install it

async function main() {
    let XLSX;
    try {
        XLSX = require('xlsx');
    } catch {
        console.error('xlsx package not found. Please run: npm install xlsx');
        process.exit(1);
    }

    const estimationsDir = path.join(process.cwd(), 'Sources', 'Estimations');
    const corpusDir = path.join(process.cwd(), 'corpus');

    try {
        await fs.access(estimationsDir);
    } catch {
        console.error(`Could not find Estimations directory at: ${estimationsDir}`);
        process.exit(1);
    }

    await fs.mkdir(corpusDir, { recursive: true });

    const files = await fs.readdir(estimationsDir);
    const xlsxFiles = files.filter(f => f.toLowerCase().endsWith('.xlsx') || f.toLowerCase().endsWith('.xls'));

    console.log(`Found ${xlsxFiles.length} Excel files in ${estimationsDir}\n`);

    for (const file of xlsxFiles) {
        const filePath = path.join(estimationsDir, file);
        const baseName = path.basename(file, path.extname(file));
        const outPath = path.join(corpusDir, baseName + '.csv');

        console.log(`Processing: ${file}`);
        try {
            const workbook = XLSX.readFile(filePath);
            let allCsv = '';

            for (const sheetName of workbook.SheetNames) {
                const sheet = workbook.Sheets[sheetName];
                const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
                if (csv.trim()) {
                    allCsv += `\n--- Sheet: ${sheetName} ---\n`;
                    allCsv += csv + '\n';
                }
            }

            await fs.writeFile(outPath, allCsv.trim(), 'utf8');
            console.log(` -> Exported ${workbook.SheetNames.length} sheet(s) to ${baseName}.csv`);
        } catch (err) {
            console.error(` Failed: ${err.message}`);
        }
    }

    console.log('\nAll done! Now run the ingest script:');
    console.log('node --import tsx scripts/ingest-corpus.ts');
}

main();
