# Online Archive System

This system is designed to store and display artwork results from the exhibition system.

## Setup

1.  Navigate to this folder: `cd __online_archive_system`
2.  Install dependencies: `npm install`
3.  Start the server: `node server.js`

The server will run on port 3000 by default.

## How it works

1.  The exhibition system generates a QR code pointing to this system's URL with parameters (e.g., `?id=TeamA&seed=123...`).
2.  When a user visits this URL, the system saves the parameters into a JSON file in the `data/` folder and assigns a unique 8-character ID.
3.  The browser is then redirected to `/view/[ID]`.
4.  The display page shows the artwork in an iframe on the left (Desktop) or top (Mobile), with parameters on the right (Desktop) or bottom (Mobile).

## Configuration

In `__exhibition_system/public/result.html`, update `ARTWORK_VIEW_BASE_URL` to point to where this system is hosted.

Example:
```javascript
const ARTWORK_VIEW_BASE_URL = "https://your-domain.com";
```
