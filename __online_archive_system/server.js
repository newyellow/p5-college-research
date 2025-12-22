const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = 3600;

// Enable trust proxy so Express knows it is behind Caddy
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve static files with caching
// Artwork assets (heavy images/shaders) - 1 hour (reduced from 30 days for updates)
app.use('/artworks', express.static(path.join(__dirname, '../_artworks'), {
    maxAge: 3600000
}));

// Artwork configurations (JSON) - 5 minutes
app.use('/artwork-configs', express.static(path.join(__dirname, '..', '__exhibition_system', 'configs', 'artworks'), {
    maxAge: 300000
}));

// System public files (index.html, etc) - 1 hour
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: 3600000
}));

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

// Load artwork metadata dynamically from the exhibition system
function getTeamData() {
    const teamData = {};
    const artworksDir = path.join(__dirname, '..', '__exhibition_system', 'configs', 'artworks');
    
    if (fs.existsSync(artworksDir)) {
        const folders = fs.readdirSync(artworksDir);
        folders.forEach(folder => {
            const folderPath = path.join(artworksDir, folder);
            if (fs.statSync(folderPath).isDirectory()) {
                const files = fs.readdirSync(folderPath);
                files.forEach(file => {
                    if (path.extname(file) === '.json') {
                        try {
                            const config = JSON.parse(fs.readFileSync(path.join(folderPath, file), 'utf8'));
                            if (config.id) {
                                // Extract folder name from path or fallback
                                let folderName = folder;
                                if (config.path && config.path.startsWith('/artworks/')) {
                                    const parts = config.path.split('/');
                                    folderName = parts[2]; // e.g., "_TeamB_LittleDuckBottle"
                                } else if (config.id === 'TeamA') {
                                    folderName = '_TeamA_LazyDuck';
                                }
                                
                                teamData[config.id] = {
                                    title: config.title,
                                    folder: folderName
                                };
                            }
                        } catch (e) {
                            console.error(`Error loading artwork config ${file}:`, e);
                        }
                    }
                });
            }
        });
    }
    return teamData;
}

// API: Save artwork parameters
app.post('/api/save', (req, res) => {
    const { id, seed, subtype, p1, p2, p3 } = req.body;
    
    if (!id) {
        return res.status(400).json({ error: 'Missing artwork ID' });
    }

    const teamData = getTeamData();
    const teamInfo = teamData[id] || { title: id, folder: id };

    // Generate a unique sequential ID for this iteration
    const iterationId = getNextIterationId();
    
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
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Ensure we use the latest title and folder from the dynamic config
        const teamData = getTeamData();
        if (teamData[data.artworkId]) {
            data.title = teamData[data.artworkId].title;
            data.folder = teamData[data.artworkId].folder;
        }
        
        res.json(data);
    } else {
        res.status(404).json({ error: 'Artwork not found' });
    }
});

// Serve the density configuration
app.get('/api/config/density', (req, res) => {
    const densityPath = path.join(CONFIG_DIR, 'densityConfig.json');
    if (fs.existsSync(densityPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(densityPath, 'utf8'));
            res.json(config);
        } catch (e) {
            res.status(500).json({ error: 'Failed to parse density config' });
        }
    } else {
        // Default values if config doesn't exist
        res.json({
            mobile: 0.2,
            lowDesktop: 0.4,
            mediumDesktop: 0.75,
            fullDesktop: 1.0
        });
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
