const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const target = process.argv[2] || 'all'; // 'firefox', 'chrome', 'edge', 'all'
const rootDir = __dirname;
const artifactsDir = path.join(rootDir, 'web-ext-artifacts');
const manifestFirefox = path.join(rootDir, 'manifest.json');
const manifestChrome = path.join(rootDir, 'manifest.chrome.json');
const backupManifest = path.join(rootDir, 'manifest.backup.json');

const version = JSON.parse(fs.readFileSync(manifestFirefox, 'utf8')).version;

if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
}

function buildFirefox() {
    console.log(`\n🚀 [Firefox] Building image2n8n-firefox-${version}.zip ...`);
    const cmd = `npx web-ext build --filename="image2n8n-firefox-${version}.zip" --overwrite-dest`;
    execSync(cmd, { stdio: 'inherit', cwd: rootDir });
    console.log(`✅ [Firefox] Built: web-ext-artifacts/image2n8n-firefox-${version}.zip`);
}

function buildChrome() {
    console.log(`\n🚀 [Chrome/Edge] Building image2n8n-edge-chrome-${version}.zip ...`);
    // Backup original manifest.json
    fs.copyFileSync(manifestFirefox, backupManifest);
    try {
        // Swap with Chrome/Edge manifest
        fs.copyFileSync(manifestChrome, manifestFirefox);
        const cmd = `npx web-ext build --filename="image2n8n-edge-chrome-${version}.zip" --overwrite-dest`;
        execSync(cmd, { stdio: 'inherit', cwd: rootDir });
        console.log(`✅ [Chrome/Edge] Built: web-ext-artifacts/image2n8n-edge-chrome-${version}.zip`);
    } finally {
        // Restore Firefox manifest.json
        if (fs.existsSync(backupManifest)) {
            fs.copyFileSync(backupManifest, manifestFirefox);
            fs.unlinkSync(backupManifest);
        }
    }
}

try {
    if (target === 'firefox') {
        buildFirefox();
    } else if (target === 'chrome' || target === 'edge') {
        buildChrome();
    } else {
        buildFirefox();
        buildChrome();
    }
    console.log('\n🎉 All requested builds completed successfully!\n');
} catch (err) {
    console.error('\n❌ Build failed:', err.message);
    process.exit(1);
}
