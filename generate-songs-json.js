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

      while (!done) {
        const list = await b2.listFileNames({
          bucketId,
          startFileName,
          maxFileCount: 1000,
        });

        const files = list.data.files;

        const songs = files
          .filter(f => f.fileName.endsWith('.mp3'))
          .map(f => ({
            title: path.basename(f.fileName, '.mp3'),
            url: `${b2.downloadUrl}/file/${bucket.bucketName}/${encodeURIComponent(f.fileName)}`,
            cover: `https://townsquare.media/site/295/files/2024/01/attachment-Saviors_Cover.jpg?w=980&q=75`,
          }));

        allSongs.push(...songs);

        if (list.data.nextFileName) {
          startFileName = list.data.nextFileName;
        } else {
          done = true;
        }
      }
    }

    // 5. Tulis ke file JSON
    fs.writeFileSync('public/songs.json', JSON.stringify(allSongs, null, 2));
    console.log(`✅ ${allSongs.length} lagu ditulis ke public/songs.json`);

  } catch (err) {
    console.error('❌ ERROR:', err.message || err);
  }
})();
