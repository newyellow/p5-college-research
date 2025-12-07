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
    socket.on('pick-random', () => {
        if (artworks.length === 0) {
            console.log("No artworks loaded to pick from.");
            return;
        }
        const randomIndex = Math.floor(Math.random() * artworks.length);
        const pickedArtwork = artworks[randomIndex];
        console.log('Picked artwork:', pickedArtwork.title);
        
        // Broadcast the picked artwork to all connected clients (control and display)
        io.emit('artwork-selected', pickedArtwork);
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
