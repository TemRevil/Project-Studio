import fs from 'fs';
import path from 'path';

const PALETTE = {
  navy: [0.086, 0.259, 0.357], // #16425b (Primary Dark / Strokes)
  sky: [0.506, 0.765, 0.843],  // #81c3d7 (The ONE Accent)
  red: [0.929, 0.11, 0.141],   // #ed1c24 (Emphasis)
  smoke: [0.906, 0.906, 0.906],// #e7e7e7 (Canvas / Backgrounds)
  mauve: [0.835, 0.773, 0.784] // #d5c5c8 (Secondary / Details)
};

/**
 * Intelligent color selection based on the role and original values.
 */
function getNewColor(r: number, g: number, b: number, name: string = ''): number[] {
  const n = name.toLowerCase();
  const brightness = (r + g + b) / 3;

  // 1. Explicit Role Detection by Name
  if (n.includes('accent') || n.includes('teal') || n.includes('highlight') || n.includes('sky')) return PALETTE.sky;
  if (n.includes('primary') || n.includes('main') || n.includes('stroke') || n.includes('outline')) return PALETTE.navy;
  if (n.includes('secondary') || n.includes('detail') || n.includes('side') || n.includes('mauve') || n.includes('border')) return PALETTE.mauve;
  if (n.includes('bg') || n.includes('background') || n.includes('canvas') || n.includes('smoke')) return PALETTE.smoke;
  if (n.includes('red') || n.includes('error') || n.includes('alert')) return PALETTE.red;

  // 2. Heuristic Role Detection by Value
  // Very dark or Black -> Navy (Structural)
  if (brightness < 0.15) return PALETTE.navy;
  
  // Very light or White -> Smoke (Canvas)
  if (brightness > 0.92) return PALETTE.smoke;

  // Saturated Red -> Red (Emphasis)
  if (r > g * 1.8 && r > b * 1.8) return PALETTE.red;

  // Teal/Blue/Cyan -> Sky (Accent)
  if ((g > r && b > r) || (b > r && b > g * 0.8)) return PALETTE.sky;

  // Default Mid-tones -> Mauve (Secondary)
  return PALETTE.mauve;
}

function processObject(obj: any, parentName: string = '') {
  if (typeof obj !== 'object' || obj === null) return;

  const currentName = obj.nm || parentName;

  // Lottie color: "c" property with "k" array of 4 numbers [r, g, b, a]
  if (obj.c && obj.c.k) {
    // Static color
    if (Array.isArray(obj.c.k) && typeof obj.c.k[0] === 'number') {
      const [r, g, b] = obj.c.k;
      const newColor = getNewColor(r, g, b, currentName);
      obj.c.k[0] = newColor[0];
      obj.c.k[1] = newColor[1];
      obj.c.k[2] = newColor[2];
    }
    // Animated color (keyframes)
    else if (Array.isArray(obj.c.k) && typeof obj.c.k[0] === 'object') {
       obj.c.k.forEach((kf: any) => {
          if (kf.s && Array.isArray(kf.s)) {
              const [r, g, b] = kf.s;
              const nc = getNewColor(r, g, b, currentName);
              kf.s[0] = nc[0]; kf.s[1] = nc[1]; kf.s[2] = nc[2];
          }
          if (kf.e && Array.isArray(kf.e)) {
              const [r, g, b] = kf.e;
              const nc = getNewColor(r, g, b, currentName);
              kf.e[0] = nc[0]; kf.e[1] = nc[1]; kf.e[2] = nc[2];
          }
       });
    }
  }

  // Recurse into all properties
  for (const key in obj) {
    if (key === 'nm') continue; // Don't process name as an object
    processObject(obj[key], currentName);
  }
}

function walkDir(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (file.endsWith('.json') && !file.includes('package-lock')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const data = JSON.parse(content);
        processObject(data);
        fs.writeFileSync(fullPath, JSON.stringify(data));
        console.log(`✅ Processed: ${file}`);
      } catch (e) {
        console.error(`❌ Failed: ${file}`, e);
      }
    }
  }
}

const target = path.join(process.cwd(), 'attachments', 'lottie');
console.log(`🎨 Starting Intelligent Recoloring in ${target}...`);
walkDir(target);
console.log('✨ All Lottie files recolored with design-aware hierarchy.');
