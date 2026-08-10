const fs = require('fs/promises');
const path = require('path');
const { PDFParse } = require('pdf-parse');

// Let's check a few possible locations for the sources folder
const possibleSources = [
    path.join(process.cwd(), 'sources'),
    path.join(process.cwd(), 'budget-engineer-canonical', 'sources'),
    path.join(process.cwd(), 'budget-engineer-canonical', 'public', 'sources'),
];
const corpusDir = path.join(process.cwd(), 'corpus');

async function processPdfs() {
    let sourcesDir = null;
    for (const p of possibleSources) {
        try {
            await fs.access(p);
            sourcesDir = p;
            break;
        } catch {
            // location not present; try the next candidate
        }
    }

    if (!sourcesDir) {
        console.error(`Could not find the sources directory. Looked in:`);
        possibleSources.forEach(p => console.error(` - ${p}`));
        console.error('\nPlease move your sources folder to one of these locations or update the path in this script.');
        process.exit(1);
    }

    // Ensure corpus directory exists
    await fs.mkdir(corpusDir, { recursive: true });

    async function walk(dir) {
        let results = [];
        const list = await fs.readdir(dir);
        for (const file of list) {
            const filePath = path.join(dir, file);
            const stat = await fs.stat(filePath);
            if (stat && stat.isDirectory()) {
                results = results.concat(await walk(filePath));
            } else {
                if (filePath.toLowerCase().endsWith('.pdf') || filePath.toLowerCase().endsWith('.csv') || filePath.toLowerCase().endsWith('.txt')) {
                    results.push(filePath);
                }
            }
        }
        return results;
    }

    const files = await walk(sourcesDir);
    console.log(`Found ${files.length} documents in ${sourcesDir}`);

    for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        const baseName = path.basename(file, ext);
        
        let outFileName = baseName + '.txt';
        if (ext === '.csv') outFileName = baseName + '.csv';
        
        const outPath = path.join(corpusDir, outFileName);

        console.log(`Processing: ${file}`);
        try {
            if (ext === '.pdf') {
                const dataBuffer = await fs.readFile(file);
                const parser = new PDFParse({ data: dataBuffer });
                const data = await parser.getText();
                await parser.destroy();
                await fs.writeFile(outPath, data.text);
                console.log(` -> Extracted text to ${outFileName}`);
            } else {
                // Just copy txt or csv
                await fs.copyFile(file, outPath);
                console.log(` -> Copied to ${outFileName}`);
            }
        } catch (err) {
            console.error(`Failed to process ${file}:`, err.message);
        }
    }

    console.log('\nAll done! You can now run the ingest script:');
    console.log('node --import tsx scripts/ingest-corpus.ts');
}

processPdfs();
