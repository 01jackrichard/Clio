import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const COLORS = {
  oxblood: '#7A1F1D',        // Authentic rich Clio burgundy
  oxbloodDeep: '#581514',
  ink: '#121110',            // Primary black ink
  ivoryBg: '#F8F3EE',        // Warm authentic paper background from user image
  ash: '#736B63',
};

// 1. Read the vector paths from the authentic stacked logo SVG
const stackedSvg = fs.readFileSync(path.resolve('public/images/clio-logo-stacked.svg'), 'utf8');
const allDMatches = [...stackedSvg.matchAll(/<path d="([^"]+)"/g)].map(m => m[1]);
if (allDMatches.length < 4) {
  throw new Error(`Expected at least 4 path elements in clio-logo-stacked.svg, found ${allDMatches.length}`);
}

const EMBLEM_D = allDMatches[0];
const WORDMARK_D = allDMatches[1];
const DIVIDER_STAR_D = allDMatches[2];
const ACADEMIC_ARCHIVE_D = allDMatches[3];

/**
 * Creates the square Emblem SVG (512x512) with transparent or ivory background.
 * Viewbox calibrated so the emblem is optical-centered with comfortable breathing room.
 */
function createEmblemSvg({ width = 512, height = 512, includeBackground = false, background = COLORS.ivoryBg, scale = 1.0 } = {}) {
  // Original emblem path bounds: ~1060 wide, ~1010 high.
  // Center is approx (530, 505).
  // Target square size = 1240.
  const bg = includeBackground ? `<rect width="512" height="512" fill="${background}" rx="0"/>` : '';
  
  // Transform: center (256, 256), scale by (512 / 1240) * scale, translate by (-530, -505)
  const baseScale = (512 / 1240) * scale;
  
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${width}" height="${height}">
  ${bg}
  <g transform="translate(256, 256) scale(${baseScale}) translate(-530, -505)">
    <path d="${EMBLEM_D}" fill="${COLORS.oxblood}" fill-rule="evenodd" />
  </g>
</svg>`;
}

/**
 * Creates the official full stacked logo matching the user's uploaded master asset:
 * 1. Emblem on top
 * 2. Wordmark "Clio" in the middle
 * 3. Divider rule with central diamond star
 * 4. "ACADEMIC ARCHIVE" spaced caps subtitle
 */
function createStackedLogoSvg({ width = 1024, height = 576, includeBackground = true, background = COLORS.ivoryBg } = {}) {
  const bg = includeBackground ? `<rect width="${width}" height="${height}" fill="${background}"/>` : '';

  // Original coordinates from 1024x576 user image:
  // Emblem: center X ~ 512, top Y = 78, height ~ 200, width ~ 210 -> scale: 200 / 1010 ~ 0.198
  // Wordmark: center X ~ 510, top Y = 288, width ~ 380, height ~ 152 -> scale: 380 / 1520 ~ 0.25
  // Divider + Star: center X ~ 512, top Y = 450, width ~ 408, height ~ 26 -> scale: 408 / 1632 ~ 0.25
  // ACADEMIC ARCHIVE: center X ~ 512, top Y = 485, width ~ 404, height ~ 24 -> scale: 404 / 1616 ~ 0.25

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 576" width="${width}" height="${height}">
  ${bg}
  <!-- 1. Emblem (Oxblood Burgundy) -->
  <g transform="translate(512, 78) translate(-105, 0) scale(0.198)">
    <path d="${EMBLEM_D}" fill="${COLORS.oxblood}" fill-rule="evenodd" />
  </g>

  <!-- 2. Clio Wordmark (Ink Black) -->
  <g transform="translate(512, 288) translate(-190, 0) scale(0.25)">
    <path d="${WORDMARK_D}" fill="${COLORS.ink}" fill-rule="evenodd" />
  </g>

  <!-- 3. Divider with Star (Oxblood Burgundy) -->
  <g transform="translate(512, 452) translate(-204, 0) scale(0.25)">
    <path d="${DIVIDER_STAR_D}" fill="${COLORS.oxblood}" fill-rule="evenodd" />
  </g>

  <!-- 4. ACADEMIC ARCHIVE (Ink Black) -->
  <g transform="translate(512, 486) translate(-202, 0) scale(0.25)">
    <path d="${ACADEMIC_ARCHIVE_D}" fill="${COLORS.ink}" fill-rule="evenodd" />
  </g>
</svg>`;
}

/**
 * Creates the horizontal navbar brand logo SVG (Emblem + Wordmark + Divider + Subtitle)
 */
function createHorizontalLogoSvg({ width = 360, height = 48 } = {}) {
  // Height = 48.
  // Emblem height ~ 36 (scale: 36 / 1010 ~ 0.0356). Width = 1060 * 0.0356 ~ 38.
  // Wordmark height ~ 32 (scale: 32 / 608 ~ 0.0526). Width = 1520 * 0.0526 ~ 80.
  // Divider + Subtitle
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 48" width="${width}" height="${height}">
  <!-- Left Emblem (Oxblood) -->
  <g transform="translate(8, 6) scale(0.0356)">
    <path d="${EMBLEM_D}" fill="${COLORS.oxblood}" fill-rule="evenodd" />
  </g>

  <!-- Wordmark "Clio" (Ink) -->
  <g transform="translate(56, 8) scale(0.0526)">
    <path d="${WORDMARK_D}" fill="${COLORS.ink}" fill-rule="evenodd" />
  </g>

  <!-- Fine Vertical Divider -->
  <line x1="148" y1="12" x2="148" y2="36" stroke="${COLORS.ink}" stroke-opacity="0.18" stroke-width="1"/>

  <!-- Subtitle Text -->
  <g transform="translate(160, 18) scale(0.125)">
    <path d="${ACADEMIC_ARCHIVE_D}" fill="${COLORS.oxblood}" fill-rule="evenodd" />
  </g>
</svg>`;
}

/**
 * Creates multi-resolution ICO containing 16x16, 32x32, 48x48 PNGs
 */
async function createMultiResIco(svgBuffer, sizes = [16, 32, 48]) {
  const images = [];
  for (const size of sizes) {
    const pngBuf = await sharp(svgBuffer).resize(size, size).png().toBuffer();
    images.push({ size, buffer: pngBuf });
  }

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const dirEntries = [];

  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.size === 256 ? 0 : img.size, 0);
    entry.writeUInt8(img.size === 256 ? 0 : img.size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(img.buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    dirEntries.push(entry);
    offset += img.buffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...images.map(img => img.buffer)]);
}

async function main() {
  console.log('Generating authentic Clio brand assets, logos, and favicons from uploaded master...');

  const publicDir = path.resolve('public');
  const publicImagesDir = path.resolve('public/images');
  const srcAppDir = path.resolve('src/app');
  const scratchDir = 'C:/Users/jackr/.gemini/antigravity/brain/5f4e42a4-9daf-4db3-a382-3b7de3944625/scratch';

  // 1. Build SVGs
  const emblemTransparentSvg = createEmblemSvg({ width: 512, height: 512, includeBackground: false });
  const emblemPaperSvg = createEmblemSvg({ width: 512, height: 512, includeBackground: true, background: COLORS.ivoryBg });
  const maskableSvg = createEmblemSvg({ width: 512, height: 512, includeBackground: true, background: COLORS.ivoryBg, scale: 0.72 });
  const stackedLogoSvg = createStackedLogoSvg({ width: 1024, height: 576, includeBackground: true });
  const horizontalLogoSvg = createHorizontalLogoSvg({ width: 360, height: 48 });

  // 2. Write SVGs to public & src/app
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), emblemTransparentSvg);
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), emblemTransparentSvg);
  fs.writeFileSync(path.join(srcAppDir, 'icon.svg'), emblemTransparentSvg);

  fs.writeFileSync(path.join(publicImagesDir, 'clio-emblem.svg'), emblemTransparentSvg);
  fs.writeFileSync(path.join(publicImagesDir, 'clio-emblem-maskable.svg'), maskableSvg);
  fs.writeFileSync(path.join(publicImagesDir, 'clio-logo-stacked.svg'), stackedLogoSvg);
  fs.writeFileSync(path.join(publicImagesDir, 'clio-logo-horizontal.svg'), horizontalLogoSvg);

  // 3. Render PNGs using Sharp
  const emblemTransparentBuffer = Buffer.from(emblemTransparentSvg);
  const emblemPaperBuffer = Buffer.from(emblemPaperSvg);
  const maskableBuffer = Buffer.from(maskableSvg);
  const stackedBuffer = Buffer.from(stackedLogoSvg);
  const horizontalBuffer = Buffer.from(horizontalLogoSvg);

  // App Icons (512x512)
  const icon512Png = await sharp(emblemTransparentBuffer).resize(512, 512).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), icon512Png);
  fs.writeFileSync(path.join(publicDir, 'icon.png'), icon512Png);
  fs.writeFileSync(path.join(srcAppDir, 'icon.png'), icon512Png);

  // App Icon 192x192
  const icon192Png = await sharp(emblemTransparentBuffer).resize(192, 192).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192Png);

  // Apple Touch Icon 180x180 (warm ivory ground for iOS home screens)
  const appleTouchPng = await sharp(emblemPaperBuffer).resize(180, 180).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouchPng);
  fs.writeFileSync(path.join(srcAppDir, 'apple-icon.png'), appleTouchPng);

  // Maskable Icons (192 and 512)
  const maskable512Png = await sharp(maskableBuffer).resize(512, 512).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'icon-maskable-512.png'), maskable512Png);
  const maskable192Png = await sharp(maskableBuffer).resize(192, 192).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'icon-maskable-192.png'), maskable192Png);

  // Favicon.ico multi-resolution
  const icoBuffer = await createMultiResIco(emblemTransparentBuffer, [16, 32, 48]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(srcAppDir, 'favicon.ico'), icoBuffer);

  // Stacked Logo PNG
  await sharp(stackedBuffer).resize(1024, 576).png().toFile(path.join(publicImagesDir, 'clio-logo-stacked.png'));

  // Horizontal Logo PNG
  await sharp(horizontalBuffer).resize(720, 96).png().toFile(path.join(publicImagesDir, 'clio-logo-horizontal.png'));

  // Save review proofs in scratch if available
  if (fs.existsSync(scratchDir)) {
    await sharp(stackedBuffer).resize(1024, 576).png().toFile(path.join(scratchDir, 'clio_official_brand_preview.png'));
    await sharp(icon512Png).resize(512, 512).png().toFile(path.join(scratchDir, 'clio_favicon_512.png'));
    await sharp(emblemTransparentBuffer).resize(32, 32).resize(256, 256, { kernel: 'nearest' }).png().toFile(path.join(scratchDir, 'clio_favicon_32x32_magnified.png'));
  }

  console.log('Successfully generated all authentic brand assets!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
