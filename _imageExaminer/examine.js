const sharp = require('sharp');
const glob = require('fast-glob');
const fs = require('fs');
const path = require('path');

/**
 * IMAGE EXAMINER & COMPRESSOR
 * 
 * This script searches for all JPG and PNG images in the project and attempts
 * to compress them. If the compressed version is smaller, it replaces the original.
 */

// Compression settings - feel free to adjust these
const JPG_QUALITY = 80;
const PNG_QUALITY = 80;
const PNG_COMPRESSION_LEVEL = 9;
const REPLACE_THRESHOLD_KB = 5; // Only replace if reduction is at least 5KB

const projectRoot = path.join(__dirname, '..');
const tempDir = path.join(__dirname, 'temp');

if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function examineImages() {
    console.log('Searching for images...');
    
    // Find all images, excluding common non-asset folders
    const images = await glob('**/*.{jpg,jpeg,png,JPG,JPEG,PNG}', {
        cwd: projectRoot,
        ignore: [
            '**/node_modules/**', 
            '_imageExaminer/**', 
            '**/dist/**', 
            '**/__iteration_records/**',
            '**/libraries/**',
            '**/p5types/**',
            '**/.git/**'
        ],
        absolute: true
    });

    console.log(`Found ${images.length} images to examine.`);
    
    const results = [];
    let totalReduction = 0;
    let errorCount = 0;

    for (let i = 0; i < images.length; i++) {
        const imagePath = images[i];
        const relativePath = path.relative(projectRoot, imagePath);
        
        let stats;
        try {
            stats = fs.statSync(imagePath);
        } catch (e) {
            errorCount++;
            continue;
        }
        
        const originalSize = stats.size;
        const ext = path.extname(imagePath).toLowerCase();
        const tempPath = path.join(tempDir, `temp_${i}${ext}`);

        try {
            // Read into buffer to avoid locking the original file while processing
            const inputBuffer = fs.readFileSync(imagePath);
            let pipeline = sharp(inputBuffer);

            if (ext === '.jpg' || ext === '.jpeg') {
                pipeline = pipeline.jpeg({ quality: JPG_QUALITY, progressive: true });
            } else if (ext === '.png') {
                pipeline = pipeline.png({ quality: PNG_QUALITY, compressionLevel: PNG_COMPRESSION_LEVEL });
            }

            const outputBuffer = await pipeline.toBuffer();
            const newSize = outputBuffer.length;

            if (newSize < originalSize - (REPLACE_THRESHOLD_KB * 1024)) {
                // Save to temp folder first as requested
                fs.writeFileSync(tempPath, outputBuffer);
                
                const reduction = originalSize - newSize;
                totalReduction += reduction;
                
                // Replace original
                fs.writeFileSync(imagePath, outputBuffer);
                
                results.push({
                    path: relativePath,
                    originalSize,
                    newSize,
                    reduction,
                    replaced: true
                });
                console.log(`[REPLACED] ${relativePath}: ${(originalSize / 1024).toFixed(1)} KB -> ${(newSize / 1024).toFixed(1)} KB (-${(reduction / 1024).toFixed(1)} KB)`);
            } else {
                results.push({
                    path: relativePath,
                    originalSize,
                    newSize,
                    reduction: 0,
                    replaced: false
                });
            }

            // Cleanup temp file
            if (fs.existsSync(tempPath)) {
                try { fs.unlinkSync(tempPath); } catch(e) {}
            }
        } catch (err) {
            console.error(`[ERROR] Processing ${relativePath}:`, err.message);
            errorCount++;
        }
        
        // Small pause every few images to let the OS catch up
        if (i % 25 === 0) await sleep(20);
    }

    // Final Report
    console.log('\n' + '='.repeat(80));
    console.log('IMAGE COMPRESSION REPORT');
    console.log('='.repeat(80));
    console.log(`${'FILE PATH'.padEnd(60)} | ${'REDUCTION'}`);
    console.log('-'.repeat(80));
    
    const replacedImages = results.filter(r => r.replaced);
    
    if (replacedImages.length === 0) {
        console.log('No significant size reductions found in this pass.');
    } else {
        replacedImages.sort((a, b) => b.reduction - a.reduction);
        replacedImages.forEach(r => {
            const reductionStr = `-${(r.reduction / 1024).toFixed(1)} KB`.padStart(15);
            console.log(`${r.path.padEnd(60)} | ${reductionStr}`);
        });
        
        console.log('-'.repeat(80));
        console.log(`Total images examined:  ${images.length}`);
        console.log(`Total images reduced:   ${replacedImages.length}`);
        console.log(`Total errors:           ${errorCount}`);
        console.log(`Total size reduction:   ${(totalReduction / (1024 * 1024)).toFixed(2)} MB`);
    }
    console.log('='.repeat(80));
    console.log('Done! You can delete the "_imageExaminer/temp" folder if it still exists.');
}

examineImages().catch(err => {
    console.error('Fatal error:', err);
});
