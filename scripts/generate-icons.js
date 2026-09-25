import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// CRC32 table & calculation
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const body = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(body);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, body, crcBuf]);
}

function generatePng(width, height, isMaskable = false) {
  // Signature
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth 8
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  const ihdr = createChunk('IHDR', ihdrData);

  // Scanlines with filter byte 0
  const rowStride = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowStride);

  // Colors:
  // Background: Deep Navy #0f172a (15, 23, 42)
  // Accent Gold: #f59e0b (245, 158, 11)
  // Table White: #f8fafc (248, 250, 252)
  // Cap Indigo: #3b82f6 (59, 130, 246)

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * (isMaskable ? 0.48 : 0.42);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowStride;
    rawData[rowOffset] = 0; // Filter 0

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Default background: Slate-900 / Navy
      let r = 15, g = 23, b = 42, a = 255;

      // Inner rounded badge / shield
      if (dist < radius) {
        // Gradient badge
        const t = (y / height);
        r = Math.round(30 + t * 10);
        g = Math.round(41 + t * 15);
        b = Math.round(59 + t * 20);

        // Academic graduation cap shape (top half)
        // Diamond cap top
        const capY = cy - height * 0.12;
        const capDx = Math.abs(x - cx);
        const capDy = Math.abs(y - capY);
        const capW = width * 0.28;
        const capH = height * 0.14;

        if (capDx / capW + capDy / capH <= 1.0 && y <= capY + capH) {
          // Cap diamond in vibrant Amber Gold #f59e0b
          r = 245; g = 158; b = 11;
        }

        // Mortarboard skull cap (underneath diamond)
        if (x >= cx - width * 0.14 && x <= cx + width * 0.14 && y >= capY + height * 0.04 && y <= capY + height * 0.14) {
          r = 217; g = 119; b = 6;
        }

        // Marksheet table icon (bottom half)
        const sheetTop = cy + height * 0.05;
        const sheetBottom = cy + height * 0.35;
        const sheetLeft = cx - width * 0.26;
        const sheetRight = cx + width * 0.26;

        if (x >= sheetLeft && x <= sheetRight && y >= sheetTop && y <= sheetBottom) {
          // Sheet background: white/slate-100
          r = 248; g = 250; b = 252;

          // Header row of sheet (Blue #2563eb)
          if (y <= sheetTop + height * 0.07) {
            r = 37; g = 99; b = 235;
          } else {
            // Grid lines on marksheet
            const rowH = (sheetBottom - (sheetTop + height * 0.07)) / 3;
            const inGridY = (y - (sheetTop + height * 0.07)) % rowH;
            const inGridX = (x - sheetLeft) % ((sheetRight - sheetLeft) / 3);

            if (inGridY < 2 || inGridX < 2) {
              r = 203; g = 213; b = 225; // Grid borders
            } else {
              // Highlight roll number / grade check
              if (x < sheetLeft + (sheetRight - sheetLeft) / 3 && inGridY > 4 && inGridY < rowH - 4) {
                r = 245; g = 158; b = 11; // Amber roll indicator
              } else if (inGridY > 5 && inGridY < rowH - 5) {
                r = 100; g = 116; b = 139; // Row text representation
              }
            }
          }
        }

        // Tassel on cap
        if (x >= cx + width * 0.22 && x <= cx + width * 0.25 && y >= capY && y <= capY + height * 0.18) {
          r = 253; g = 224; b = 71; // Yellow gold tassel
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData, { level: 9 });
  const idat = createChunk('IDAT', deflated);
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate PWA icons
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generatePng(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generatePng(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generatePng(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generatePng(180, 180, false));

console.log('Successfully generated all PWA icons in /public!');
