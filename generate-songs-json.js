// 1. Import
const B2 = require('backblaze-b2');
const fs = require('fs');
const path = require('path');

require('dotenv').config(); // Load .env

// 2. Inisialisasi B2
const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID,
  applicationKey: process.env.B2_APP_KEY,
});

// 3. Fungsi async utama
(async () => {
  try {
    console.log('🌀 Menghubungkan ke Backblaze...');
    await b2.authorize();

    console.log('✅ Authorized OK');
    console.log('🔗 API URL:', b2.authorizationApiUrl);
    console.log('🆔 Account ID:', b2.accountId);

    // 4. Ambil semua bucket
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

      // Ambil semua file di bucket (sekalian cari file cover juga)
      let allFiles = [];

      while (!done) {
        const list = await b2.listFileNames({
          bucketId,
          startFileName,
          maxFileCount: 1000,
        });

        allFiles.push(...list.data.files);

        if (list.data.nextFileName) {
          startFileName = list.data.nextFileName;
        } else {
          done = true;
        }
      }

      const songFiles = allFiles.filter(f => f.fileName.endsWith('.mp3'));

      for (const song of songFiles) {
        const base = path.basename(song.fileName, '.mp3');

        // Cari file cover dengan nama mirip: base.jpg / base.png
        const coverFile = allFiles.find(f =>
          f.fileName === `${base}.jpg` || f.fileName === `${base}.png` || f.fileName === `${base}.jpeg`
        );

        const songUrl = `${b2.downloadUrl}/file/${bucket.bucketName}/${encodeURIComponent(song.fileName)}`;
        const coverUrl = coverFile
          ? `${b2.downloadUrl}/file/${bucket.bucketName}/${encodeURIComponent(coverFile.fileName)}`
          : null;

        allSongs.push({
          title: base,
          url: songUrl,
          cover: coverUrl
        });
      }
    }

    // 5. Tulis ke file JSON
    fs.writeFileSync('public/songs.json', JSON.stringify(allSongs, null, 2));
    console.log(`✅ ${allSongs.length} lagu ditulis ke public/songs.json`);

  } catch (err) {
    console.error('❌ ERROR:', err.message || err);
  }
})();
