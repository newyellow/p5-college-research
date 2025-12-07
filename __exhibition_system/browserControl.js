const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function launchBrowsers(port) {
    try {
        // Check if config exists
        const configPath = path.join(__dirname, 'configs', 'screenConfig.json');
        if (!fs.existsSync(configPath)) {
            console.log('No screen configuration found, skipping auto-launch.');
            return;
        }

        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        // Get Screen Info via PowerShell (Windows only)
        let screens = [];
        try {
            const psCommand = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::AllScreens | Select-Object -Property Bounds,Primary | ConvertTo-Json`;
            const output = execSync(`powershell -command "${psCommand}"`, { encoding: 'utf8' });
            // Handle single screen returned as object vs array
            const parsed = JSON.parse(output);
            screens = Array.isArray(parsed) ? parsed : [parsed];
            console.log('Detected Screens:', screens.length);
        } catch (e) {
            console.error('Failed to detect screens:', e.message);
            // Fallback dummy screen if detection fails
            screens = [{ Bounds: { X: 0, Y: 0, Width: 1920, Height: 1080 } }];
        }

        // Close any existing instances? (Optional, skipping for now)

        for (const winConfig of config.windows) {
            let x = 0, y = 0;
            let width = 800; // Default width if not kiosk
            let height = 600; // Default height if not kiosk
            let isKiosk = true;

            // Sort screens left-to-right to ensure ID matches expectation
            screens.sort((a, b) => a.Bounds.X - b.Bounds.X);

            if (config.debugMode) {
                // Debug Mode: Use single screen, split top/bottom
                const debugScreenId = config.debugScreenId || 0;
                
                if (debugScreenId < screens.length) {
                    const screen = screens[debugScreenId];
                    // We assume 2 windows in config usually: control and display.
                    // Top: Display, Bottom: Control (as per user request)
                    // But we are iterating loop.
                    
                    const screenW = screen.Bounds.Width;
                    const screenH = screen.Bounds.Height;
                    const startX = screen.Bounds.X;
                    const startY = screen.Bounds.Y;

                    width = screenW;
                    height = Math.floor(screenH / 2);
                    x = startX;
                    
                    if (winConfig.type === 'display') {
                        y = startY; // Top
                    } else {
                        y = startY + height; // Bottom
                    }
                    
                    isKiosk = false; // Disable kiosk so we can see sizing (or enable if we want borderless split)
                    // If we use kiosk, it forces FULL screen of monitor usually.
                    // We'll use window-size instead.
                }
            } else {
                // Production Mode
                const screenId = winConfig.screenId;
                if (screenId < screens.length) {
                    const screen = screens[screenId];
                    x = screen.Bounds.X;
                    y = screen.Bounds.Y;
                    // Kiosk mode handles width/height automatically
                }
            }

            const targetUrl = winConfig.type === 'control' 
                ? `http://localhost:${port}/control.html` 
                : `http://localhost:${port}/display.html`;
            
            console.log(`Launching browser for ${winConfig.type} at ${x},${y} (Debug: ${config.debugMode})`);

            // Launch separate instance
            const args = [
                `--window-position=${x},${y}`,
                `--app=${targetUrl}`,
                '--no-first-run',
                // distinct user data dir to allow multiple instances
                `--user-data-dir=${path.join(__dirname, 'temp_browser_data', 'win_' + winConfig.type)}`
            ];

            if (isKiosk) {
                args.push('--kiosk');
            } else {
                args.push(`--window-size=${width},${height}`);
            }

            await puppeteer.launch({
                headless: false,
                ignoreDefaultArgs: ['--enable-automation'],
                args: args
            });
        }

    } catch (err) {
        console.error("Error launching browsers:", err);
    }
}

module.exports = { launchBrowsers };

