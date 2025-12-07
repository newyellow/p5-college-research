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
            const screenId = winConfig.screenId;
            // Sort screens left-to-right to ensure ID matches expectation
            screens.sort((a, b) => a.Bounds.X - b.Bounds.X);

            if (screenId < screens.length) {
                const screen = screens[screenId];
                const { X, Y } = screen.Bounds;
                
                const targetUrl = winConfig.type === 'control' 
                    ? `http://localhost:${port}/control.html` 
                    : `http://localhost:${port}/display.html`;
                
                console.log(`Launching browser for ${winConfig.type} on Screen ${screenId} at ${X},${Y}`);

                // Launch separate instance
                await puppeteer.launch({
                    headless: false,
                    ignoreDefaultArgs: ['--enable-automation'],
                    args: [
                        `--window-position=${X},${Y}`,
                        `--kiosk`, // Kiosk mode forces fullscreen
                        `--app=${targetUrl}`,
                        '--no-first-run',
                         // distinct user data dir to allow multiple instances
                        `--user-data-dir=${path.join(__dirname, 'temp_browser_data', 'screen_' + screenId + '_' + winConfig.type)}`
                    ]
                });
            }
        }

    } catch (err) {
        console.error("Error launching browsers:", err);
    }
}

module.exports = { launchBrowsers };

