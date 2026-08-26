// Gera os icones originais do MyFitTrack (sem dependencias externas).
// A marca combina um haltere com uma linha de progressao ascendente.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '..', 'public');
const iconsDir = resolve(publicDir, 'icons');
mkdirSync(iconsDir, { recursive: true });

const BG = [13, 13, 15, 255]; // #0d0d0f
const ORANGE = [255, 122, 26, 255]; // #ff7a1a
const WHITE = [244, 244, 246, 255]; // #f4f4f6

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function draw(size, { maskable = false } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  const put = (x, y, c) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    buf[i] = c[0];
    buf[i + 1] = c[1];
    buf[i + 2] = c[2];
    buf[i + 3] = c[3];
  };
  const radius = maskable ? size : size * 0.22;
  const inCorner = (x, y) => {
    const r = radius;
    const cx = Math.min(Math.max(x, r), size - r);
    const cy = Math.min(Math.max(y, r), size - r);
    return Math.hypot(x - cx, y - cy) <= r;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      put(x, y, inCorner(x, y) ? BG : [0, 0, 0, 0]);
    }
  }
  // Haltere na base.
  const cy = size * 0.66;
  const barH = size * 0.1;
  const barX0 = size * 0.22;
  const barX1 = size * 0.77;
  const plateW = size * 0.09;
  const plateH = size * 0.28;
  const rect = (x0, y0, x1, y1, c) => {
    for (let y = Math.floor(y0); y < y1; y++)
      for (let x = Math.floor(x0); x < x1; x++) put(x, y, c);
  };
  rect(barX0, cy - barH / 2, barX1, cy + barH / 2, WHITE);
  rect(barX0 - plateW, cy - plateH / 2, barX0, cy + plateH / 2, WHITE);
  rect(barX1, cy - plateH / 2, barX1 + plateW, cy + plateH / 2, WHITE);

  // Linha ascendente: segmentos espessos com pontas arredondadas aproximadas.
  const line = (x0, y0, x1, y1, width, color) => {
    const minX = Math.floor(Math.min(x0, x1) - width);
    const maxX = Math.ceil(Math.max(x0, x1) + width);
    const minY = Math.floor(Math.min(y0, y1) - width);
    const maxY = Math.ceil(Math.max(y0, y1) + width);
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len2 = dx * dx + dy * dy || 1;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / len2));
      if (Math.hypot(x - (x0 + t * dx), y - (y0 + t * dy)) <= width / 2) put(x, y, color);
    }
  };
  const w = size * 0.065;
  line(size * .25, size * .48, size * .42, size * .31, w, ORANGE);
  line(size * .42, size * .31, size * .56, size * .41, w, ORANGE);
  line(size * .56, size * .41, size * .77, size * .19, w, ORANGE);
  line(size * .66, size * .19, size * .77, size * .19, w * .75, ORANGE);
  line(size * .77, size * .19, size * .77, size * .3, w * .75, ORANGE);
  return encodePng(size, size, buf);
}

writeFileSync(resolve(iconsDir, 'icon-192.png'), draw(192));
writeFileSync(resolve(iconsDir, 'icon-512.png'), draw(512));
writeFileSync(resolve(iconsDir, 'icon-maskable-512.png'), draw(512, { maskable: true }));
writeFileSync(resolve(publicDir, 'apple-touch-icon.png'), draw(180, { maskable: true }));

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="MyFitTrack">
  <rect width="64" height="64" rx="14" fill="#0d0d0f"/>
  <g fill="#f4f4f6">
    <rect x="10" y="34" width="6" height="18" rx="3"/>
    <rect x="16" y="38" width="31" height="10" rx="4"/>
    <rect x="47" y="34" width="7" height="18" rx="3"/>
  </g>
  <path d="M17 32 27 22l9 7 13-15" fill="none" stroke="#ff7a1a" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="m41 14 9-1-1 9" fill="none" stroke="#ff7a1a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
writeFileSync(resolve(publicDir, 'favicon.svg'), favicon);

console.log('Icons generated in', iconsDir);
