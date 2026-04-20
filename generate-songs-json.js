// generate-songs-json.js — FINAL FIXED

const B2 = require('backblaze-b2');
const fs = require('fs');
const path = require('path');
const mm = require('music-metadata');
const axios = require('axios');
const sharp = require('sharp');
require('dotenv').config();

console.log('🚀 SCRIPT STARTED - v2');
const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID,
  applicationKey: process.env.B2_APP_KEY,
});

const outputPath = 'public/songs.json';
const coverDir = 'public/covers';
if (!fs.existsSync(coverDir)) fs.mkdirSync(coverDir, { recursive: true });

function slugify(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function extractAndSaveCover(pictureBuffer, filenameBase) {
  const coverPath = path.join(coverDir, `${filenameBase}.png`);
  if (fs.existsSync(coverPath)) return `covers/${filenameBase}.png`;

  try {
    const outputBuffer = await sharp(pictureBuffer)
      .resize({ width: 1000, height: 1000, fit: 'inside' })
      .png({ compressionLevel: 0 })
      .toBuffer();

    fs.writeFileSync(coverPath, outputBuffer);
    return `covers/${filenameBase}.png`;
  } catch (err) {
    console.warn(`⚠️ Gagal kompres cover untuk ${filenameBase}:`, err.message);
    return null;
  }
}

async function getMetadataWithCover(url, filenameBase) {
  try {
    const { data } = await axios.get(url, { responseType: 'stream' });
    const metadata = await mm.parseStream(data, {}, { duration: true });

    let coverPath = null;
    if (metadata.common.picture?.length) {
      const picture = metadata.common.picture[0];
      coverPath = await extractAndSaveCover(picture.data, filenameBase);
    }

    return {
      title: metadata.common.title || path.basename(url, '.mp3'),
      artist: metadata.common.artist || 'Unknown Artist',
      album: metadata.common.album || 'Unknown Album',
      genre: metadata.common.genre?.[0] || 'Unknown Genre',
      duration: Math.round(metadata.format.duration || 0),
      cover: coverPath,
    };
  } catch (err) {
    console.warn(`⚠️ Gagal ambil metadata dari: ${url} — ${err.message}`);
    return null;
  }
}

(async () => {
  try {
    console.log('🔐 Authorizing...');
    await b2.authorize();
    console.log('✅ Authorized');

    let existingSongs = [];
    if (fs.existsSync(outputPath)) {
      const raw = fs.readFileSync(outputPath, 'utf-8');
      existingSongs = JSON.parse(raw);
      console.log(`📄 Existing songs: ${existingSongs.length}`);
    }

    const existingMap = new Map();
    existingSongs.forEach(song => existingMap.set(song.file, song));

    const bucketsResponse = await b2.listBuckets();
    console.log('📦 Buckets:', bucketsResponse.data.buckets.map(b => b.bucketName));

    const bucket = bucketsResponse.data.buckets.find(b => b.bucketName === 'music-pribadi');
    if (!bucket) {
      console.error('❌ Bucket tidak ditemukan. Available:', bucketsResponse.data.buckets.map(b => b.bucketName));
      return;
    }
    console.log(`✅ Using bucket: ${bucket.bucketName} (${bucket.bucketId})`);

    let allSongs = [...existingSongs];
    let startFileName = null;
    let done = false;

    while (!done) {
      console.log('📂 Listing files...');
      const list = await b2.listFileNames({
        bucketId: bucket.bucketId,
        startFileName,
        maxFileCount: 1000,
      });

      const allFiles = list.data.files;
      console.log(`📁 Total files in bucket: ${allFiles.length}`);

      const files = allFiles.filter(f => f.fileName.endsWith('.mp3'));
      console.log(`🎵 MP3 files found: ${files.length}`);

      for (const file of files) {
        const fileName = file.fileName;
        const fileUrl = `${b2.downloadUrl}/file/${bucket.bucketName}/${encodeURIComponent(fileName)}`;

        if (existingMap.has(fileName)) {
          console.log(`⏩ Skip (sudah ada): ${fileName}`);
          continue;
        }

        const filenameBase = slugify(path.basename(fileName, '.mp3'));
        console.log(`🎧 Memproses baru: ${fileName}`);

        const meta = await getMetadataWithCover(fileUrl, filenameBase);
        if (!meta) continue;

        const newSong = {
          file: fileName,
          url: fileUrl,
          title: meta.title,
          artist: meta.artist,
          album: meta.album,
          genre: meta.genre,
          duration: meta.duration,
          cover: meta.cover || 'covers/default.png',
        };

        allSongs.push(newSong);
        existingMap.set(fileName, newSong);
      }

      if (list.data.nextFileName) {
        startFileName = list.data.nextFileName;
      } else {
        done = true;
      }
    }

    allSongs.sort((a, b) => a.file.localeCompare(b.file));

    fs.writeFileSync(outputPath, JSON.stringify(allSongs, null, 2));
    console.log(`✅ ${allSongs.length} lagu ditulis ke ${outputPath}`);
  } catch (err) {
    console.error('❌ FULL ERROR:', err);
  }
})();