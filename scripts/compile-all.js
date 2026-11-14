const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const TARGET_IMAGES = [
  'assets/target-0.png',
  'assets/target-1.png',
  'assets/card-benthanh.jpg',
  'assets/card-hanoi.jpg',
  'assets/gallery-danang.jpg',
  'assets/gallery-halong.jpg',
  'assets/card-hue.jpg',
  'assets/card-trangan.jpg',
  'assets/card-notredame.jpg',
  'assets/card-phuquoc.jpg'
];

async function main() {
  console.log("🚀 Starting MindAR target compilation for all 10 locations...");
  
  // Read images as base64 data URLs so no network or cross-origin issues
  const imageDataUrls = [];
  for (let i = 0; i < TARGET_IMAGES.length; i++) {
    const imgPath = path.join(__dirname, TARGET_IMAGES[i]);
    if (!fs.existsSync(imgPath)) {
      throw new Error(`File not found: ${imgPath}`);
    }
    const ext = path.extname(imgPath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
    const base64 = fs.readFileSync(imgPath).toString('base64');
    imageDataUrls.push(`data:${ext};base64,${base64}`);
    console.log(`  [${i}] Loaded ${TARGET_IMAGES[i]} (${(fs.statSync(imgPath).size / 1024).toFixed(1)} KB)`);
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(300000);
  page.setDefaultNavigationTimeout(300000);
  
  page.on('console', msg => {
    console.log(`[Browser] ${msg.text()}`);
  });

  // Provide HTML with MindAR compiler (ES Module)
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body>
      <script type="module">
        import { Compiler } from "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js";

        window.compileTargets = async function(dataUrls) {
          console.log("Starting image loading in browser...");
          const images = [];
          for (let i = 0; i < dataUrls.length; i++) {
            const img = new Image();
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = () => reject(new Error("Failed to load image " + i));
              img.src = dataUrls[i];
            });
            images.push(img);
          }
          console.log("All " + images.length + " images loaded. Initializing MindAR Compiler...");
          const compiler = new Compiler();
          
          await compiler.compileImageTargets(images, (progress) => {
            console.log("Compilation Progress: " + progress.toFixed(1) + "%");
          });
          
          console.log("Compilation complete! Exporting data buffer...");
          const buffer = await compiler.exportData();
          return Array.from(new Uint8Array(buffer));
        };
        window.compilerReady = true;
      </script>
    </body>
    </html>
  `;

  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => window.compilerReady === true);

  console.log("Invoking compileTargets in headless browser...");
  const startTime = Date.now();
  const byteArray = await page.evaluate(async (dataUrls) => {
    return await window.compileTargets(dataUrls);
  }, imageDataUrls);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Exported buffer received! Size: ${(byteArray.length / 1024 / 1024).toFixed(2)} MB (Took ${durationSec}s)`);

  const mindBuffer = Buffer.from(byteArray);
  const outPath = path.join(__dirname, 'assets', 'targets.mind');
  fs.writeFileSync(outPath, mindBuffer);
  console.log(`✅ Successfully saved 10 targets to: ${outPath} (${(mindBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

  await browser.close();
}

main().catch(err => {
  console.error("❌ Compilation failed:", err);
  process.exit(1);
});
