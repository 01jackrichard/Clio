import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const COLORS = {
  burgundy: '#7A1F1D',       // Primary deep burgundy / oxblood
  burgundyDeep: '#581514',   // Deep classical shadow
  burgundyLight: '#8E2522',  // Highlight
  ivory: '#F4EFEB',          // Warm ivory / paper ground
  ivoryLight: '#FAF7F2',     // Bright ivory
  ink: '#121110',            // Primary black ink for serif typography
  ash: '#736B63',            // Muted secondary text
};

/**
 * Generates the classical "C" emblem with integrated column and diamond.
 * Built with classical Roman letterform geometry and architectural column details.
 */
function createEmblemSvg({
  width = 512,
  height = 512,
  includeBackground = true,
  borderRadius = 108,
} = {}) {
  const bg = includeBackground
    ? `<rect width="512" height="512" rx="${borderRadius}" fill="${COLORS.ivory}"/>
       <rect x="10" y="10" width="492" height="492" rx="${borderRadius - 6}" fill="none" stroke="${COLORS.burgundy}" stroke-opacity="0.15" stroke-width="3"/>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${width}" height="${height}">
  <defs>
    <linearGradient id="burgundyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${COLORS.burgundyLight}"/>
      <stop offset="50%" stop-color="${COLORS.burgundy}"/>
      <stop offset="100%" stop-color="${COLORS.burgundyDeep}"/>
    </linearGradient>
  </defs>

  ${bg}

  <!-- Classical Architectural "C" Monogram -->
  <g transform="translate(256, 256)">
    <!-- 1. Classical Roman "C" Outer & Inner Bowl -->
    <!-- Modeled after Trajan / Centaur classical Roman capital C -->
    <path d="
      M 116 -128
      C 134 -128, 146 -114, 146 -98
      C 146 -80, 130 -66, 112 -66
      C 98 -66, 88 -76, 78 -88
      C 52 -122, 10 -144, -40 -144
      C -118 -144, -172 -88, -172 0
      C -172 88, -118 144, -40 144
      C 10 144, 52 122, 78 88
      C 88 76, 98 66, 112 66
      C 130 66, 146 80, 146 98
      C 146 114, 134 128, 116 128
      C 82 128, 54 168, -38 168
      C -138 168, -204 96, -204 0
      C -204 -96, -138 -168, -38 -168
      C 54 -168, 82 -128, 116 -128
      Z
    " fill="url(#burgundyGrad)"/>

    <!-- 2. Integrated Classical Column (fluted Roman/Greek pillar) -->
    <!-- The column stands along the inner-left axis, linking top and bottom -->
    <g id="column-group">
      <!-- Capital (Abacus & Echinus) -->
      <rect x="-140" y="-124" width="60" height="12" rx="2" fill="${COLORS.burgundy}"/>
      <path d="M -136 -112 L -126 -100 L -94 -100 L -84 -112 Z" fill="${COLORS.burgundyDeep}"/>
      <rect x="-130" y="-100" width="40" height="5" rx="1" fill="${COLORS.burgundy}"/>

      <!-- Fluted Column Shaft -->
      <!-- Background of shaft -->
      <rect x="-126" y="-95" width="32" height="190" fill="${COLORS.burgundyDeep}"/>
      <!-- Flutes (crisp vertical channels) -->
      <rect x="-124" y="-92" width="6" height="184" rx="3" fill="${COLORS.ivory}"/>
      <rect x="-114" y="-92" width="6" height="184" rx="3" fill="${COLORS.ivory}"/>
      <rect x="-104" y="-92" width="6" height="184" rx="3" fill="${COLORS.ivory}"/>

      <!-- Base (Torus, Scotia, Plinth) -->
      <rect x="-130" y="95" width="40" height="5" rx="1" fill="${COLORS.burgundy}"/>
      <path d="M -126 100 L -136 112 L -84 112 L -94 100 Z" fill="${COLORS.burgundyDeep}"/>
      <rect x="-140" y="112" width="60" height="14" rx="2" fill="${COLORS.burgundy}"/>
    </g>

    <!-- 3. Central Classical Diamond Accent (Aperture Ornament) -->
    <g transform="translate(48, 0)">
      <!-- Outer diamond -->
      <polygon points="0,-36 36,0 0,36 -36,0" fill="url(#burgundyGrad)"/>
      <!-- Inner diamond cutout -->
      <polygon points="0,-18 18,0 0,18 -18,0" fill="${COLORS.ivory}"/>
      <!-- Center jewel bead -->
      <polygon points="0,-8 8,0 0,8 -8,0" fill="${COLORS.burgundy}"/>
    </g>
  </g>
</svg>`;
}

/**
 * Maskable PWA Icon SVG:
 * Full-bleed ivory background with no rounded corners,
 * emblem scaled to 0.72 so that all graphics sit securely inside the 80% safe zone.
 */
function createMaskableEmblemSvg({ width = 512, height = 512, scale = 0.72 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${width}" height="${height}">
  <defs>
    <linearGradient id="burgundyGradMaskable" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${COLORS.burgundyLight}"/>
      <stop offset="50%" stop-color="${COLORS.burgundy}"/>
      <stop offset="100%" stop-color="${COLORS.burgundyDeep}"/>
    </linearGradient>
  </defs>

  <rect width="512" height="512" fill="${COLORS.ivory}"/>

  <!-- Classical Architectural "C" Monogram with padding for Android safe-zone -->
  <g transform="translate(256, 256) scale(${scale})">
    <!-- Classical Roman C -->
    <path d="
      M 116 -128
      C 134 -128, 146 -114, 146 -98
      C 146 -80, 130 -66, 112 -66
      C 98 -66, 88 -76, 78 -88
      C 52 -122, 10 -144, -40 -144
      C -118 -144, -172 -88, -172 0
      C -172 88, -118 144, -40 144
      C 10 144, 52 122, 78 88
      C 88 76, 98 66, 112 66
      C 130 66, 146 80, 146 98
      C 146 114, 134 128, 116 128
      C 82 128, 54 168, -38 168
      C -138 168, -204 96, -204 0
      C -204 -96, -138 -168, -38 -168
      C 54 -168, 82 -128, 116 -128
      Z
    " fill="url(#burgundyGradMaskable)"/>

    <!-- Integrated Classical Column -->
    <g id="column-group">
      <rect x="-140" y="-124" width="60" height="12" rx="2" fill="${COLORS.burgundy}"/>
      <path d="M -136 -112 L -126 -100 L -94 -100 L -84 -112 Z" fill="${COLORS.burgundyDeep}"/>
      <rect x="-130" y="-100" width="40" height="5" rx="1" fill="${COLORS.burgundy}"/>

      <rect x="-126" y="-95" width="32" height="190" fill="${COLORS.burgundyDeep}"/>
      <rect x="-124" y="-92" width="6" height="184" rx="3" fill="${COLORS.ivory}"/>
      <rect x="-114" y="-92" width="6" height="184" rx="3" fill="${COLORS.ivory}"/>
      <rect x="-104" y="-92" width="6" height="184" rx="3" fill="${COLORS.ivory}"/>

      <rect x="-130" y="95" width="40" height="5" rx="1" fill="${COLORS.burgundy}"/>
      <path d="M -126 100 L -136 112 L -84 112 L -94 100 Z" fill="${COLORS.burgundyDeep}"/>
      <rect x="-140" y="112" width="60" height="14" rx="2" fill="${COLORS.burgundy}"/>
    </g>

    <!-- Central Classical Diamond Accent -->
    <g transform="translate(48, 0)">
      <polygon points="0,-36 36,0 0,36 -36,0" fill="url(#burgundyGradMaskable)"/>
      <polygon points="0,-18 18,0 0,18 -18,0" fill="${COLORS.ivory}"/>
      <polygon points="0,-8 8,0 0,8 -8,0" fill="${COLORS.burgundy}"/>
    </g>
  </g>
</svg>`;
}

/**
 * Full Stacked Logo SVG:
 * 1. Classical C emblem at the top
 * 2. Elegant black serif "Clio" wordmark
 * 3. Fine burgundy divider with central diamond ornament: ——— ◆ ———
 * 4. Widely spaced "ACADEMIC ARCHIVE" subtitle
 */
function createFullStackedLogoSvg({ width = 800, height = 900 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 900" width="${width}" height="${height}">
  <defs>
    <linearGradient id="fullBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FAF7F2"/>
      <stop offset="100%" stop-color="#F2EFE9"/>
    </linearGradient>
    <linearGradient id="burgundyGradStacked" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${COLORS.burgundyLight}"/>
      <stop offset="50%" stop-color="${COLORS.burgundy}"/>
      <stop offset="100%" stop-color="${COLORS.burgundyDeep}"/>
    </linearGradient>
  </defs>

  <!-- Warm Ivory Ground -->
  <rect width="800" height="900" fill="url(#fullBg)"/>

  <!-- Classical Archival Framing Borders -->
  <rect x="28" y="28" width="744" height="844" fill="none" stroke="${COLORS.burgundy}" stroke-width="1.5" stroke-opacity="0.35"/>
  <rect x="36" y="36" width="728" height="828" fill="none" stroke="${COLORS.burgundy}" stroke-width="0.75" stroke-opacity="0.2"/>

  <!-- Centered Content Stack -->
  <g transform="translate(400, 0)">
    <!-- 1. Emblem (scaled proportionally) -->
    <g transform="translate(0, 235) scale(0.72)">
      <!-- Classical Roman C Outer & Inner Bowl -->
      <path d="
        M 116 -128
        C 134 -128, 146 -114, 146 -98
        C 146 -80, 130 -66, 112 -66
        C 98 -66, 88 -76, 78 -88
        C 52 -122, 10 -144, -40 -144
        C -118 -144, -172 -88, -172 0
        C -172 88, -118 144, -40 144
        C 10 144, 52 122, 78 88
        C 88 76, 98 66, 112 66
        C 130 66, 146 80, 146 98
        C 146 114, 134 128, 116 128
        C 82 128, 54 168, -38 168
        C -138 168, -204 96, -204 0
        C -204 -96, -138 -168, -38 -168
        C 54 -168, 82 -128, 116 -128
        Z
      " fill="url(#burgundyGradStacked)"/>

      <!-- Integrated Classical Column -->
      <g>
        <rect x="-140" y="-124" width="60" height="12" rx="2" fill="${COLORS.burgundy}"/>
        <path d="M -136 -112 L -126 -100 L -94 -100 L -84 -112 Z" fill="${COLORS.burgundyDeep}"/>
        <rect x="-130" y="-100" width="40" height="5" rx="1" fill="${COLORS.burgundy}"/>

        <rect x="-126" y="-95" width="32" height="190" fill="${COLORS.burgundyDeep}"/>
        <rect x="-124" y="-92" width="6" height="184" rx="3" fill="#FAF7F2"/>
        <rect x="-114" y="-92" width="6" height="184" rx="3" fill="#FAF7F2"/>
        <rect x="-104" y="-92" width="6" height="184" rx="3" fill="#FAF7F2"/>

        <rect x="-130" y="95" width="40" height="5" rx="1" fill="${COLORS.burgundy}"/>
        <path d="M -126 100 L -136 112 L -84 112 L -94 100 Z" fill="${COLORS.burgundyDeep}"/>
        <rect x="-140" y="112" width="60" height="14" rx="2" fill="${COLORS.burgundy}"/>
      </g>

      <!-- Central Diamond -->
      <g transform="translate(48, 0)">
        <polygon points="0,-36 36,0 0,36 -36,0" fill="url(#burgundyGradStacked)"/>
        <polygon points="0,-18 18,0 0,18 -18,0" fill="#FAF7F2"/>
        <polygon points="0,-8 8,0 0,8 -8,0" fill="${COLORS.burgundy}"/>
      </g>
    </g>

    <!-- 2. "Clio" Elegant Serif Wordmark -->
    <text x="0" y="505" text-anchor="middle" font-family="'Fraunces', 'Cinzel', 'Playfair Display', Georgia, serif" font-size="116" font-weight="500" fill="${COLORS.ink}" letter-spacing="0.03em">Clio</text>

    <!-- 3. Fine Burgundy Divider with Central Diamond Ornament -->
    <g transform="translate(0, 575)">
      <!-- Left hairline rule -->
      <line x1="-240" y1="0" x2="-26" y2="0" stroke="${COLORS.burgundy}" stroke-width="1.25" stroke-opacity="0.85"/>
      <!-- Center diamond ornament -->
      <polygon points="0,-8 8,0 0,8 -8,0" fill="${COLORS.burgundy}"/>
      <circle cx="0" cy="0" r="2" fill="${COLORS.ivory}"/>
      <!-- Flanking small dots -->
      <circle cx="-16" cy="0" r="1.5" fill="${COLORS.burgundy}"/>
      <circle cx="16" cy="0" r="1.5" fill="${COLORS.burgundy}"/>
      <!-- Right hairline rule -->
      <line x1="26" y1="0" x2="240" y2="0" stroke="${COLORS.burgundy}" stroke-width="1.25" stroke-opacity="0.85"/>
    </g>

    <!-- 4. Widely Spaced "ACADEMIC ARCHIVE" Subtitle -->
    <text x="0" y="635" text-anchor="middle" font-family="'Inter Tight', -apple-system, sans-serif" font-size="20" font-weight="600" fill="${COLORS.burgundy}" letter-spacing="0.32em">ACADEMIC ARCHIVE</text>
    
    <!-- 5. Tagline in clean italic serif -->
    <text x="0" y="695" text-anchor="middle" font-family="'Fraunces', Georgia, serif" font-size="16" font-style="italic" fill="${COLORS.ash}" letter-spacing="0.08em">Knowledge, preserved.</text>
  </g>
</svg>`;
}

/**
 * Compact Horizontal Navbar Brand SVG
 */
function createNavbarLogoSvg({ width = 340, height = 48 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 48" width="${width}" height="${height}">
  <!-- Compact C Emblem (32x32 bounding box) -->
  <g transform="translate(24, 24) scale(0.098)">
    <path d="
      M 116 -128
      C 134 -128, 146 -114, 146 -98
      C 146 -80, 130 -66, 112 -66
      C 98 -66, 88 -76, 78 -88
      C 52 -122, 10 -144, -40 -144
      C -118 -144, -172 -88, -172 0
      C -172 88, -118 144, -40 144
      C 10 144, 52 122, 78 88
      C 88 76, 98 66, 112 66
      C 130 66, 146 80, 146 98
      C 146 114, 134 128, 116 128
      C 82 128, 54 168, -38 168
      C -138 168, -204 96, -204 0
      C -204 -96, -138 -168, -38 -168
      C 54 -168, 82 -128, 116 -128
      Z
    " fill="${COLORS.burgundy}"/>
    <!-- Column -->
    <rect x="-140" y="-124" width="60" height="12" rx="2" fill="${COLORS.burgundy}"/>
    <rect x="-126" y="-95" width="32" height="190" fill="${COLORS.burgundy}"/>
    <rect x="-140" y="112" width="60" height="14" rx="2" fill="${COLORS.burgundy}"/>
    <!-- Diamond -->
    <polygon points="48,-28 76,0 48,28 20,0" fill="${COLORS.burgundy}"/>
  </g>

  <!-- Wordmark -->
  <text x="54" y="32" font-family="'Fraunces', Georgia, serif" font-size="26" font-weight="500" fill="${COLORS.ink}" letter-spacing="0.02em">Clio</text>

  <!-- Fine Vertical Divider -->
  <line x1="116" y1="14" x2="116" y2="34" stroke="${COLORS.ink}" stroke-opacity="0.18" stroke-width="1"/>

  <!-- Subtitle -->
  <text x="128" y="29" font-family="'Inter Tight', -apple-system, sans-serif" font-size="9.5" font-weight="600" fill="${COLORS.burgundy}" letter-spacing="0.22em">ACADEMIC ARCHIVE</text>
</svg>`;
}

/**
 * Creates a valid multi-resolution Windows ICO file containing PNGs at specified sizes
 * (16x16, 32x32, 48x48)
 */
async function createMultiResIco(svgBuffer, sizes = [16, 32, 48]) {
  const images = [];
  for (const size of sizes) {
    const pngBuf = await sharp(svgBuffer).resize(size, size).png().toBuffer();
    images.push({ size, buffer: pngBuf });
  }

  // ICO header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(images.length, 4); // count of images

  let offset = 6 + images.length * 16;
  const dirEntries = [];

  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.size === 256 ? 0 : img.size, 0); // width
    entry.writeUInt8(img.size === 256 ? 0 : img.size, 1); // height
    entry.writeUInt8(0, 2); // color count (0 if >=8bpp)
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8); // size of image in bytes
    entry.writeUInt32LE(offset, 12); // offset of image data
    dirEntries.push(entry);
    offset += img.buffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...images.map(img => img.buffer)]);
}

async function main() {
  console.log('Generating Clio Official Brand Assets & Favicons...');

  const emblemSvg = createEmblemSvg({ width: 512, height: 512, includeBackground: true });
  const stackedLogoSvg = createFullStackedLogoSvg({ width: 800, height: 900 });
  const navbarLogoSvg = createNavbarLogoSvg({ width: 340, height: 48 });

  // 1. Output directories
  const publicImagesDir = path.resolve('public/images');
  const publicDir = path.resolve('public');
  const srcAppDir = path.resolve('src/app');
  const scratchDir = 'C:/Users/jackr/.gemini/antigravity/brain/5f4e42a4-9daf-4db3-a382-3b7de3944625/scratch';

  [publicImagesDir, scratchDir].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  // 2. Save vector SVG files
  fs.writeFileSync(path.join(publicImagesDir, 'clio-emblem.svg'), emblemSvg);
  fs.writeFileSync(path.join(publicImagesDir, 'clio-logo-stacked.svg'), stackedLogoSvg);
  fs.writeFileSync(path.join(publicImagesDir, 'clio-logo-horizontal.svg'), navbarLogoSvg);

  // 3. Render High-Res PNGs
  const emblemBuffer = Buffer.from(emblemSvg);
  const stackedBuffer = Buffer.from(stackedLogoSvg);

  // App Icon 512x512
  const icon512Png = await sharp(emblemBuffer).resize(512, 512).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), icon512Png);
  fs.writeFileSync(path.join(publicDir, 'icon.png'), icon512Png);
  fs.writeFileSync(path.join(srcAppDir, 'icon.png'), icon512Png);

  // App Icon 192x192
  const icon192Png = await sharp(emblemBuffer).resize(192, 192).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192Png);

  // Maskable App Icons with Safe-Zone Padding (512x512 and 192x192)
  const maskableSvg = createMaskableEmblemSvg({ width: 512, height: 512, scale: 0.72 });
  const maskableBuffer = Buffer.from(maskableSvg);
  const maskable512Png = await sharp(maskableBuffer).resize(512, 512).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'icon-maskable-512.png'), maskable512Png);
  const maskable192Png = await sharp(maskableBuffer).resize(192, 192).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'icon-maskable-192.png'), maskable192Png);
  fs.writeFileSync(path.join(publicImagesDir, 'clio-emblem-maskable.svg'), maskableSvg);

  // Apple Touch Icon 180x180
  const appleIconPng = await sharp(emblemBuffer).resize(180, 180).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIconPng);
  fs.writeFileSync(path.join(srcAppDir, 'apple-icon.png'), appleIconPng);

  // Scalable SVG icons for browsers supporting SVG favicons
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), emblemSvg);
  fs.writeFileSync(path.join(srcAppDir, 'icon.svg'), emblemSvg);
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), emblemSvg);

  // 4. Generate Multi-Resolution ICO (16x16, 32x32, 48x48)
  const icoBuffer = await createMultiResIco(emblemBuffer, [16, 32, 48]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(srcAppDir, 'favicon.ico'), icoBuffer);

  // 5. Render Stacked and Horizontal preview PNGs
  await sharp(stackedBuffer).resize(800, 900).png().toFile(path.join(publicImagesDir, 'clio-logo-stacked.png'));
  await sharp(Buffer.from(navbarLogoSvg)).resize(680, 96).png().toFile(path.join(publicImagesDir, 'clio-logo-horizontal.png'));

  // 6. Save visual proof previews in scratch
  await sharp(stackedBuffer).resize(800, 900).png().toFile(path.join(scratchDir, 'clio_official_brand_preview.png'));
  await sharp(emblemBuffer).resize(512, 512).png().toFile(path.join(scratchDir, 'clio_favicon_preview.png'));

  // 7. Render 32x32 and 16x16 previews magnified for scrutiny
  await sharp(emblemBuffer).resize(32, 32).resize(256, 256, { kernel: 'nearest' }).png().toFile(path.join(scratchDir, 'clio_favicon_32x32_magnified.png'));

  console.log('Successfully generated all brand assets, multi-res favicons, and vector logos!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
