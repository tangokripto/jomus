// generate-artist-photos.js — Scan B2 artist photos + generate mapping
// Usage: node generate-artist-photos.js
// Reads songs.json to get all artist names, matches with photos in covers/artists/

const B2 = require('backblaze-b2');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID,
  applicationKey: process.env.B2_APP_KEY,
});

const SONGS_JSON = 'public/songs.json';
const OUTPUT = 'public/artist-photos.json';
const B2_FOLDER = 'covers/artists/';

function slugify(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Extract primary artist: "2Pac, Snoop Dogg" → "2Pac"
function getPrimaryArtist(artistString) {
  if (!artistString) return 'Unknown Artist';
  const separators = /,|\sfeat\.?\s|\sft\.?\s|\s&\s|\sx\s|\svs\.?\s/i;
  const primary = artistString.split(separators)[0].trim();
  return primary || artistString.trim();
}

(async () => {
  try {
    console.log('🔐 Authorizing B2...');
    await b2.authorize();
    const downloadUrl = b2.downloadUrl;

    const bucketsResponse = await b2.listBuckets();
    const bucket = bucketsResponse.data.buckets.find(b => b.bucketName === 'music-pribadi');
    if (!bucket) {
      console.error('❌ Bucket tidak ditemukan');
      return;
    }

    // 1. List all photos in covers/artists/
    console.log('📂 Scanning artist photos in B2...');
    const photoFiles = [];
    let startFileName = null;
    let done = false;

    while (!done) {
      const list = await b2.listFileNames({
        bucketId: bucket.bucketId,
        startFileName,
        prefix: B2_FOLDER,
        maxFileCount: 1000,
      });

      list.data.files.forEach(f => {
        const ext = path.extname(f.fileName).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.webp', '.avif'].includes(ext)) {
          photoFiles.push(f.fileName);
        }
      });

      if (list.data.nextFileName) {
        startFileName = list.data.nextFileName;
      } else {
        done = true;
      }
    }
    console.log(`🖼️  Found ${photoFiles.length} artist photos`);

    // Build lookup: slugified filename (without ext) → full B2 URL
    const photoMap = {};
    photoFiles.forEach(file => {
      const basename = path.basename(file, path.extname(file));
      const slug = slugify(basename);
      photoMap[slug] = `${downloadUrl}/file/${bucket.bucketName}/${file}`;
    });

    // 2. Read songs.json to get all unique artists
    const songs = JSON.parse(fs.readFileSync(SONGS_JSON, 'utf-8'));
    const artistSet = new Set();
    songs.forEach(song => {
      // Use filename-based artist (same as app does)
      const nameWithoutExt = song.file.replace(/\.[^/.]+$/, '');
      const parts = nameWithoutExt.split(' - ');
      const artist = parts.length > 1 ? parts[0].trim() : 'Unknown Artist';
      const primary = getPrimaryArtist(artist);
      artistSet.add(primary);
    });

    console.log(`🎤 Found ${artistSet.size} unique artists`);

    // 3. Match artists → photos
    const defaultPhoto = `${downloadUrl}/file/${bucket.bucketName}/${B2_FOLDER}default.jpg`;
    const artistPhotos = {};
    let matched = 0;
    let unmatched = 0;

    for (const artist of artistSet) {
      const slug = slugify(artist);
      if (photoMap[slug]) {
        artistPhotos[artist] = photoMap[slug];
        matched++;
      } else {
        artistPhotos[artist] = defaultPhoto;
        unmatched++;
      }
    }

    // 4. Write output
    fs.writeFileSync(OUTPUT, JSON.stringify(artistPhotos, null, 2));

    console.log(`\n📊 Results:`);
    console.log(`   ✅ Matched: ${matched}`);
    console.log(`   ❌ No photo (default): ${unmatched}`);
    console.log(`   📄 Written to ${OUTPUT}`);

    // List unmatched artists for reference
    if (unmatched > 0) {
      console.log(`\n🔍 Artists without photos (need: covers/artists/<slug>.jpg):`);
      for (const artist of artistSet) {
        const slug = slugify(artist);
        if (!photoMap[slug]) {
          console.log(`   - "${artist}" → ${slug}.jpg`);
        }
      }
    }
  } catch (err) {
    console.error('❌ Error:', err);
  }
})();