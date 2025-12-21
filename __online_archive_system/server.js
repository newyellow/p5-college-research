const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3600;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Also serve the root directory to access artwork folders
// This assumes the online archive system is inside the project root
app.use('/artworks', express.static(path.join(__dirname, '..')));

const DATA_DIR = path.join(__dirname, 'data');
const CONFIG_DIR = path.join(__dirname, 'configs');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR);
}

// Initialize config if it doesn't exist
if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ lastIterationId: 0 }, null, 2));
}

function getNextIterationId() {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    config.lastIterationId += 1;
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    return config.lastIterationId.toString();
}

// Map team IDs to titles and folder names
const TEAM_DATA = {
    'TeamA': { title: 'Lazy Duck', folder: '_TeamA_LazyDuck' },
    'TeamB': { title: 'Little Duck Bottle', folder: '_TeamB_LittleDuckBottle' },
    'TeamC': { title: 'Mountain Sea Man', folder: '_TeamC_MountainSeaMan' },
    'TeamD': { title: 'Kaleidoscope', folder: '_TeamD_Kaleidoscope' },
    'TeamE': { title: 'Lanyang Beauties', folder: '_TeamE_LanyangBeauties' }
};

// API: Save artwork parameters
app.post('/api/save', (req, res) => {
    const { id, seed, subtype, p1, p2, p3 } = req.body;
    
    if (!id) {
        return res.status(400).json({ error: 'Missing artwork ID' });
    }

    // Generate a unique sequential ID for this iteration
    const iterationId = getNextIterationId();
    const teamInfo = TEAM_DATA[id] || { title: id, folder: id };
    
    const data = {
        iterationId,
        artworkId: id,
        title: teamInfo.title,
        folder: teamInfo.folder,
        seed,
        subtype,
        p1,
        p2,
        p3,
        timestamp: new Date().toISOString()
    };

    const filePath = path.join(DATA_DIR, `${iterationId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    res.json({ success: true, iterationId });
});

// API: Get artwork parameters by ID
app.get('/api/load/:iterationId', (req, res) => {
    const { iterationId } = req.params;
    const filePath = path.join(DATA_DIR, `${iterationId}.json`);

    if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        res.json(JSON.parse(data));
    } else {
        res.status(404).json({ error: 'Artwork not found' });
    }
});

// Serve the display page for the /view/:id route
app.get('/view/:iterationId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// For any other routes, serve index.html (client-side routing support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Online Archive System running at http://localhost:${PORT}`);
});
