const express = require('express');
const http = require('http');
const puppeteer = require('puppeteer');
const ioClient = require('socket.io-client');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// --- CONSTANTS ---
const CLIENT_PORT = 3001; // Port for the client's own local server
const RECORDS_DIR = path.join(__dirname, '..', '__iteration_records_client');
const ARTWORKS_CONFIG_DIR = path.join(__dirname, 'configs', 'artworks');

// Ensure records directory exists
if (!fs.existsSync(RECORDS_DIR)) {
    fs.mkdirSync(RECORDS_DIR);
}

// Load Artworks dynamically from configs/artworks folder (similar to server.js)
const artworks = [];
try {
    if (fs.existsSync(ARTWORKS_CONFIG_DIR)) {
        const folders = fs.readdirSync(ARTWORKS_CONFIG_DIR);
        folders.forEach(folder => {
            const folderPath = path.join(ARTWORKS_CONFIG_DIR, folder);
            if (fs.statSync(folderPath).isDirectory()) {
                const files = fs.readdirSync(folderPath);
                files.forEach(file => {
                    if (path.extname(file) === '.json') {
                        const data = fs.readFileSync(path.join(folderPath, file), 'utf8');
                        try {
                            const artworkObj = JSON.parse(data);
                            artworkObj.infoUrl = `/artwork-configs/${folder}/index.html`;
                            
                            if (artworkObj.path && artworkObj.path.startsWith('/artworks/')) {
                                artworkObj.artworkUrl = artworkObj.path;
                            } else if (artworkObj.id === 'TeamA') {
                                artworkObj.artworkUrl = '/artworks/_TeamA_LazyDuck/index.html';
                            } else {
                                if (artworkObj.path && !artworkObj.path.startsWith('/')) {
                                    artworkObj.artworkUrl = `/artworks/${artworkObj.path}`;
                                } else {
                                    artworkObj.artworkUrl = artworkObj.path;
                                }
                            }
                            artworks.push(artworkObj);
                        } catch (e) {
                            console.error(`Error parsing artwork config ${file} in ${folder}:`, e);
                        }
                    }
                });
            }
        });
        console.log(`Client loaded ${artworks.length} artworks for local fallback.`);
    }
} catch (e) {
    console.error("Error loading artworks on client:", e);
}

async function startClient() {
    console.log("Starting Exhibition Client (Standalone Mode)...");

    // 1. Load Configuration
    const configPath = path.join(__dirname, 'configs', 'clientConfig.json');
    if (!fs.existsSync(configPath)) {
        console.error("Error: clientConfig.json not found!");
        return;
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log("Config loaded:", config);

    // 2. Start Local HTTP Server (Express)
    // This allows the client to serve its own display page and artworks even if the main server is down.
    const app = express();
    const server = http.createServer(app);
    
    // Serve static files
    app.use(express.static(path.join(__dirname, 'public')));
    // Serve artworks folder
    app.use('/artworks', express.static(path.join(__dirname, '../_artworks')));
    // Serve artwork configurations
    app.use('/artwork-configs', express.static(path.join(__dirname, 'configs', 'artworks')));
    // Serve i18n configuration
    app.get('/config/i18n', (req, res) => {
        try {
            const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'configs', 'i18n.json'), 'utf8'));
            res.json(config);
        } catch (e) {
            res.status(500).json({ error: 'Failed to load i18n config' });
        }
    });

    // API to get random record locally
    app.get('/api/random-record', (req, res) => {
        try {
            const files = fs.existsSync(RECORDS_DIR) ? fs.readdirSync(RECORDS_DIR).filter(f => f.endsWith('.json')) : [];
            
            // If less than 10 records, pick a random artwork with random parameters
            if (files.length < 10) {
                console.log(`Only ${files.length} records found. Picking a random artwork with random parameters...`);
                if (artworks.length === 0) return res.status(404).json({ error: "No artworks available" });

                const pickedArtwork = artworks[Math.floor(Math.random() * artworks.length)];
                
                // Generate random parameters
                const timestamp = Date.now();
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
                let randomString = '';
                for (let i = 0; i < 20; i++) {
                    randomString += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                const seed = randomString + timestamp;

                const responseData = {
                    title: pickedArtwork.title,
                    artworkUrl: pickedArtwork.artworkUrl,
                    iteration: {
                        timestamp: timestamp,
                        date: new Date(timestamp).toISOString(),
                        seed: seed,
                        pickedTeamId: pickedArtwork.id,
                        pickedArtworkTitle: pickedArtwork.title,
                        parameters: {
                            p1: Math.random().toFixed(4),
                            p2: Math.random().toFixed(4),
                            p3: Math.random().toFixed(4),
                            subtype: Math.floor(Math.random() * 3)
                        }
                    }
                };
                return res.json(responseData);
            }
            
            // Pick a random record file
            const randomFile = files[Math.floor(Math.random() * files.length)];
            const recordData = JSON.parse(fs.readFileSync(path.join(RECORDS_DIR, randomFile), 'utf8'));
            const pickedTeamId = recordData.pickedTeamId;
            
            // Find the artwork config
            const artworkConfig = artworks.find(a => a.id === pickedTeamId);
            
            if (artworkConfig) {
                const responseData = {
                    title: artworkConfig.title,
                    artworkUrl: artworkConfig.artworkUrl,
                    iteration: recordData
                };
                return res.json(responseData);
            } else {
                 return res.status(500).json({ error: `Artwork config missing for team ${pickedTeamId}` });
            }

        } catch (e) {
            console.error("Error fetching random record:", e);
            res.status(500).json({ error: e.message });
        }
    });

    server.listen(CLIENT_PORT, () => {
        console.log(`Local Client Server running on http://localhost:${CLIENT_PORT}`);
    });

    // 3. Prepare Browser Windows
    const clientWindows = []; 
    let systemScreens = [];
    try {
        const psCommand = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::AllScreens | Select-Object -Property Bounds,Primary | ConvertTo-Json`;
        const output = execSync(`powershell -command "${psCommand}"`, { encoding: 'utf8' });
        const parsed = JSON.parse(output);
        systemScreens = Array.isArray(parsed) ? parsed : [parsed];
        systemScreens.sort((a, b) => a.Bounds.X - b.Bounds.X);
    } catch (e) {
        console.log("Screen detection failed, using config defaults.");
    }

    for (let i = 0; i < config.monitors.length; i++) {
        const monitorConfig = config.monitors[i];
        const screenId = monitorConfig.screenId;
        
        let x = 0, y = 0, width = 1920, height = 1080;
        
        if (screenId < systemScreens.length) {
            const screen = systemScreens[screenId];
            x = screen.Bounds.X;
            y = screen.Bounds.Y;
            width = screen.Bounds.Width;
            height = screen.Bounds.Height;
            
            if (config.debugMode) {
                x += (i * 50);
                y += (i * 50);
                width = 800;
                height = 600;
            }
        } else {
            x = i * 50; 
            y = i * 50;
        }

        console.log(`Launching Window ${i} on Screen ${screenId} at ${x},${y} (${width}x${height})`);

        const browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null, // Allow window size to define viewport
            ignoreDefaultArgs: ['--enable-automation'],
            args: [
                `--window-position=${x},${y}`,
                `--window-size=${width},${height}`, 
                config.debugMode ? '' : '--kiosk', 
                // Use --app style but with local server URL
                `--app=http://localhost:${CLIENT_PORT}/client-display.html`, 
                '--no-first-run',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                `--user-data-dir=${path.join(__dirname, 'temp_client_data', 'win_' + i)}`
            ].filter(arg => arg !== '')
        });

        const pages = await browser.pages();
        const page = pages[0];
        
        clientWindows.push({ id: i, page: page, browser: browser });
    }

    // 4. Connect to Main Server (with persistent reconnection)
    let socket = null;

    function connectToServer() {
        console.log(`Attempting to connect to Main Server at ${config.serverIp}...`);
        
        socket = ioClient(config.serverIp, {
            reconnection: true,
            reconnectionDelay: 5000,
            reconnectionAttempts: Infinity
        });
        
        socket.on('connect', () => {
            console.log(`Connected to Main Server!`);
            // Reset local timers on windows? 
            // Maybe not necessary, they will reset when they receive a new artwork.
        });

        socket.on('disconnect', () => {
            console.log("Disconnected from Main Server. Reconnecting...");
        });

        socket.on('connect_error', (err) => {
            // Suppress verbose errors, just log simple message
             // console.error("Connection Error:", err.message);
        });

        socket.on('artwork-pushed', (artwork) => {
            console.log("Received PUSHED artwork from Main Server:", artwork.title);
            
            // Save iteration data locally
            if (artwork.iteration) {
                const timestamp = artwork.iteration.timestamp || Date.now();
                const dateObj = new Date(timestamp);
                const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}${String(dateObj.getDate()).padStart(2, '0')}-${String(dateObj.getHours()).padStart(2, '0')}${String(dateObj.getMinutes()).padStart(2, '0')}${String(dateObj.getSeconds()).padStart(2, '0')}`;
                const shortTeamId = artwork.iteration.pickedTeamId.replace(/^Team/, '');
                const recordFilename = `${dateStr}-${shortTeamId}.json`;
                const recordPath = path.join(RECORDS_DIR, recordFilename);
                
                try {
                    fs.writeFileSync(recordPath, JSON.stringify(artwork.iteration, null, 2));
                    console.log('Saved iteration record locally:', recordPath);
                } catch (err) {
                    console.error('Error saving iteration record locally:', err);
                }
            }

            triggerRandomWindowUpdate(artwork);
        });

        // Ignore 'artwork-current' on client side for now as it's meant for the server display
        socket.on('artwork-current', (artwork) => {
             // Do nothing? Or log?
        });

        // Legacy support if needed, but we prefer explicit events now
        // socket.on('artwork-selected', (artwork) => { ... });
    }

    connectToServer();

    // 5. Helper to Update a Window
    async function triggerRandomWindowUpdate(artwork) {
        if (clientWindows.length === 0) return;

        const randomIndex = Math.floor(Math.random() * clientWindows.length);
        const targetWindow = clientWindows[randomIndex];
        
        console.log(`Updating Monitor ${randomIndex} with: ${artwork.title}`);

        try {
            await targetWindow.page.evaluate((data) => {
                if (window.updateArtwork) {
                    window.updateArtwork(data);
                }
            }, artwork);
        } catch (e) {
            console.error("Failed to update window:", e);
        }
    }

}

startClient();
