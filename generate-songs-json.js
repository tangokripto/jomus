// 1. Import
const B2 = require('backblaze-b2');
const fs = require('fs');
const path = require('path');
const mm = require('music-metadata');
const axios = require('axios');
require('dotenv').config(); // Load .env

// 2. Inisialisasi B2
const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID,
  applicationKey: process.env.B2_APP_KEY,
});

// 3. Fungsi ambil metadata dari file URL
async function getMetadataFromUrl(url) {
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
    console.warn(`⚠️  Gagal ambil metadata dari: ${url} — ${err.message}`);
    return {
      title: 'Unknown Title',
      artist: 'Unknown Artist',
      album: 'Unknown Album',
      genre: 'Unknown Genre',
      duration: 0,
    };
  }
}

// 4. Fungsi async utama
(async () => {
  try {
    console.log('🌀 Menghubungkan ke Backblaze...');
    await b2.authorize();

    console.log('✅ Authorized OK');
    console.log('🔗 API URL:', b2.authorizationApiUrl);
    console.log('🆔 Account ID:', b2.accountId);

    // Baca existing songs.json (jika ada)
    let existingSongs = [];
    const outputPath = 'public/songs.json';

    if (fs.existsSync(outputPath)) {
      existingSongs = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    }

    const existingMap = new Map();
    existingSongs.forEach(song => {
      existingMap.set(song.file, song); // pakai fileName sebagai key
    });

    const bucketsResponse = await b2.listBuckets();
    const buckets = bucketsResponse.data.buckets;

    if (!buckets.length) {
      console.error('❌ Tidak ada bucket ditemukan.');
      return;
    }

    let allSongs = [];

    for (const bucket of buckets) {
      console.log(`🎵 Memindai bucket: ${bucket.bucketName}`);
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
          const fileUrl = `${b2.downloadUrl}/file/${bucket.bucketName}/${encodeURIComponent(file.fileName)}`;
          const existing = existingMap.get(file.fileName);

          if (existing && existing.cover) {
            console.log(`🟡 Skip (sudah ada cover): ${file.fileName}`);
            allSongs.push(existing); // tambahkan dari data lama
            continue;
          }

          console.log(`🎧 Memproses: ${file.fileName}`);
          const meta = await getMetadataFromUrl(fileUrl);

          allSongs.push({
            file: file.fileName,
            url: fileUrl,
            title: meta.title || path.basename(file.fileName, '.mp3'),
            artist: meta.artist,
            album: meta.album,
            genre: meta.genre,
            duration: meta.duration,
            cover: `https://townsquare.media/site/295/files/2024/01/attachment-Saviors_Cover.jpg?w=980&q=75`, // fallback default
          });
        }

        if (list.data.nextFileName) {
          startFileName = list.data.nextFileName;
        } else {
          done = true;
        }
      }
    }

    fs.writeFileSync(outputPath, JSON.stringify(allSongs, null, 2));
    console.log(`✅ ${allSongs.length} lagu ditulis ke ${outputPath}`);

  } catch (err) {
    console.error('❌ ERROR:', err.message || err);
  }
})();
