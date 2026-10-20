import fs from 'fs';
import path from 'path';
import https from 'https';
import sharp from 'sharp';

const SOURCES_DIR = path.resolve('public/images/clio/sources');
if (!fs.existsSync(SOURCES_DIR)) {
  fs.mkdirSync(SOURCES_DIR, { recursive: true });
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading ${url}...`);
    const file = fs.createWriteStream(destPath);
    const options = {
      headers: {
        'User-Agent': 'ClioAcademicArchiveBot/1.0 (https://github.com/01jackrichard/Clio)',
      },
    };
    https.get(url, options, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: HTTP ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          console.log(`Saved ${destPath}`);
          resolve(destPath);
        });
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function main() {
  const frontDest = path.join(SOURCES_DIR, 'jan-van-der-heyden-library-interior.jpg');
  const backDest = path.join(SOURCES_DIR, 'edward-lamson-henry-library-interior.jpg');

  if (!fs.existsSync(frontDest)) {
    await downloadFile('https://upload.wikimedia.org/wikipedia/commons/0/06/Jan_van_der_Heyden_-_Library_Interior_with_Still_Life.jpg', frontDest);
  }
  if (!fs.existsSync(backDest)) {
    await downloadFile('https://upload.wikimedia.org/wikipedia/commons/e/ea/Edward_Lamson_Henry_-_Library_Interior_-_Google_Art_Project.jpg', backDest);
  }

  const frontMeta = await sharp(frontDest).metadata();
  const backMeta = await sharp(backDest).metadata();

  console.log('Front Artwork (Jan van der Heyden):', {
    width: frontMeta.width,
    height: frontMeta.height,
    format: frontMeta.format,
    aspect: (frontMeta.width / frontMeta.height).toFixed(3),
  });

  console.log('Back Artwork (Edward Lamson Henry):', {
    width: backMeta.width,
    height: backMeta.height,
    format: backMeta.format,
    aspect: (backMeta.width / backMeta.height).toFixed(3),
  });
}

main().catch(console.error);
