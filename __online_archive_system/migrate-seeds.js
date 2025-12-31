const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const MAP_DIR = path.join(__dirname, 'data-seed-map');

if (!fs.existsSync(MAP_DIR)) {
    fs.mkdirSync(MAP_DIR);
}

function migrate() {
    console.log('Starting migration...');
    const files = fs.readdirSync(DATA_DIR);
    const seedMap = {}; // seed -> smallest iterationId

    files.forEach(file => {
        if (path.extname(file) === '.json') {
            try {
                const filePath = path.join(DATA_DIR, file);
                const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                const { seed, iterationId } = content;

                if (seed && iterationId) {
                    const currentId = parseInt(iterationId);
                    if (!seedMap[seed] || currentId < parseInt(seedMap[seed])) {
                        seedMap[seed] = iterationId.toString();
                    }
                }
            } catch (e) {
                console.error(`Error processing ${file}:`, e);
            }
        }
    });

    console.log(`Found ${Object.keys(seedMap).length} unique seeds.`);

    // Group by first character of seed
    const groupedMap = {};
    Object.entries(seedMap).forEach(([seed, id]) => {
        const char = seed.charAt(0).toLowerCase() || '_';
        if (!groupedMap[char]) {
            groupedMap[char] = {};
        }
        groupedMap[char][seed] = id;
    });

    // Write to files
    Object.entries(groupedMap).forEach(([char, map]) => {
        const mapFilePath = path.join(MAP_DIR, `${char}.json`);
        fs.writeFileSync(mapFilePath, JSON.stringify(map, null, 2));
        console.log(`Saved map for character '${char}' to ${mapFilePath}`);
    });

    console.log('Migration completed successfully.');
}

migrate();

