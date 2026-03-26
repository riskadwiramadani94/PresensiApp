const https = require('https');
const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'models');
if (!fs.existsSync(modelsDir)) fs.mkdirSync(modelsDir);

const BASE_URL = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model';

const files = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
];

// Fallback URL jika file tidak ada di path utama
const FALLBACK_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

const download = (filename) => {
  return new Promise((resolve, reject) => {
    const dest = path.join(modelsDir, filename);
    if (fs.existsSync(dest)) {
      console.log(`✅ Already exists: ${filename}`);
      return resolve();
    }
    const file = fs.createWriteStream(dest);
    const url = `${BASE_URL}/${filename}`;
    console.log(`⬇️  Downloading: ${filename}`);
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        fs.unlinkSync(dest);
        return reject(new Error(`Failed ${filename}: HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      fs.unlinkSync(dest);
      reject(err);
    });
  });
};

(async () => {
  console.log('📦 Downloading face-api models...\n');
  for (const f of files) {
    try { await download(f); } catch (e) { console.error('❌', e.message); }
  }
  console.log('\n✅ Done!');
})();
