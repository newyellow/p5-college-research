const puppeteer = require('puppeteer');
const io = require('socket.io-client');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function startClient() {
    console.log("Starting Exhibition Client...");

    // 1. Load Configuration
    const configPath = path.join(__dirname, 'configs', 'clientConfig.json');
    if (!fs.existsSync(configPath)) {
        console.error("Error: clientConfig.json not found!");
        return;
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log("Config loaded:", config);

    // 2. Connect to Server
    const socket = io(config.serverIp);
    
    socket.on('connect', () => {
        console.log(`Connected to server at ${config.serverIp}`);
    });

    socket.on('connect_error', (err) => {
        console.error("Connection Error:", err.message);
    });

    // 3. Prepare Browser
    // We will launch one browser instance and manage pages or separate instances depending on debug mode.
    // For simplicity and stability with multiple monitors, separate instances usually work best,
    // but puppeteer can also manage multiple pages. 
    // Given the requirement for "randomly picks a monitor to display", we need to control which "window" gets the update.
    
    // We need to keep track of our opened pages/windows
    const clientWindows = []; 

    // Detect Screens (Windows only logic re-used from server, optional if we strictly follow config)
    let systemScreens = [];
    try {
        const psCommand = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::AllScreens | Select-Object -Property Bounds,Primary | ConvertTo-Json`;
        const output = execSync(`powershell -command "${psCommand}"`, { encoding: 'utf8' });
        const parsed = JSON.parse(output);
        systemScreens = Array.isArray(parsed) ? parsed : [parsed];
        // Sort left to right
        systemScreens.sort((a, b) => a.Bounds.X - b.Bounds.X);
    } catch (e) {
        console.log("Screen detection failed or not on Windows, using config strictly.");
    }

    // Launch Windows based on config
    // In debug mode, we might just offset them slightly so they are visible
    for (let i = 0; i < config.monitors.length; i++) {
        const monitorConfig = config.monitors[i];
        const screenId = monitorConfig.screenId;
        
        let x = 0, y = 0;
        
        if (config.debugMode) {
             // Debug mode: cascade windows on the configured screen
             // Find bounds of that screen if possible, else default 0,0
             if (screenId < systemScreens.length) {
                 x = systemScreens[screenId].Bounds.X + (i * 50);
                 y = systemScreens[screenId].Bounds.Y + (i * 50);
             } else {
                 x = i * 50;
                 y = i * 50;
             }
        } else {
            // Production: Use actual screen coordinates
            if (screenId < systemScreens.length) {
                x = systemScreens[screenId].Bounds.X;
                y = systemScreens[screenId].Bounds.Y;
            }
        }

        console.log(`Launching Display Window ${i} on Screen ${screenId} at ${x},${y}`);

        const browser = await puppeteer.launch({
            headless: false,
            ignoreDefaultArgs: ['--enable-automation'],
            args: [
                `--window-position=${x},${y}`,
                `--window-size=800,600`, // Default size, or kiosk if needed
                // in debug mode we probably don't want full kiosk so we can close them easily
                config.debugMode ? '' : '--kiosk', 
                `--app=${config.serverIp}/client-display.html`, // Point to dedicated client display page
                '--no-first-run',
                `--user-data-dir=${path.join(__dirname, 'temp_client_data', 'win_' + i)}`
            ].filter(arg => arg !== '')
        });

        // We need a way to communicate with this specific window to tell it to "Flash" or "Update"?
        // Actually, the display.html listens to socket events from the server directly.
        // If ALL windows listen to the SAME 'artwork-selected' event, they will ALL update at once.
        // Requirement: "randomly picks a monitor to display the artwork"
        
        // PROBLEM: The display.html as currently written updates AUTOMATICALLY on 'artwork-selected'.
        // If we open 4 instances of display.html, they will all change.
        
        // SOLUTION: We need to intercept the event or have the server send a target ID?
        // OR: The client.js receives the event, and then controls the browser pages?
        // But puppeteer controls the BROWSER, not the content inside the JS of the page easily without exposing functions.
        
        // Better approach:
        // 1. Client.js receives 'artwork-selected'.
        // 2. Client.js picks a random window index (0 to 3).
        // 3. Client.js tells THAT specific browser page to navigate to the new URL.
        
        // BUT display.html has its own socket connection.
        // We should probably modify display.html to NOT listen to global events if it's being controlled by this client?
        // OR, simpler:
        // Just let Client.js navigate the browser page to the new URL constructed with params.
        // And the display.html page just renders what is given in URL?
        // Wait, display.html HAS the fading logic and iframe logic.
        // If we just navigate the whole page, we lose the transition effect because the whole page reloads.
        
        // We need to inject code or expose a function in display.html that Client.js can call.
        // Puppeteer can evaluate JS on the page.
        
        const pages = await browser.pages();
        const page = pages[0]; // The main page opened by --app
        
        // Store reference
        clientWindows.push({
            id: i,
            page: page,
            browser: browser
        });
    }

    // 4. Handle Server Events
    socket.on('artwork-selected', async (artwork) => {
        console.log("Received new artwork from server. Picking a random monitor...");
        
        // Randomly pick one window
        const randomIndex = Math.floor(Math.random() * clientWindows.length);
        const targetWindow = clientWindows[randomIndex];
        
        console.log(`Selected Monitor ${randomIndex}`);

        // Construct URL
        const params = new URLSearchParams();
        if (artwork.iteration) {
            if (artwork.iteration.seed) params.append('seed', artwork.iteration.seed);
            if (artwork.iteration.parameters) {
                for (const [key, value] of Object.entries(artwork.iteration.parameters)) {
                    params.append(key, value);
                }
            }
        }
        const fullArtworkUrl = `${artwork.path}?${params.toString()}`;

        // We need to trigger the update logic inside the page.
        // The display.html currently listens to socket itself.
        // If we use the existing display.html, it will double-trigger (once from its own socket, once from us).
        // We need a "Slave Mode" for display.html?
        // OR, we can just execute the logic manually via Puppeteer and ignore the socket on the page?
        
        // Let's use Puppeteer to inject the logic.
        // We can simulate the socket event or call the internal logic if we structure display.html right.
        // Or simpler: We can just Reload the page with a specific query param that tells it "Don't connect to socket, just show this"?
        // But again, we want the transition.
        
        // Let's Inject a custom event into the window that the page listens to?
        // Or directly manipulate the DOM.
        
        // Let's try to evaluate code to update the iframe.
        // But display.html has the fading logic. We want to reuse that.
        // The fading logic is inside `socket.on('artwork-selected', ...)`.
        
        // Let's modify `display.html` to expose a global function `updateArtwork(artworkData)`
        // Then we can call it from here.
        
        try {
            await targetWindow.page.evaluate((data) => {
                if (window.updateArtwork) {
                    window.updateArtwork(data);
                } else {
                    console.error("updateArtwork function not found on page.");
                }
            }, artwork);
        } catch (e) {
            console.error("Failed to update window:", e);
        }
    });
}

startClient();

