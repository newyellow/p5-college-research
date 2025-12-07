const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const fs = require('fs');
const { launchBrowsers } = require('./browserControl');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the 'public' directory (control and display pages)
app.use(express.static(path.join(__dirname, 'public')));

// Serve the entire project root at /artworks so we can access team folders
// We go up one level from __dirname (__exhibition_system) to get to the project root
app.use('/artworks', express.static(path.join(__dirname, '../')));

// Load Artworks dynamically from configs/artworks folder
const artworks = [];
const artworksDir = path.join(__dirname, 'configs', 'artworks');

try {
    if (fs.existsSync(artworksDir)) {
        const files = fs.readdirSync(artworksDir);
        files.forEach(file => {
            if (path.extname(file) === '.json') {
                const data = fs.readFileSync(path.join(artworksDir, file), 'utf8');
                try {
                    artworks.push(JSON.parse(data));
                } catch (e) {
                    console.error(`Error parsing artwork config ${file}:`, e);
                }
            }
        });
        console.log(`Loaded ${artworks.length} artworks.`);
    } else {
        console.warn("No artworks config directory found!");
    }
} catch (e) {
    console.error("Error loading artworks:", e);
}


io.on('connection', (socket) => {
    console.log('a user connected');

    // Handle pick event from control panel
    socket.on('pick-random', (clientParams) => {
        if (artworks.length === 0) {
            console.log("No artworks loaded to pick from.");
            return;
        }

        const randomIndex = Math.floor(Math.random() * artworks.length);
        const pickedArtwork = artworks[randomIndex];
        
        // --- Generate Iteration Record ---
        const timestamp = Date.now();
        
        // Generate Random Seed (20 random letters + timestamp)
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        let randomString = '';
        for (let i = 0; i < 20; i++) {
            randomString += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const seed = randomString + timestamp;

        // Construct Record Data
        const record = {
            timestamp: timestamp,
            date: new Date(timestamp).toISOString(),
            seed: seed,
            parameters: clientParams || {}, // params from slider (0~1)
            pickedTeamId: pickedArtwork.id,
            pickedArtworkTitle: pickedArtwork.title
        };

        // Save to file
        // Move recordsDir one level up from __exhibition_system
        const recordsDir = path.join(__dirname, '..', '__iteration_records');
        if (!fs.existsSync(recordsDir)){
            fs.mkdirSync(recordsDir);
        }

        // Format Date for Filename: YYYY-MMDD-HHIISS
        const dateObj = new Date(timestamp);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
        const seconds = String(dateObj.getSeconds()).padStart(2, '0');
        
        const dateStr = `${year}-${month}${day}-${hours}${minutes}${seconds}`;

        // Format Team ID: Remove "Team" from "TeamA", "TeamB" -> "A", "B"
        const shortTeamId = pickedArtwork.id.replace(/^Team/, '');

        const recordFilename = `${dateStr}-${shortTeamId}.json`;
        const recordPath = path.join(recordsDir, recordFilename);
        
        try {
            fs.writeFileSync(recordPath, JSON.stringify(record, null, 2));
            console.log('Saved iteration record:', recordPath);
        } catch (err) {
            console.error('Error saving iteration record:', err);
        }

        console.log('Picked artwork:', pickedArtwork.title);
        
        // Broadcast the picked artwork AND the generated seed/params to all connected clients
        io.emit('artwork-selected', {
            ...pickedArtwork,
            iteration: record 
        });
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Control Panel: http://localhost:${PORT}/control.html`);
    console.log(`Display Page: http://localhost:${PORT}/display.html`);

    // --- Auto-Launch Browser Logic ---
    await launchBrowsers(PORT);
});
