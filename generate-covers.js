// upload-covers-b2.js — Upload semua cover art ke Backblaze B2
// Usage: node upload-covers-b2.js
// Prereq: npm install backblaze-b2 dotenv

const B2 = require('backblaze-b2');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID,
  applicationKey: process.env.B2_APP_KEY,
});

const coverDir = 'public/covers';
const B2_COVER_PREFIX = 'covers/'; // folder di dalam bucket

// Mapping extension -> MIME type
const getMimeType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  const types = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
  };
  return types[ext] || 'application/octet-stream';
};

(async () => {
  try {
    console.log('🔐 Authorizing B2...');
    await b2.authorize();
    console.log('✅ Authorized');

    // Find bucket
    const bucketsResponse = await b2.listBuckets();
    const bucket = bucketsResponse.data.buckets.find(b => b.bucketName === 'music-pribadi');
    if (!bucket) {
      console.error('❌ Bucket music-pribadi tidak ditemukan');
      return;
    }
    console.log(`✅ Using bucket: ${bucket.bucketName}`);

    // List existing covers in B2
    console.log('📂 Checking existing covers in B2...');
    const existingFiles = new Set();
    let startFileName = null;
    let done = false;

    while (!done) {
      const list = await b2.listFileNames({
        bucketId: bucket.bucketId,
        startFileName,
        prefix: B2_COVER_PREFIX,
        maxFileCount: 1000,
      });

      list.data.files.forEach(f => existingFiles.add(f.fileName));

      if (list.data.nextFileName) {
        startFileName = list.data.nextFileName;
      } else {
        done = true;
      }
    }
    console.log(`📦 Existing covers in B2: ${existingFiles.size}`);

    // Read local covers
    if (!fs.existsSync(coverDir)) {
      console.error(`❌ Folder ${coverDir} tidak ditemukan`);
      return;
    }

    const localFiles = fs.readdirSync(coverDir).filter(f => {
      const ext = path.extname(f).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
    });
    console.log(`🖼️  Local covers: ${localFiles.length}`);

    let uploaded = 0;
    let skipped = 0;
    let failed = 0;

    for (const filename of localFiles) {
      const b2FileName = `${B2_COVER_PREFIX}${filename}`;

      // Skip kalau sudah ada di B2
      if (existingFiles.has(b2FileName)) {
        skipped++;
        continue;
      }

      const filePath = path.join(coverDir, filename);
      const fileData = fs.readFileSync(filePath);
      const mimeType = getMimeType(filename);

      try {
        // Get upload URL (refresh per file biar aman)
        const uploadUrlResponse = await b2.getUploadUrl({
          bucketId: bucket.bucketId,
        });

        await b2.uploadFile({
          uploadUrl: uploadUrlResponse.data.uploadUrl,
          uploadAuthToken: uploadUrlResponse.data.authorizationToken,
          fileName: b2FileName,
          data: fileData,
          mime: mimeType,
        });

        uploaded++;
        console.log(`✅ Uploaded: ${filename} (${(fileData.length / 1024).toFixed(0)}KB)`);
      } catch (err) {
        failed++;
        console.error(`❌ Failed: ${filename} — ${err.message}`);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Uploaded: ${uploaded}`);
    console.log(`   Skipped:  ${skipped} (already in B2)`);
    console.log(`   Failed:   ${failed}`);
    console.log(`   Total:    ${localFiles.length}`);

    if (uploaded > 0) {
      console.log(`\n🔗 Covers accessible at:`);
      console.log(`   ${b2.downloadUrl}/file/music-pribadi/covers/<filename>`);
    }

    console.log('\n✅ Done!');
  } catch (err) {
    console.error('❌ Error:', err);
  }
})();