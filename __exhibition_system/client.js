const express = require('express');
const http = require('http');
const puppeteer = require('puppeteer');
const ioClient = require('socket.io-client');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// --- CONSTANTS ---
const CLIENT_PORT = 3001; // Port for the client's own local server
const RECORDS_DIR = path.join(__dirname, '..', '__iteration_records');
const ARTWORKS_CONFIG_DIR = path.join(__dirname, 'configs', 'artworks');

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
    // Serve project root for artworks
    app.use('/artworks', express.static(path.join(__dirname, '../')));

    // API to get random record locally
    app.get('/api/random-record', (req, res) => {
        try {
            if (!fs.existsSync(RECORDS_DIR)) {
                return res.status(404).json({ error: "No records found" });
            }
            const files = fs.readdirSync(RECORDS_DIR).filter(f => f.endsWith('.json'));
            if (files.length === 0) {
                return res.status(404).json({ error: "No records found" });
            }
            
            const randomFile = files[Math.floor(Math.random() * files.length)];
            const recordData = JSON.parse(fs.readFileSync(path.join(RECORDS_DIR, randomFile), 'utf8'));
            
            // We need to match the record's TeamID to an artwork path
            // The record has 'pickedTeamId' (e.g. "TeamA")
            // We need to look up the artwork config to get the path
            const artworkConfigPath = path.join(ARTWORKS_CONFIG_DIR, `${recordData.pickedTeamId}.json`);
            
            if (fs.existsSync(artworkConfigPath)) {
                const artworkConfig = JSON.parse(fs.readFileSync(artworkConfigPath, 'utf8'));
                
                // Construct the full object expected by display page
                const responseData = {
                    title: artworkConfig.title,
                    path: artworkConfig.path,
                    iteration: recordData
                };
                return res.json(responseData);
            } else {
                 return res.status(500).json({ error: "Artwork config missing for record" });
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
        
        let x = 0, y = 0;
        
        if (config.debugMode) {
             if (screenId < systemScreens.length) {
                 x = systemScreens[screenId].Bounds.X + (i * 50);
                 y = systemScreens[screenId].Bounds.Y + (i * 50);
             } else {
                 x = i * 50; y = i * 50;
             }
        } else {
            if (screenId < systemScreens.length) {
                x = systemScreens[screenId].Bounds.X;
                y = systemScreens[screenId].Bounds.Y;
            }
        }

        console.log(`Launching Window ${i} at ${x},${y}`);

        const browser = await puppeteer.launch({
            headless: false,
            ignoreDefaultArgs: ['--enable-automation'],
            args: [
                `--window-position=${x},${y}`,
                `--window-size=800,600`, 
                config.debugMode ? '' : '--kiosk', 
                // Point to LOCAL server
                `--app=http://localhost:${CLIENT_PORT}/client-display.html`, 
                '--no-first-run',
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
