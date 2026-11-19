// Generates placeholder PWA / home-screen icons into public/ with no external tools.
// A felt-green square with a white playing card showing a red heart.
// Usage: node scripts/make-icons.mjs
import { writeFileSync, mkdirSync } from 'fs';
import { deflateSync } from 'zlib';

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Card: centered rounded rectangle, portrait. Coordinates are 0..1.
const CARD = { x0: 0.27, x1: 0.73, y0: 0.17, y1: 0.83, r: 0.06 };
function inCard(x, y) {
  const { x0, x1, y0, y1, r } = CARD;
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}
// Classic implicit heart: (u² + v² − 1)³ − u² v³ ≤ 0, centered on the card.
function inHeart(x, y) {
  const s = 0.15;
  const u = (x - 0.5) / s;
  const v = -(y - 0.5) / s + 0.15;
  return (u * u + v * v - 1) ** 3 - u * u * v ** 3 <= 0;
}

const FELT_TOP = [16, 110, 70];
const FELT_BOTTOM = [6, 61, 39];

function icon(size) {
  const S = 3; // supersampling
  return png(size, (px, py) => {
    let r = 0, g = 0, b = 0;
    for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
      const x = (px + (sx + 0.5) / S) / size;
      const y = (py + (sy + 0.5) / S) / size;
      let c;
      if (inHeart(x, y)) c = [220, 38, 38];
      else if (inCard(x, y)) c = [250, 250, 245];
      else c = FELT_TOP.map((t, i) => t + (FELT_BOTTOM[i] - t) * y);
      r += c[0]; g += c[1]; b += c[2];
    }
    const n = S * S;
    return [r / n, g / n, b / n, 255].map(Math.round);
  });
}

mkdirSync('public', { recursive: true });
// Full-bleed squares: iOS and maskable launchers round the corners themselves.
writeFileSync('public/icon-192.png', icon(192));
writeFileSync('public/icon-512.png', icon(512));
writeFileSync('public/apple-touch-icon.png', icon(180));
writeFileSync(
  'public/favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#0b5d3b"/><rect x="27" y="17" width="46" height="66" rx="6" fill="#fafaf5"/><text x="50" y="62" font-size="38" text-anchor="middle" fill="#dc2626" font-family="sans-serif">&#9829;</text></svg>\n`,
);
console.log('icons written to public/');
