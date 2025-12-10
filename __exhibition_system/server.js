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

// Serve node_modules to access libraries like marked
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

// Serve the entire project root at /artworks so we can access team folders
// We go up one level from __dirname (__exhibition_system) to get to the project root
app.use('/artworks', express.static(path.join(__dirname, '../')));

// Load Artworks dynamically from configs/artworks folder
const artworks = [];
const artworksDir = path.join(__dirname, 'configs', 'artworks');
const SEQUENCE_FILE = path.join(__dirname, '..', '__sequence_queue.json');
const SHORT_BATCH_SIZE = 10;
const TOTAL_SEQUENCE_LENGTH = 600;
let sequenceQueue = [];
let sequencePosition = 0;

try {
    if (fs.existsSync(artworksDir)) {
        const files = fs.readdirSync(artworksDir);
        files.forEach(file => {
            if (path.extname(file) === '.json') {
                const data = fs.readFileSync(path.join(artworksDir, file), 'utf8');
                try {
                    const artworkObj = JSON.parse(data);
                    
                    // Check for corresponding .md file for description
                    const mdFile = path.basename(file, '.json') + '.md';
                    const mdPath = path.join(artworksDir, mdFile);
                    if (fs.existsSync(mdPath)) {
                         artworkObj.description = fs.readFileSync(mdPath, 'utf8');
                         console.log(`Loaded description from ${mdFile} for ${artworkObj.id}`);
                    }

                    artworks.push(artworkObj);
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

const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

const buildShortBatch = (teamIds) => {
    const base = [];
    teamIds.forEach(id => {
        base.push(id, id);
    });
    if (base.length === 0) return [];

    const shortBatch = base.slice(0, SHORT_BATCH_SIZE);
    let fillIndex = 0;
    while (shortBatch.length < SHORT_BATCH_SIZE) {
        shortBatch.push(base[fillIndex % base.length]);
        fillIndex++;
    }

    return shortBatch;
};

const generateSequenceQueue = (teamIds) => {
    const shortBatch = buildShortBatch(teamIds);
    if (shortBatch.length === 0) return [];

    const queue = [];
    while (queue.length < TOTAL_SEQUENCE_LENGTH) {
        const shuffled = shuffleArray([...shortBatch]);
        queue.push(...shuffled);
    }

    return queue.slice(0, TOTAL_SEQUENCE_LENGTH);
};

const persistSequenceQueue = (queue) => {
    try {
        fs.writeFileSync(SEQUENCE_FILE, JSON.stringify(queue, null, 2));
        console.log(`Generated sequence queue (${queue.length}) at ${SEQUENCE_FILE}`);
    } catch (err) {
        console.error('Failed to persist sequence queue:', err);
    }
};

const teamIds = artworks.map(a => a.id);
if (teamIds.length > 0) {
    sequenceQueue = generateSequenceQueue(teamIds);
    persistSequenceQueue(sequenceQueue);
} else {
    console.warn("No artworks available to build sequence queue.");
}


// State to store the previous artwork
let previousArtworkData = null;

io.on('connection', (socket) => {
    console.log('a user connected');

    // Handle pick event from control panel
    socket.on('pick-random', (clientParams) => {
        if (artworks.length === 0) {
            console.log("No artworks loaded to pick from.");
            return;
        }

        let pickedArtwork = null;
        if (sequenceQueue.length > 0) {
            const nextId = sequenceQueue[sequencePosition];
            sequencePosition = (sequencePosition + 1) % sequenceQueue.length;
            pickedArtwork = artworks.find(art => art.id === nextId);
            if (!pickedArtwork) {
                console.warn(`Sequence id ${nextId} not found, falling back to random pick.`);
            }
        }

        if (!pickedArtwork) {
            const randomIndex = Math.floor(Math.random() * artworks.length);
            pickedArtwork = artworks[randomIndex];
        }
        
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

        console.log('Picked artwork (Current):', pickedArtwork.title);
        
        // Construct the current data object
        const currentData = {
            ...pickedArtwork,
            iteration: record 
        };

        // 1. Send the CURRENT artwork to the Local Display (and Control Panel)
        // We use a specific event 'artwork-current' for local display
        io.emit('artwork-current', currentData);
        // Also emit 'artwork-selected' for backward compatibility with control panel and local display if they listen to it
        // BUT we need to differentiate what the CLIENT receives.
        
        // To handle the requirement: "Server sends A to client (pushed away)"
        // If we have previous artwork, send it to the CLIENTs
        if (previousArtworkData) {
             console.log("Sending PREVIOUS artwork to Clients:", previousArtworkData.title);
             io.emit('artwork-pushed', previousArtworkData); 
        } else {
            console.log("No previous artwork to push to clients yet.");
        }

        // Update the previous artwork to be the current one for next time
        previousArtworkData = currentData;
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
