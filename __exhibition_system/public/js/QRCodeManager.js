/**
 * QRCodeManager
 * A utility class to manage QR code generation within the exhibition system.
 */
class QRCodeManager {
    /**
     * @param {string} containerId - The ID of the HTML element where the QR code will be rendered.
     * @param {Object} options - Configuration for the QR code.
     */
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.options = Object.assign({
            width: 256,
            height: 256,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: 1 // 1: L, 0: M, 3: Q, 2: H (qrcode.js specific mapping)
        }, options);
        this.qrcode = null;
    }

    /**
     * Generate a QR code for a given string (usually a URL).
     * @param {string} text - The string to encode in the QR code.
     */
    generate(text) {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`QRCodeManager: Container with id "${this.containerId}" not found.`);
            return;
        }

        // Clear previous content
        container.innerHTML = "";

        if (typeof QRCode === 'undefined') {
            console.error("QRCodeManager: QRCode library is not loaded. Please include qrcode.min.js.");
            container.innerText = "QR Code Library Error";
            return;
        }

        try {
            this.qrcode = new QRCode(container, {
                text: text,
                width: this.options.width,
                height: this.options.height,
                colorDark: this.options.colorDark,
                colorLight: this.options.colorLight,
                correctLevel: QRCode.CorrectLevel.H
            });
            console.log(`QRCodeManager: Generated QR code for "${text}"`);
        } catch (error) {
            console.error("QRCodeManager: Error generating QR code:", error);
            container.innerText = "Error generating QR code";
        }
    }

    /**
     * Static helper to construct a URL with parameters.
     * @param {string} baseURL - The base URL of the artwork website.
     * @param {Object} params - Key-value pairs of parameters to include in the query string.
     * @returns {string} The complete URL.
     */
    static constructURL(baseURL, params) {
        try {
            const url = new URL(baseURL);
            for (const [key, value] of Object.entries(params)) {
                url.searchParams.append(key, value);
            }
            return url.toString();
        } catch (e) {
            console.error("QRCodeManager: Invalid base URL provided.");
            return baseURL;
        }
    }
}

// Export for use in other scripts if needed, or just leave as global
window.QRCodeManager = QRCodeManager;
