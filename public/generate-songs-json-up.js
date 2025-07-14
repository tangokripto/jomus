const https = require("https");
const fs = require("fs");

const keyId = "0035f5519819c920000000006";
const appKey = "K0034fld01+7HrTFG1WJRApjD4oqy98";
const bucketName = "music-pribadi";

// Helper HTTP request (POST)
function postJson(url, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const body = JSON.stringify(data);
    const options = {
      method: "POST",
      hostname: parsed.hostname,
      path: parsed.pathname,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        ...headers,
      },
    };

    const req = https.request(options, (res) => {
      let result = "";
      res.on("data", (chunk) => result += chunk);
      res.on("end", () => {
        try {
          resolve(JSON.parse(result));
        } catch (e) {
          reject(new Error("Failed to parse JSON: " + result));
        }
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// Basic auth helper
function getAuthHeader(user, pass) {
  return "Basic " + Buffer.from(user + ":" + pass).toString("base64");
}

async function main() {
  try {
    // Step 1: Authorize
    const authRes = await new Promise((resolve, reject) => {
      const req = https.request("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", {
        method: "GET",
        headers: {
          Authorization: getAuthHeader(keyId, appKey),
        },
      }, (res) => {
        let body = "";
        res.on("data", (chunk) => body += chunk);
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error("Auth failed: " + body));
          }
        });
      });

      req.on("error", reject);
      req.end();
    });

    const { authorizationToken, apiUrl, downloadUrl, accountId } = authRes;

    // Step 2: Get bucket ID
    const buckets = await postJson(`${apiUrl}/b2api/v2/b2_list_buckets`, {
      accountId
    }, {
      Authorization: authorizationToken,
    });

    const bucket = buckets.buckets.find(b => b.bucketName === bucketName);
    if (!bucket) throw new Error("Bucket not found.");
    const bucketId = bucket.bucketId;

    // Step 3: List files
    const fileList = await postJson(`${apiUrl}/b2api/v2/b2_list_file_names`, {
      bucketId,
      maxFileCount: 1000
    }, {
      Authorization: authorizationToken
    });

    const b2Files = fileList.files;

    // Step 4: Update songs.json
    const songs = JSON.parse(fs.readFileSync("songs.json", "utf-8"));

    const updated = songs.map(song => {
      const songPrefix = song.file.split(" - ")[0].trim().toLowerCase();

      const match = b2Files.find(f => {
        const filePrefix = f.fileName.split(" - ")[0].trim().toLowerCase();
        return filePrefix === songPrefix;
      });

      if (match) {
        song.url = `${downloadUrl}/file/${bucketName}/${match.fileName}`;
      } else {
        console.warn(`⚠️  Not found in B2: ${song.file}`);
      }

      return song;
    });

    fs.writeFileSync("songs.json", JSON.stringify(updated, null, 2));
    console.log("✅ Done updating songs.json");
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

main();
