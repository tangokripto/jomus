const B2 = require('backblaze-b2');
const fs = require('fs');
const path = require('path');
const mm = require('music-metadata');
require('dotenv').config();

const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID,
  applicationKey: process.env.B2_APP_KEY,
});

async function getMetadataFromUrl(url) {
  const axios = require('axios');
  try {
    const { data } = await axios.get(url, { responseType: 'stream' });
    const metadata = await mm.parseStream(data, {}, { duration: true });

    return {
      title: metadata.common.title || 'Unknown Title',
      artist: metadata.common.artist || 'Unknown Artist',
      album: metadata.common.album || 'Unknown Album',
      genre: metadata.common.genre?.[0] || 'Unknown Genre',
      duration: Math.round(metadata.format.duration || 0),
    };
  } catch (err) {
    console.warn(`⚠️  Gagal ambil metadata: ${url} — ${err.message}`);
    return {
      title: 'Unknown Title',
      artist: 'Unknown Artist',
      album: 'Unknown Album',
      genre: 'Unknown Genre',
      duration: 0,
    };
  }
}

(async () => {
  try {
    console.log('🔗 Autentikasi ke Backblaze...');
    await b2.authorize();
    console.log('✅ Authorized');

    const oldJsonPath = 'public/songs.json';
    const newJsonPath = 'b2-latest.json';
    let oldSongs = [];

    if (fs.existsSync(oldJsonPath)) {
      oldSongs = JSON.parse(fs.readFileSync(oldJsonPath, 'utf-8'));
    }

    const oldFiles = oldSongs.map(song => song.file.trim().toLowerCase());
    const existingFiles = new Set(oldFiles);
    let newSongs = [];

    const TEN_MINUTES = 10 * 60 * 1000;
    const now = Date.now();

    const buckets = (await b2.listBuckets()).data.buckets;
    for (const bucket of buckets) {
      console.log(`📦 Memeriksa bucket: ${bucket.bucketName}`);
      const bucketId = bucket.bucketId;
      let startFileName = null;
      let done = false;

      while (!done) {
        const list = await b2.listFileNames({
          bucketId,
          startFileName,
          maxFileCount: 1000,
        });

        const files = list.data.files.filter(f => f.fileName.endsWith('.mp3'));
        for (const file of files) {
          const normalizedName = file.fileName.trim().toLowerCase();

          // ⏱️ Skip jika file sudah lama (> 10 menit)
          if (now - file.uploadTimestamp > TEN_MINUTES) {
            continue;
          }

          if (!existingFiles.has(normalizedName)) {
            const baseName = path.basename(normalizedName, '.mp3');
            const similar = oldFiles.find(old => old.includes(baseName));
            if (similar) {
              console.log(`⚠️  Terdeteksi file mirip: "${file.fileName}" ≈ "${similar}"`);
            }
          }

          if (existingFiles.has(normalizedName)) {
            continue; // sudah ada
          }

          const fileUrl = `${b2.downloadUrl}/file/${bucket.bucketName}/${encodeURIComponent(file.fileName)}`;
          console.log(`🆕 Lagu baru ditemukan (upload < 10 menit): ${file.fileName}`);

          const meta = await getMetadataFromUrl(fileUrl);

          newSongs.push({
            file: file.fileName,
            url: fileUrl,
            title: meta.title || path.basename(file.fileName, '.mp3'),
            artist: meta.artist,
            album: meta.album,
            genre: meta.genre,
            duration: meta.duration,
            cover: 'https://via.placeholder.com/300?text=No+Cover', // default
          });
        }

        if (list.data.nextFileName) {
          startFileName = list.data.nextFileName;
        } else {
          done = true;
        }
      }
    }

    if (newSongs.length > 0) {
      fs.writeFileSync(newJsonPath, JSON.stringify(newSongs, null, 2));
      console.log(`✅ ${newSongs.length} lagu baru ditulis ke ${newJsonPath}`);
    } else {
      console.log('📭 Tidak ada lagu baru ditemukan dalam 10 menit terakhir.');
    }

  } catch (err) {
    console.error('❌ ERROR:', err.message || err);
  }
})();
