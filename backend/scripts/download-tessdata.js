#!/usr/bin/env node
/**
 * Script to download Tesseract.js language data
 * This ensures all required languages are available before OCR processing
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const TESSERACT_LANG_DATA_URL = 'https://github.com/naptha/tessdata/raw/gh-pages/4.0.0_best';
const LANG_DATA_DIR = path.join(__dirname, '..', 'tessdata');

// Languages needed for Serbian fiscal receipts
const LANGUAGES = [
  'eng',  // English
  'srp',  // Serbian Cyrillic
  'srp_latn', // Serbian Latin
];

console.log('Downloading Tesseract language data...\n');

// Create tessdata directory if it doesn't exist
if (!fs.existsSync(LANG_DATA_DIR)) {
  fs.mkdirSync(LANG_DATA_DIR, { recursive: true });
  console.log(`Created directory: ${LANG_DATA_DIR}`);
}

async function downloadLanguage(lang) {
  const url = `${TESSERACT_LANG_DATA_URL}/${lang}.traineddata`;
  const filePath = path.join(LANG_DATA_DIR, `${lang}.traineddata`);

  // Check if file already exists
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`✓ ${lang}.traineddata already exists (${sizeMB} MB)`);
    return Promise.resolve();
  }

  console.log(`Downloading ${lang}.traineddata...`);

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file);
          redirectResponse.on('end', () => {
            const stats = fs.statSync(filePath);
            const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
            console.log(`✓ Downloaded ${lang}.traineddata (${sizeMB} MB)`);
            resolve();
          });
        }).on('error', reject);
      } else if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          const stats = fs.statSync(filePath);
          const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
          console.log(`✓ Downloaded ${lang}.traineddata (${sizeMB} MB)`);
          resolve();
        });
      } else {
        reject(new Error(`HTTP ${response.statusCode}: Failed to download ${lang}`));
      }
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

async function main() {
  try {
    for (const lang of LANGUAGES) {
      await downloadLanguage(lang);
    }
    console.log('\n✅ All language data downloaded successfully!');
    console.log(`\nLocation: ${LANG_DATA_DIR}`);
    console.log('\nYou can now scan Serbian fiscal receipts (Fiskalni Računi) with full support.');
  } catch (error) {
    console.error('\n❌ Error downloading language data:', error.message);
    process.exit(1);
  }
}

main();
