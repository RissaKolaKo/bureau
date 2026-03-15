import { useState, useRef, useCallback, useEffect } from 'react';
import { saveToHistory } from '../utils/storage';

/* ═══════════════════════════════════════════════════════════════
   OpenCV.js Loader
═══════════════════════════════════════════════════════════════ */
declare global { interface Window { cv: any; onOpenCvReady?: () => void; } }

function loadOpenCV(): Promise<void> {
  return new Promise(resolve => {
    if (window.cv?.Mat) { resolve(); return; }
    if (document.getElementById('opencv-script')) {
      const wait = setInterval(() => { if (window.cv?.Mat) { clearInterval(wait); resolve(); } }, 150);
      return;
    }
    const s = document.createElement('script');
    s.id = 'opencv-script'; s.async = true;
    s.src = 'https://docs.opencv.org/4.9.0/opencv.js';
    s.onload = () => {
      const wait = setInterval(() => { if (window.cv?.Mat) { clearInterval(wait); resolve(); } }, 150);
    };
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });
}

/* ═══════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════ */
interface Pt { x: number; y: number; }
type CKey = 'tl' | 'tr' | 'br' | 'bl';
interface Quad { tl: Pt; tr: Pt; br: Pt; bl: Pt; }
type FilterMode = 'color' | 'auto-enhance' | 'grayscale' | 'bw' | 'high-contrast' | 'id-mode';
type LayoutPreset = 'a5-front-back' | 'a4-2copies' | 'a4-4copies' | 'a5-front-only' | 'passport';
type PageSize = 'A4' | 'A5' | 'Letter' | 'Custom';
type Orientation = 'portrait' | 'landscape';
type ImageFit = 'contain' | 'cover';

interface ImageSizeConfig {
  widthPct: number;   // 10–100% of printable area
  keepRatio: boolean;
  fitMode: ImageFit;
}

interface PageConfig {
  size: PageSize; orientation: Orientation;
  customW: number; customH: number;
}

interface PrintConfig {
  page: PageConfig;
  margins: { top: number; bottom: number; left: number; right: number; locked: boolean; unit: 'mm' };
  fit: ImageFit;
  cropMarks: boolean;
  dpi: number;
  imageSize: ImageSizeConfig;
}

interface SideState {
  original: string | null; natW: number; natH: number;
  quad: Quad | null; warped: string | null;
  detecting: boolean; success: boolean; method: string;
}

/* ═══════════════════════════════════════════════════════════════
   LayoutCalculator — mm ↔ px conversions (300 DPI)
═══════════════════════════════════════════════════════════════ */
const PAGE_SIZES: Record<PageSize, { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  A5: { w: 148, h: 210 },
  Letter: { w: 215.9, h: 279.4 },
  Custom: { w: 210, h: 297 },
};

function mmToPx(mm: number, dpi = 300): number {
  return Math.round((mm / 25.4) * dpi);
}

function getPageDimsMm(cfg: PageConfig): { w: number; h: number } {
  const base = cfg.size === 'Custom' ? { w: cfg.customW, h: cfg.customH } : PAGE_SIZES[cfg.size];
  return cfg.orientation === 'landscape' ? { w: base.h, h: base.w } : base;
}

type MarginConfig = { top: number; bottom: number; left: number; right: number; locked: boolean; unit: 'mm' };

function getPrintableArea(dims: { w: number; h: number }, margins: MarginConfig) {
  return {
    x: margins.left, y: margins.top,
    w: dims.w - margins.left - margins.right,
    h: dims.h - margins.top - margins.bottom,
  };
}

function calcImagePlacement(imgW: number, imgH: number, areaW: number, areaH: number, fit: ImageFit) {
  const imgAR = imgW / imgH;
  const areaAR = areaW / areaH;
  let drawW: number, drawH: number, offX: number, offY: number;
  if (fit === 'contain') {
    if (imgAR > areaAR) { drawW = areaW; drawH = areaW / imgAR; }
    else { drawH = areaH; drawW = areaH * imgAR; }
  } else {
    if (imgAR > areaAR) { drawH = areaH; drawW = areaH * imgAR; }
    else { drawW = areaW; drawH = areaW / imgAR; }
  }
  offX = (areaW - drawW) / 2;
  offY = (areaH - drawH) / 2;
  return { drawW, drawH, offX, offY };
}

/* ═══════════════════════════════════════════════════════════════
   Geometry helpers
═══════════════════════════════════════════════════════════════ */
const dist = (a: Pt, b: Pt) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

function orderPoints(pts: Pt[]): Quad {
  const sorted = [...pts].sort((a, b) => (a.x + a.y) - (b.x + b.y));
  const tl = sorted[0], br = sorted[3];
  const rest = [sorted[1], sorted[2]];
  const tr = rest[0].x > rest[1].x ? rest[0] : rest[1];
  const bl = rest[0].x < rest[1].x ? rest[0] : rest[1];
  return { tl, tr, br, bl };
}

function fallbackQuad(W: number, H: number, pad = 0.04): Quad {
  const px = W * pad, py = H * pad;
  return { tl: { x: px, y: py }, tr: { x: W - px, y: py }, br: { x: W - px, y: H - py }, bl: { x: px, y: H - py } };
}

function isValidQuad(q: Quad, W: number, H: number): boolean {
  const tw = dist(q.tl, q.tr), bw = dist(q.bl, q.br);
  const lh = dist(q.tl, q.bl), rh = dist(q.tr, q.br);
  const minSize = Math.min(W, H) * 0.15;
  return tw > minSize && bw > minSize && lh > minSize && rh > minSize
    && Math.max(tw / bw, bw / tw) < 3
    && Math.max(lh / rh, rh / lh) < 3;
}

/* ═══════════════════════════════════════════════════════════════
   Perspective Transform — DLT Homography
═══════════════════════════════════════════════════════════════ */
function computeHomography(src: [number, number][], dst: [number, number][]): number[] {
  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const [xs, ys] = src[i], [xd, yd] = dst[i];
    A.push([xs, ys, 1, 0, 0, 0, -xd * xs, -xd * ys, -xd]);
    A.push([0, 0, 0, xs, ys, 1, -yd * xs, -yd * ys, -yd]);
  }
  const n = 8, m = 9;
  const M = A.map(r => [...r]);
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[maxRow][col])) maxRow = r;
    [M[col], M[maxRow]] = [M[maxRow], M[col]];
    if (Math.abs(M[col][col]) < 1e-10) continue;
    const div = M[col][col];
    for (let j = col; j < m; j++) M[col][j] /= div;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col];
      for (let j = col; j < m; j++) M[r][j] -= factor * M[col][j];
    }
  }
  const h = Array(9).fill(0); h[8] = 1;
  for (let i = 0; i < n; i++) h[i] = -M[i][m - 1];
  return h;
}

function applyHomography(h: number[], x: number, y: number): [number, number] {
  const w = h[6] * x + h[7] * y + h[8];
  return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w];
}

function perspectiveWarp(
  src: ImageData, quad: Quad, dstW: number, dstH: number,
  opts: { brightness: number; contrast: number; filter: FilterMode }
): ImageData {
  const { tl, tr, br, bl } = quad;
  const srcPts: [number, number][] = [[tl.x, tl.y], [tr.x, tr.y], [br.x, br.y], [bl.x, bl.y]];
  const dstPts: [number, number][] = [[0, 0], [dstW, 0], [dstW, dstH], [0, dstH]];
  const hInv = computeHomography(dstPts, srcPts);
  const out = new ImageData(dstW, dstH);
  const sd = src.data, dd = out.data;
  const sW = src.width, sH = src.height;
  const bF = opts.brightness / 100;
  const cF = opts.contrast / 100;
  for (let dy = 0; dy < dstH; dy++) {
    for (let dx = 0; dx < dstW; dx++) {
      const [sx, sy] = applyHomography(hInv, dx, dy);
      const fx = Math.floor(sx), fy = Math.floor(sy);
      if (fx < 0 || fy < 0 || fx >= sW - 1 || fy >= sH - 1) continue;
      const wx = sx - fx, wy = sy - fy;
      const oi = (dy * dstW + dx) * 4;
      for (let c = 0; c < 3; c++) {
        const i00 = (fy * sW + fx) * 4 + c;
        const i10 = (fy * sW + fx + 1) * 4 + c;
        const i01 = ((fy + 1) * sW + fx) * 4 + c;
        const i11 = ((fy + 1) * sW + fx + 1) * 4 + c;
        let v = sd[i00] * (1 - wx) * (1 - wy) + sd[i10] * wx * (1 - wy)
          + sd[i01] * (1 - wx) * wy + sd[i11] * wx * wy;
        v = (v / 255 - 0.5) * cF + 0.5;
        v = v * bF;
        dd[oi + c] = Math.max(0, Math.min(255, v * 255));
      }
      dd[oi + 3] = 255;
    }
  }
  if (opts.filter !== 'color') applyFilterInPlace(out, opts.filter);
  return out;
}

function applyFilterInPlace(img: ImageData, mode: FilterMode) {
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (mode === 'grayscale') { d[i] = d[i + 1] = d[i + 2] = lum; }
    else if (mode === 'bw') { const bw = lum > 145 ? 255 : 0; d[i] = d[i + 1] = d[i + 2] = bw; }
    else if (mode === 'high-contrast') { const c = Math.max(0, Math.min(255, (lum - 128) * 2.2 + 128)); d[i] = d[i + 1] = d[i + 2] = c; }
    else if (mode === 'id-mode') { const c = Math.max(0, Math.min(255, (lum - 100) * 1.9 + 100)); d[i] = d[i + 1] = d[i + 2] = c; }
    else if (mode === 'auto-enhance') { d[i] = Math.min(255, r * 1.12); d[i + 1] = Math.min(255, g * 1.06); d[i + 2] = Math.min(255, b * 1.0); }
  }
}

function unsharpMask(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const id = ctx.getImageData(0, 0, w, h);
  const d = id.data, cp = new Uint8ClampedArray(d);
  const k = [0, -0.5, 0, -0.5, 3, -0.5, 0, -0.5, 0];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) for (let c = 0; c < 3; c++) {
    let v = 0;
    for (let ky = -1; ky <= 1; ky++) for (let kx = -1; kx <= 1; kx++)
      v += cp[((y + ky) * w + (x + kx)) * 4 + c] * k[(ky + 1) * 3 + (kx + 1)];
    d[(y * w + x) * 4 + c] = Math.max(0, Math.min(255, v));
  }
  ctx.putImageData(id, 0, 0);
}

/* ═══════════════════════════════════════════════════════════════
   AUTO DETECT — 3-Strategy OpenCV Pipeline
═══════════════════════════════════════════════════════════════ */
async function detectDocumentCorners(dataUrl: string): Promise<{ quad: Quad; success: boolean; method: string }> {
  await loadOpenCV();
  const cv = window.cv;
  if (!cv?.Mat) {
    return new Promise(res => {
      const img = new Image();
      img.onload = () => res({ quad: fallbackQuad(img.naturalWidth, img.naturalHeight), success: false, method: 'no-cv' });
      img.onerror = () => res({ quad: fallbackQuad(800, 600), success: false, method: 'error' });
      img.src = dataUrl;
    });
  }

  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const W = img.naturalWidth, H = img.naturalHeight;
      const cvs = document.createElement('canvas');
      cvs.width = W; cvs.height = H;
      cvs.getContext('2d')!.drawImage(img, 0, 0);
      const mats: any[] = [];
      const T = (m: any) => { mats.push(m); return m; };
      let bestQuad: Quad | null = null;
      let bestArea = 0;
      let bestMethod = '';

      try {
        const src = T(cv.imread(cvs));
        const gray = T(new cv.Mat());
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

        // ── CLAHE Enhancement ──
        const clahe = new cv.CLAHE(2.5, new cv.Size(8, 8));
        const enhanced = T(new cv.Mat());
        clahe.apply(gray, enhanced); clahe.delete();

        // ── STRATEGY A: Multi-pass Canny ──
        const blurA = T(new cv.Mat());
        cv.GaussianBlur(enhanced, blurA, new cv.Size(5, 5), 0);
        for (const [lo, hi] of [[20, 60], [30, 90], [40, 120], [50, 150], [60, 180], [80, 240]] as [number, number][]) {
          const edges = T(new cv.Mat());
          cv.Canny(blurA, edges, lo, hi);
          // Morphological close to bridge gaps
          const kernel = T(cv.Mat.ones(5, 5, cv.CV_8U));
          const closed = T(new cv.Mat());
          cv.morphologyEx(edges, closed, cv.MORPH_CLOSE, kernel);
          const r = _findBestQuad(cv, closed, W, H);
          if (r && r.area > bestArea && r.area > W * H * 0.04) {
            bestQuad = r.quad; bestArea = r.area; bestMethod = `Canny(${lo},${hi})`;
          }
        }

        // ── STRATEGY B: Adaptive Threshold ──
        for (const [blockSz, C] of [[11, 4], [21, 6], [31, 8], [51, 10]] as [number, number][]) {
          const blurB = T(new cv.Mat());
          cv.GaussianBlur(gray, blurB, new cv.Size(7, 7), 0);
          const adapt = T(new cv.Mat());
          cv.adaptiveThreshold(blurB, adapt, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, blockSz, C);
          const kB = T(cv.Mat.ones(3, 3, cv.CV_8U));
          const dilB = T(new cv.Mat());
          cv.dilate(adapt, dilB, kB);
          const rB = _findBestQuad(cv, dilB, W, H);
          if (rB && rB.area > bestArea && rB.area > W * H * 0.04) {
            bestQuad = rB.quad; bestArea = rB.area; bestMethod = `Adaptive(${blockSz})`;
          }
        }

        // ── STRATEGY C: Otsu global threshold ──
        const blurC = T(new cv.Mat());
        cv.GaussianBlur(gray, blurC, new cv.Size(9, 9), 0);
        const otsu = T(new cv.Mat());
        cv.threshold(blurC, otsu, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);
        const kC = T(cv.Mat.ones(5, 5, cv.CV_8U));
        const clC = T(new cv.Mat());
        cv.morphologyEx(otsu, clC, cv.MORPH_CLOSE, kC);
        const rC = _findBestQuad(cv, clC, W, H);
        if (rC && rC.area > bestArea && rC.area > W * H * 0.04) {
          bestQuad = rC.quad; bestArea = rC.area; bestMethod = 'Otsu';
        }

        // ── STRATEGY D: Sobel gradient ──
        const sobelX = T(new cv.Mat()), sobelY = T(new cv.Mat()), sobel = T(new cv.Mat());
        cv.Sobel(enhanced, sobelX, cv.CV_8U, 1, 0, 3);
        cv.Sobel(enhanced, sobelY, cv.CV_8U, 0, 1, 3);
        cv.add(sobelX, sobelY, sobel);
        const kD = T(cv.Mat.ones(5, 5, cv.CV_8U));
        const clD = T(new cv.Mat());
        cv.morphologyEx(sobel, clD, cv.MORPH_CLOSE, kD);
        const rD = _findBestQuad(cv, clD, W, H);
        if (rD && rD.area > bestArea && rD.area > W * H * 0.04) {
          bestQuad = rD.quad; bestArea = rD.area; bestMethod = 'Sobel';
        }

        const success = !!bestQuad && isValidQuad(bestQuad, W, H);
        if (!bestQuad || !isValidQuad(bestQuad, W, H)) {
          bestQuad = fallbackQuad(W, H);
          resolve({ quad: bestQuad, success: false, method: bestMethod || 'fallback' });
        } else {
          resolve({ quad: bestQuad, success, method: bestMethod });
        }
      } catch (e) {
        console.error('OpenCV error:', e);
        resolve({ quad: fallbackQuad(W, H), success: false, method: 'error' });
      } finally {
        mats.forEach(m => { try { m.delete(); } catch {} });
      }
    };
    img.onerror = () => resolve({ quad: fallbackQuad(800, 600), success: false, method: 'img-error' });
    img.src = dataUrl;
  });
}

function _findBestQuad(cv: any, binary: any, W: number, H: number): { quad: Quad; area: number } | null {
  const contours = new cv.MatVector(), hier = new cv.Mat();
  let result: { quad: Quad; area: number } | null = null;
  try {
    cv.findContours(binary, contours, hier, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i);
      const area = cv.contourArea(cnt);
      if (area < W * H * 0.03) { cnt.delete(); continue; }
      const peri = cv.arcLength(cnt, true);

      // Try approxPolyDP with multiple epsilon values
      let found = false;
      for (const eps of [0.015, 0.02, 0.03, 0.04, 0.05, 0.06, 0.08, 0.10]) {
        const approx = new cv.Mat();
        cv.approxPolyDP(cnt, approx, eps * peri, true);
        if (approx.rows === 4) {
          const pts: Pt[] = [];
          for (let r = 0; r < 4; r++) pts.push({ x: approx.data32S[r * 2], y: approx.data32S[r * 2 + 1] });
          const q = orderPoints(pts);
          if (isValidQuad(q, W, H) && area > (result?.area ?? 0)) result = { quad: q, area };
          found = true; approx.delete(); break;
        }
        approx.delete();
      }

      // Try convex hull if direct approx fails
      if (!found) {
        const hull = new cv.Mat();
        cv.convexHull(cnt, hull, false, true);
        const hPeri = cv.arcLength(hull, true);
        for (const eps of [0.02, 0.04, 0.06, 0.08]) {
          const hApp = new cv.Mat();
          cv.approxPolyDP(hull, hApp, eps * hPeri, true);
          if (hApp.rows === 4) {
            const pts: Pt[] = [];
            for (let r = 0; r < 4; r++) pts.push({ x: hApp.data32S[r * 2], y: hApp.data32S[r * 2 + 1] });
            const q = orderPoints(pts);
            if (isValidQuad(q, W, H) && area > (result?.area ?? 0)) result = { quad: q, area };
            hApp.delete(); break;
          }
          hApp.delete();
        }
        hull.delete();
      }
      cnt.delete();
    }
  } catch {} finally { try { contours.delete(); hier.delete(); } catch {} }
  return result;
}

/* ═══════════════════════════════════════════════════════════════
   Apply warp to canvas
═══════════════════════════════════════════════════════════════ */
async function applyWarpToImage(
  dataUrl: string, quad: Quad,
  opts: { brightness: number; contrast: number; filter: FilterMode }
): Promise<string> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const { tl, tr, br, bl } = quad;
      const dstW = Math.round(Math.max(dist(tl, tr), dist(bl, br)));
      const dstH = Math.round(Math.max(dist(tl, bl), dist(tr, br)));
      if (dstW < 10 || dstH < 10) { resolve(dataUrl); return; }
      const srcCvs = document.createElement('canvas');
      srcCvs.width = img.naturalWidth; srcCvs.height = img.naturalHeight;
      srcCvs.getContext('2d')!.drawImage(img, 0, 0);
      const srcData = srcCvs.getContext('2d')!.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
      const dstData = perspectiveWarp(srcData, quad, dstW, dstH, opts);
      const outCvs = document.createElement('canvas');
      outCvs.width = dstW; outCvs.height = dstH;
      const outCtx = outCvs.getContext('2d')!;
      outCtx.putImageData(dstData, 0, 0);
      unsharpMask(outCtx, dstW, dstH);
      resolve(outCvs.toDataURL('image/jpeg', 0.96));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/* ═══════════════════════════════════════════════════════════════
   InteractiveCropCanvas — 4 draggable handles + selection mode
═══════════════════════════════════════════════════════════════ */
interface CropCanvasProps {
  imageUrl: string; natW: number; natH: number;
  quad: Quad; onQuadChange: (q: Quad) => void;
  selMode: boolean; onSelRect: (q: Quad) => void;
}

function CropCanvas({ imageUrl, natW, natH, quad, onQuadChange, selMode, onSelRect }: CropCanvasProps) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const localQ = useRef<Quad>(quad);
  const dragging = useRef<CKey | null>(null);
  const selStart = useRef<Pt | null>(null);
  const selEnd = useRef<Pt | null>(null);
  const animRef = useRef<number>(0);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const HANDLE = 14;

  useEffect(() => {
    const im = new Image();
    im.onload = () => { imgRef.current = im; redraw(); };
    im.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => { localQ.current = quad; redraw(); }, [quad]);

  const redraw = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(draw);
  }, []);

  function draw() {
    const cv = cvRef.current, im = imgRef.current;
    if (!cv || !im) return;
    const ctx = cv.getContext('2d')!;
    const dW = cv.width, dH = cv.height;
    const scX = dW / natW, scY = dH / natH;

    ctx.clearRect(0, 0, dW, dH);
    ctx.drawImage(im, 0, 0, dW, dH);

    // ── Selection rectangle mode ──
    if (selMode && selStart.current && selEnd.current) {
      const s = selStart.current, e = selEnd.current;
      const rx = Math.min(s.x, e.x), ry = Math.min(s.y, e.y);
      const rw = Math.abs(e.x - s.x), rh = Math.abs(e.y - s.y);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, dW, dH);
      ctx.clearRect(rx, ry, rw, rh);
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2.5; ctx.setLineDash([8, 4]);
      ctx.strokeRect(rx, ry, rw, rh); ctx.setLineDash([]);
      // Corner markers
      [[rx, ry], [rx + rw, ry], [rx + rw, ry + rh], [rx, ry + rh]].forEach(([cx, cy]) => {
        ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#fbbf24'; ctx.fill();
        ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke();
      });
      // Size indicator
      if (rw > 60 && rh > 40) {
        ctx.fillStyle = 'rgba(251,191,36,0.85)'; ctx.fillRect(rx + rw / 2 - 35, ry + rh / 2 - 12, 70, 22);
        ctx.fillStyle = '#000'; ctx.font = 'bold 9px Inter'; ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(rw)}×${Math.round(rh)}px`, rx + rw / 2, ry + rh / 2 + 3);
        ctx.textAlign = 'start';
      }
      return;
    }

    // ── Quad overlay mode ──
    const q = localQ.current;
    const sc = (p: Pt): Pt => ({ x: p.x * scX, y: p.y * scY });
    const C = { tl: sc(q.tl), tr: sc(q.tr), br: sc(q.br), bl: sc(q.bl) };

    // Dark overlay outside quad
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, dW, dH);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.moveTo(C.tl.x, C.tl.y); ctx.lineTo(C.tr.x, C.tr.y);
    ctx.lineTo(C.br.x, C.br.y); ctx.lineTo(C.bl.x, C.bl.y);
    ctx.closePath(); ctx.fill(); ctx.restore();

    // Quad border glow
    ctx.save();
    ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 14;
    ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2.5; ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(C.tl.x, C.tl.y); ctx.lineTo(C.tr.x, C.tr.y);
    ctx.lineTo(C.br.x, C.br.y); ctx.lineTo(C.bl.x, C.bl.y);
    ctx.closePath(); ctx.stroke();
    ctx.setLineDash([]); ctx.shadowBlur = 0; ctx.restore();

    // Rule-of-thirds grid
    ctx.save(); ctx.globalAlpha = 0.18; ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 0.8;
    for (let t = 1; t < 3; t++) {
      const f = t / 3;
      const lerp = (a: Pt, b: Pt): Pt => ({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
      const p1 = lerp(C.tl, C.tr), p2 = lerp(C.bl, C.br);
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
      const p3 = lerp(C.tl, C.bl), p4 = lerp(C.tr, C.br);
      ctx.beginPath(); ctx.moveTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.restore();

    // Corner handles with L-shaped brackets
    const COLORS: Record<CKey, string> = { tl: '#f59e0b', tr: '#22d3ee', br: '#22d3ee', bl: '#f59e0b' };
    const LABELS: Record<CKey, string> = { tl: '↖', tr: '↗', br: '↘', bl: '↙' };
    for (const key of ['tl', 'tr', 'br', 'bl'] as CKey[]) {
      const p = C[key], col = COLORS[key];
      // Glow ring
      ctx.beginPath(); ctx.arc(p.x, p.y, HANDLE + 8, 0, Math.PI * 2);
      ctx.fillStyle = `${col}18`; ctx.fill();
      // Main circle
      ctx.beginPath(); ctx.arc(p.x, p.y, HANDLE, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(p.x - 3, p.y - 3, 0, p.x, p.y, HANDLE);
      grad.addColorStop(0, col + 'ff'); grad.addColorStop(1, col + 'aa');
      ctx.fillStyle = grad; ctx.fill();
      ctx.strokeStyle = 'white'; ctx.lineWidth = 2.5; ctx.stroke();
      // Arrow label
      ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.font = `bold 11px Inter`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(LABELS[key], p.x, p.y);
      ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
    }
  }

  function getPos(e: React.MouseEvent | React.TouchEvent): Pt {
    const r = cvRef.current!.getBoundingClientRect();
    const cx = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const cy = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return { x: cx - r.left, y: cy - r.top };
  }

  function toNat(p: Pt): Pt {
    const r = cvRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(natW, p.x * natW / r.width)),
      y: Math.max(0, Math.min(natH, p.y * natH / r.height)),
    };
  }

  function nearHandle(p: Pt): CKey | null {
    const r = cvRef.current!.getBoundingClientRect();
    const scX = r.width / natW, scY = r.height / natH;
    let best: CKey | null = null, bestD = HANDLE * 3;
    for (const k of ['tl', 'tr', 'br', 'bl'] as CKey[]) {
      const d = dist(p, { x: localQ.current[k].x * scX, y: localQ.current[k].y * scY });
      if (d < bestD) { bestD = d; best = k; }
    }
    return best;
  }

  function onDown(e: React.MouseEvent | React.TouchEvent) {
    if ('touches' in e) e.preventDefault();
    const pos = getPos(e);
    if (selMode) { selStart.current = pos; selEnd.current = pos; redraw(); return; }
    dragging.current = nearHandle(pos);
  }

  function onMove(e: React.MouseEvent | React.TouchEvent) {
    if ('touches' in e) e.preventDefault();
    const pos = getPos(e);
    if (selMode) { if (!selStart.current) return; selEnd.current = pos; redraw(); return; }
    if (!dragging.current) return;
    localQ.current = { ...localQ.current, [dragging.current]: toNat(pos) };
    redraw();
  }

  function onUp(e: React.MouseEvent | React.TouchEvent) {
    if ('touches' in e) e.preventDefault();
    if (selMode && selStart.current && selEnd.current) {
      const s = selStart.current, en = selEnd.current;
      const r = cvRef.current!.getBoundingClientRect();
      const scX = natW / r.width, scY = natH / r.height;
      const x1 = Math.min(s.x, en.x) * scX, y1 = Math.min(s.y, en.y) * scY;
      const x2 = Math.max(s.x, en.x) * scX, y2 = Math.max(s.y, en.y) * scY;
      if (Math.abs(x2 - x1) > 20 && Math.abs(y2 - y1) > 20)
        onSelRect({ tl: { x: x1, y: y1 }, tr: { x: x2, y: y1 }, br: { x: x2, y: y2 }, bl: { x: x1, y: y2 } });
      selStart.current = null; selEnd.current = null; redraw(); return;
    }
    if (dragging.current) { onQuadChange({ ...localQ.current }); dragging.current = null; }
  }

  const dW = Math.min(natW, 860), dH = Math.round(dW * natH / natW);
  return (
    <canvas ref={cvRef} width={dW} height={dH}
      style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 8,
        border: selMode ? '2px solid #fbbf24' : '1.5px solid #1e3a5f',
        cursor: selMode ? 'crosshair' : 'default', userSelect: 'none', touchAction: 'none' }}
      onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
      onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════
   PrintPreviewCanvas — Live margin preview
═══════════════════════════════════════════════════════════════ */
interface PrintPreviewCanvasProps {
  front: string | null; back: string | null;
  config: PrintConfig; layout: LayoutPreset;
}

function PrintPreviewCanvas({ front, config, layout }: PrintPreviewCanvasProps) {
  const dims = getPageDimsMm(config.page);
  const PREVIEW_W = 260;
  const PREVIEW_H = Math.round(PREVIEW_W * dims.h / dims.w);
  const scaleX = PREVIEW_W / dims.w;
  const scaleY = PREVIEW_H / dims.h;

  const printable = getPrintableArea(dims, config.margins);
  const pxMarginTop = printable.y * scaleY;
  const pxMarginLeft = printable.x * scaleX;
  const pxPrintW = printable.w * scaleX;
  const pxPrintH = printable.h * scaleY;

  const isTwoPage = layout === 'a5-front-back';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
      {/* Page labels */}
      <div style={{ fontSize: 9, color: '#475569', fontFamily: 'Inter,sans-serif', fontWeight: 700, letterSpacing: 2 }}>
        APERÇU IMPRESSION — {dims.w}×{dims.h}mm
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        {(isTwoPage ? ['front', 'back'] : ['main']).map((pageKey, idx) => {
          const imgSrc = pageKey === 'front' || pageKey === 'main' ? front : null;
          return (
            <div key={pageKey} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              {isTwoPage && (
                <div style={{ fontSize: 8, color: '#64748b', fontFamily: 'Inter,sans-serif', fontWeight: 700, letterSpacing: 2 }}>
                  {idx === 0 ? 'PAGE 1 — RECTO' : 'PAGE 2 — VERSO'}
                </div>
              )}
              {/* Paper */}
              <div style={{
                width: PREVIEW_W, height: PREVIEW_H, background: 'white',
                boxShadow: '0 4px 18px rgba(0,0,0,0.4)', borderRadius: 3,
                border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden', flexShrink: 0
              }}>
                {/* Margin zone (light gray background = margin area) */}
                <div style={{ position: 'absolute', inset: 0, background: '#f1f5f9' }} />

                {/* Printable area — white */}
                <div style={{
                  position: 'absolute', left: pxMarginLeft, top: pxMarginTop,
                  width: pxPrintW, height: pxPrintH, background: 'white',
                  border: '1px dashed #94a3b8', overflow: 'hidden'
                }}>
                  {/* Image inside printable area — anchored to TOP */}
                  {imgSrc ? (
                    <img src={imgSrc} alt="preview" style={{
                      position: 'absolute',
                      top: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      maxWidth: '100%',
                      maxHeight: '100%',
                      width: 'auto',
                      height: 'auto',
                      objectFit: config.fit === 'cover' ? 'cover' : 'contain',
                      ...(config.fit === 'cover' ? { width: '100%', height: '100%', left: 0, transform: 'none' } : {}),
                    }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ textAlign: 'center', color: '#cbd5e1' }}>
                        <div style={{ fontSize: 18, marginBottom: 3 }}>🪪</div>
                        <div style={{ fontSize: 7, fontFamily: 'Inter,sans-serif' }}>
                          {pageKey === 'front' || pageKey === 'main' ? 'RECTO' : 'VERSO'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Margin dimension indicators */}
                <div style={{ position: 'absolute', top: pxMarginTop / 2 - 5, left: 0, right: 0, textAlign: 'center', fontSize: 7, color: '#94a3b8', fontFamily: 'Inter,monospace' }}>
                  {config.margins.top}mm
                </div>
                <div style={{ position: 'absolute', left: pxMarginLeft / 2, top: '50%', transform: 'translateY(-50%) rotate(-90deg)', fontSize: 7, color: '#94a3b8', fontFamily: 'Inter,monospace', whiteSpace: 'nowrap' }}>
                  {config.margins.left}mm
                </div>

                {/* Crop marks (if enabled) */}
                {config.cropMarks && (() => {
                  const mk = 6, g = 2;
                  const corners = [
                    { x: pxMarginLeft, y: pxMarginTop },
                    { x: pxMarginLeft + pxPrintW, y: pxMarginTop },
                    { x: pxMarginLeft + pxPrintW, y: pxMarginTop + pxPrintH },
                    { x: pxMarginLeft, y: pxMarginTop + pxPrintH },
                  ];
                  return corners.map((c, i) => {
                    const dx = i < 2 ? 1 : -1, dy = i === 0 || i === 3 ? 1 : -1;
                    return (
                      <svg key={i} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
                        <line x1={c.x - dx * g} y1={c.y} x2={c.x - dx * (g + mk)} y2={c.y} stroke="#aaa" strokeWidth="0.5" />
                        <line x1={c.x} y1={c.y - dy * g} x2={c.x} y2={c.y - dy * (g + mk)} stroke="#aaa" strokeWidth="0.5" />
                      </svg>
                    );
                  });
                })()}
              </div>

              {/* Scale info */}
              <div style={{ fontSize: 7.5, color: '#475569', fontFamily: 'Inter,monospace' }}>
                {Math.round(pxPrintW)}×{Math.round(pxPrintH)}px printable
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, fontSize: 8, fontFamily: 'Inter,sans-serif', color: '#64748b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 10, height: 10, background: '#f1f5f9', border: '1px solid #e2e8f0' }} />Marge
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 10, height: 10, background: 'white', border: '1px dashed #94a3b8' }} />Zone imprimable
        </div>
        {config.cropMarks && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8 }}>✂</div>Traits de coupe
          </div>
        )}
      </div>
    </div>
  );
}



/* MarginControls removed — replaced by ImageSizeControl in settings tab */

/* MarginControls function removed */

/* ═══════════════════════════════════════════════════════════════
   PageSettings component
═══════════════════════════════════════════════════════════════ */
interface PageSettingsProps { config: PageConfig; onChange: (c: PageConfig) => void; }

function PageSettings({ config, onChange }: PageSettingsProps) {
  const btnStyle = (active: boolean, color = '#22d3ee') => ({
    padding: '5px 9px', borderRadius: 5, border: `1px solid ${active ? color : '#1e3a5f'}`,
    background: active ? `${color}20` : '#1e293b', color: active ? color : '#64748b',
    fontSize: 10, cursor: 'pointer' as const, fontFamily: 'inherit', fontWeight: 700
  });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div>
        <div style={{ fontSize: 9.5, color: '#64748b', fontWeight: 700, marginBottom: 5 }}>Format de page</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {(['A4', 'A5', 'Letter', 'Custom'] as PageSize[]).map(s => (
            <button key={s} style={btnStyle(config.size === s)} onClick={() => onChange({ ...config, size: s })}>{s}</button>
          ))}
        </div>
      </div>
      {config.size === 'Custom' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <div>
            <div style={{ fontSize: 9, color: '#64748b', marginBottom: 3 }}>Largeur (mm)</div>
            <input type="number" min={50} max={500} value={config.customW}
              onChange={e => onChange({ ...config, customW: +e.target.value })}
              style={{ width: '100%', padding: '5px', background: '#0d1b2e', color: 'white', border: '1px solid #1e3a5f', borderRadius: 5, fontSize: 11, fontFamily: 'monospace', outline: 'none' }} />
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#64748b', marginBottom: 3 }}>Hauteur (mm)</div>
            <input type="number" min={50} max={500} value={config.customH}
              onChange={e => onChange({ ...config, customH: +e.target.value })}
              style={{ width: '100%', padding: '5px', background: '#0d1b2e', color: 'white', border: '1px solid #1e3a5f', borderRadius: 5, fontSize: 11, fontFamily: 'monospace', outline: 'none' }} />
          </div>
        </div>
      )}
      <div>
        <div style={{ fontSize: 9.5, color: '#64748b', fontWeight: 700, marginBottom: 5 }}>Orientation</div>
        <div style={{ display: 'flex', gap: 5 }}>
          <button style={btnStyle(config.orientation === 'portrait')} onClick={() => onChange({ ...config, orientation: 'portrait' })}>📄 Portrait</button>
          <button style={btnStyle(config.orientation === 'landscape')} onClick={() => onChange({ ...config, orientation: 'landscape' })}>🖥 Paysage</button>
        </div>
      </div>
      <div style={{ background: '#070d1a', borderRadius: 6, padding: '6px 9px', fontSize: 9, color: '#475569', fontFamily: 'Inter,monospace' }}>
        {(() => { const d = getPageDimsMm(config); return `${d.w} × ${d.h} mm → ${mmToPx(d.w)} × ${mmToPx(d.h)} px @ 300 DPI`; })()}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PDF Export Engine — 300 DPI accurate
═══════════════════════════════════════════════════════════════ */
async function exportPDFEngine(
  front: string | null, back: string | null,
  layout: LayoutPreset, printConfig: PrintConfig
) {
  const { default: jsPDF } = await import('jspdf');
  const dims = getPageDimsMm(printConfig.page);
  const W = dims.w, H = dims.h;
  const isPortrait = printConfig.page.orientation === 'portrait';
  const jsFmt: any = printConfig.page.size === 'Custom' ? [W, H] : printConfig.page.size.toLowerCase();
  const printable = getPrintableArea(dims, printConfig.margins);

  function drawImageOnPage(pdf: any, img: string | null, isFirst: boolean) {
    if (!isFirst) pdf.addPage(jsFmt, isPortrait ? 'portrait' : 'landscape');
    pdf.setFillColor(255, 255, 255); pdf.rect(0, 0, W, H, 'F');
    if (img) {
      // Load image to get real dimensions for aspect ratio
      const imgEl = new Image();
      imgEl.src = img;
      const imgW = imgEl.naturalWidth || 856;
      const imgH = imgEl.naturalHeight || 540;
      const placed = calcImagePlacement(imgW, imgH, printable.w, printable.h, printConfig.fit);
      // ── IMAGE STARTS FROM TOP MARGIN — no vertical centering ──
      const finalX = printable.x + placed.offX;   // horizontally centered
      const finalY = printable.y;                  // ← anchored to TOP margin
      pdf.addImage(img, 'JPEG', finalX, finalY, placed.drawW, placed.drawH, undefined, 'FAST');
    }
    if (printConfig.cropMarks) {
      _drawCropMarks(pdf, printable.x, printable.y, printable.w, printable.h);
    }
  }

  if (layout === 'a5-front-back') {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
    drawImageOnPage(pdf, front, true);
    drawImageOnPage(pdf, back, false);
    pdf.save('scan_A5_recto_verso.pdf');
  } else if (layout === 'a4-2copies') {
    const pdf = new jsPDF({ orientation: isPortrait ? 'portrait' : 'landscape', unit: 'mm', format: 'a4' });
    pdf.setFillColor(255, 255, 255); pdf.rect(0, 0, W, H, 'F');
    // 2 copies: top half and bottom half — each image anchored to top of its slot
    const slotH = (printable.h - 5) / 2;
    const images2 = [front, back];
    images2.forEach((img, i) => {
      const slotTop = printable.y + i * (slotH + 5);
      if (img) {
        const el = new Image(); el.src = img;
        const iW = el.naturalWidth || 856, iH = el.naturalHeight || 540;
        const p = calcImagePlacement(iW, iH, printable.w, slotH, printConfig.fit);
        // horizontal center, vertical TOP of slot
        pdf.addImage(img, 'JPEG', printable.x + p.offX, slotTop, p.drawW, p.drawH, undefined, 'FAST');
      }
      if (printConfig.cropMarks) _drawCropMarks(pdf, printable.x, slotTop, printable.w, slotH);
    });
    pdf.save('scan_A4_2copies.pdf');

  } else if (layout === 'a4-4copies') {
    const pdf = new jsPDF({ orientation: isPortrait ? 'portrait' : 'landscape', unit: 'mm', format: 'a4' });
    pdf.setFillColor(255, 255, 255); pdf.rect(0, 0, W, H, 'F');
    const slotW = (printable.w - 5) / 2, slotH = (printable.h - 5) / 2;
    const images4 = [front, back, front, back];
    [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([col, row], i) => {
      const slotLeft = printable.x + col * (slotW + 5);
      const slotTop  = printable.y + row * (slotH + 5);
      const img = images4[i];
      if (img) {
        const el = new Image(); el.src = img;
        const iW = el.naturalWidth || 856, iH = el.naturalHeight || 540;
        const p = calcImagePlacement(iW, iH, slotW, slotH, printConfig.fit);
        // horizontal center, vertical TOP of slot
        pdf.addImage(img, 'JPEG', slotLeft + p.offX, slotTop, p.drawW, p.drawH, undefined, 'FAST');
      }
      if (printConfig.cropMarks) _drawCropMarks(pdf, slotLeft, slotTop, slotW, slotH);
    });
    pdf.save('scan_A4_4copies.pdf');

  } else if (layout === 'a5-front-only') {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
    drawImageOnPage(pdf, front, true);
    pdf.save('scan_A5_recto.pdf');

  } else { // passport
    const pdf = new jsPDF({ orientation: isPortrait ? 'portrait' : 'landscape', unit: 'mm', format: 'a4' });
    pdf.setFillColor(255, 255, 255); pdf.rect(0, 0, W, H, 'F');
    const slotH = (printable.h - 5) / 2;
    [[front, printable.y], [back, printable.y + slotH + 5]].forEach(([img, slotTop]) => {
      if (img) {
        const el = new Image(); el.src = img as string;
        const iW = el.naturalWidth || 856, iH = el.naturalHeight || 540;
        const p = calcImagePlacement(iW, iH, printable.w, slotH, printConfig.fit);
        // horizontal center, vertical TOP of slot
        pdf.addImage(img as string, 'JPEG', printable.x + p.offX, slotTop as number, p.drawW, p.drawH, undefined, 'FAST');
      }
      if (printConfig.cropMarks) _drawCropMarks(pdf, printable.x, slotTop as number, printable.w, slotH);
    });
    pdf.save('scan_passeport.pdf');
  }
}

function _drawCropMarks(pdf: any, x: number, y: number, w: number, h: number) {
  const t = 4, g = 1.5;
  pdf.setDrawColor(160, 160, 160); pdf.setLineWidth(0.12);
  [[x, y, -1, -1], [x + w, y, 1, -1], [x, y + h, -1, 1], [x + w, y + h, 1, 1]].forEach(([cx, cy, dx, dy]) => {
    pdf.line(cx + dx * g, cy, cx + dx * (g + t), cy);
    pdf.line(cx, cy + dy * g, cx, cy + dy * (g + t));
  });
}

/* ═══════════════════════════════════════════════════════════════
   SideState helpers
═══════════════════════════════════════════════════════════════ */
const emptySide = (): SideState => ({
  original: null, natW: 1, natH: 1, quad: null, warped: null,
  detecting: false, success: false, method: ''
});

/* ═══════════════════════════════════════════════════════════════
   LAYOUT PRESETS (labels + icons for selector)
═══════════════════════════════════════════════════════════════ */
const LAYOUT_INFO: Record<LayoutPreset, { label: string; icon: string; desc: string; pages: number }> = {
  'a5-front-back': { label: 'A5 رجوعي', icon: '🪪', desc: 'Recto-Verso — 2 pages séparées', pages: 2 },
  'a4-2copies': { label: 'A4 نسختان', icon: '📄', desc: '2 copies recto sur A4', pages: 1 },
  'a4-4copies': { label: 'A4 أربع نسخ', icon: '4️⃣', desc: '4 copies (2R+2V) sur A4', pages: 1 },
  'a5-front-only': { label: 'A5 رجهة فقط', icon: '🖼️', desc: 'Recto seulement — A5', pages: 1 },
  'passport': { label: 'جواز السفر', icon: '🛂', desc: 'Format passeport — A4', pages: 1 },
};

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
interface CINScannerProps {
  onSave: () => void;
  onUploadAttempt?: () => boolean; // returns false if limit reached (public mode)
  onRequestLogin?: () => void;
  onRequestRegister?: () => void;
  scanUsesLeft?: number;
  isPublic?: boolean;
}

export default function CINScanner({
  onSave,
  onUploadAttempt,
  onRequestLogin,
  onRequestRegister,
  scanUsesLeft,
  isPublic = false,
}: CINScannerProps) {
  const [front, setFront] = useState<SideState>(emptySide());
  const [back, setBack] = useState<SideState>(emptySide());
  const [brightness, setBrightness] = useState(105);
  const [contrast, setContrast] = useState(115);
  const [filter, setFilter] = useState<FilterMode>('color');
  const [layout, setLayout] = useState<LayoutPreset>('a5-front-back');
  const [cvReady, setCvReady] = useState(false);
  const [cvLoading, setCvLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'front' | 'back' | 'preview' | 'settings'>('front');
  const [frontSelMode, setFrontSelMode] = useState(false);
  const [backSelMode, setBackSelMode] = useState(false);
  // settingsTab removed — image size control is now inline

  const [printConfig, setPrintConfig] = useState<PrintConfig>({
    page: { size: 'A5', orientation: 'portrait', customW: 148, customH: 210 },
    margins: { top: 10, bottom: 10, left: 10, right: 10, locked: true, unit: 'mm' },
    imageSize: { widthPct: 90, keepRatio: true, fitMode: 'contain' as ImageFit },
    fit: 'contain',
    cropMarks: true,
    dpi: 300,
  });

  useEffect(() => {
    setCvLoading(true);
    loadOpenCV().then(() => { setCvReady(!!(window.cv?.Mat)); setCvLoading(false); });
  }, []);

  const readFileUrl = (f: File): Promise<string> =>
    new Promise(res => { const r = new FileReader(); r.onload = e => res(e.target!.result as string); r.readAsDataURL(f); });

  const getDims = (url: string): Promise<{ w: number; h: number }> =>
    new Promise(res => { const i = new Image(); i.onload = () => res({ w: i.naturalWidth, h: i.naturalHeight }); i.src = url; });

  const [showLimitPopup, setShowLimitPopup] = useState(false);

  const processFile = useCallback(async (file: File, side: 'front' | 'back') => {
    // Check upload limit in public mode
    if (onUploadAttempt) {
      const allowed = onUploadAttempt();
      if (!allowed) {
        setShowLimitPopup(true);
        return;
      }
    }
    const setState = side === 'front' ? setFront : setBack;
    setState(s => ({ ...s, detecting: true }));
    const dataUrl = await readFileUrl(file);
    const { w, h } = await getDims(dataUrl);
    setState(s => ({ ...s, original: dataUrl, natW: w, natH: h, quad: null, warped: null, detecting: true }));
    const { quad, success, method } = await detectDocumentCorners(dataUrl);
    const warped = await applyWarpToImage(dataUrl, quad, { brightness, contrast, filter });
    setState({ original: dataUrl, natW: w, natH: h, quad, warped, detecting: false, success, method });
    if (side === 'front') setActiveTab('front');
  }, [brightness, contrast, filter]);

  const reDetect = useCallback(async (side: 'front' | 'back') => {
    const state = side === 'front' ? front : back;
    if (!state.original) return;
    const setState = side === 'front' ? setFront : setBack;
    setState(s => ({ ...s, detecting: true }));
    const { quad, success, method } = await detectDocumentCorners(state.original);
    const warped = await applyWarpToImage(state.original, quad, { brightness, contrast, filter });
    setState(s => ({ ...s, quad, warped, detecting: false, success, method }));
  }, [front, back, brightness, contrast, filter]);

  const applyWarp = useCallback(async (side: 'front' | 'back', q: Quad) => {
    const state = side === 'front' ? front : back;
    if (!state.original) return;
    const setState = side === 'front' ? setFront : setBack;
    const warped = await applyWarpToImage(state.original, q, { brightness, contrast, filter });
    setState(s => ({ ...s, quad: q, warped }));
  }, [front, back, brightness, contrast, filter]);

  const reApplyFilters = useCallback(async () => {
    for (const side of ['front', 'back'] as const) {
      const state = side === 'front' ? front : back;
      const setState = side === 'front' ? setFront : setBack;
      if (state.original && state.quad) {
        const warped = await applyWarpToImage(state.original, state.quad, { brightness, contrast, filter });
        setState(s => ({ ...s, warped }));
      }
    }
  }, [front, back, brightness, contrast, filter]);

  async function handleExport() {
    setExporting(true);
    try {
      await exportPDFEngine(front.warped, back.warped, layout, printConfig);
      saveToHistory({ module: 'cin-scanner', type: 'CIN Scan', title: 'بطاقة التعريف الوطنية' });
      onSave();
    } finally { setExporting(false); }
  }

  const hasAny = !!(front.warped || back.warped);

  /* ── Drop Zone ── */
  function DropZone({ sideKey, processing }: { sideKey: 'front' | 'back'; processing: boolean }) {
    const fileRef = useRef<HTMLInputElement>(null);
    return (
      <div onClick={() => fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) processFile(f, sideKey); }}
        style={{ border: '2px dashed #1e3a5f', borderRadius: 14, minHeight: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, cursor: 'pointer', background: '#070d1a', transition: 'all 0.2s' }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#22d3ee'; (e.currentTarget as HTMLDivElement).style.background = '#0a1522'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#1e3a5f'; (e.currentTarget as HTMLDivElement).style.background = '#070d1a'; }}>
        {processing ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, border: '3px solid #1e3a5f', borderTop: '3px solid #22d3ee', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <div style={{ color: '#22d3ee', fontSize: 13, fontWeight: 700 }}>🔍 الكشف التلقائي عن الحواف...</div>
            <div style={{ fontSize: 9.5, color: '#334155', fontFamily: 'Inter,monospace', textAlign: 'center', lineHeight: 2, padding: '0 20px' }}>
              Grayscale → CLAHE → Canny → findContours<br />
              approxPolyDP → Homography → Enhancement
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 52 }}>📷</div>
            <div style={{ color: '#94a3b8', fontSize: 14, fontWeight: 700 }}>{sideKey === 'front' ? '🪪 الوجه الأمامي — Recto' : '🔄 الوجه الخلفي — Verso'}</div>
            <div style={{ color: '#475569', fontSize: 11, fontFamily: 'Inter,sans-serif' }}>انقر أو اسحب — JPG PNG WEBP HEIC</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center', padding: '0 20px' }}>
              {['CIN 🪪', 'جواز 🛂', 'رخصة 🚗', 'بطاقة 📋', 'وثيقة 📄'].map(t => (
                <span key={t} style={{ background: '#0f1e38', color: '#38bdf8', borderRadius: 20, padding: '2px 10px', fontSize: 10, border: '1px solid #1e3a5f' }}>{t}</span>
              ))}
            </div>
          </>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f, sideKey); e.target.value = ''; }} />
      </div>
    );
  }

  /* ── Side Editor Panel ── */
  function SidePanel({ sideKey }: { sideKey: 'front' | 'back' }) {
    const state = sideKey === 'front' ? front : back;
    const setState = sideKey === 'front' ? setFront : setBack;
    const selMode = sideKey === 'front' ? frontSelMode : backSelMode;
    const setSelMode = sideKey === 'front' ? setFrontSelMode : setBackSelMode;
    const fileRef = useRef<HTMLInputElement>(null);

    if (!state.original || state.detecting) return <DropZone sideKey={sideKey} processing={state.detecting} />;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Status bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#080f1e', borderRadius: 8, border: '1px solid #1e293b' }}>
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>
            {sideKey === 'front' ? '🪪 Recto' : '🔄 Verso'} — {state.natW}×{state.natH}px
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {state.success
              ? <span style={{ background: '#052e16', color: '#4ade80', fontSize: 10, padding: '2px 9px', borderRadius: 20, fontWeight: 700, border: '1px solid #14532d' }}>✓ {state.method}</span>
              : <span style={{ background: '#431407', color: '#fb923c', fontSize: 10, padding: '2px 9px', borderRadius: 20, border: '1px solid #7c2d12' }}>⚠ Fallback</span>}
          </div>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 6, background: '#070d1a', borderRadius: 8, padding: 4 }}>
          <button onClick={() => setSelMode(false)} style={{ flex: 1, padding: '7px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 700, background: !selMode ? '#22d3ee20' : 'transparent', color: !selMode ? '#22d3ee' : '#475569', borderBottom: !selMode ? '2px solid #22d3ee' : '2px solid transparent' }}>
            🎯 سحب الزوايا
          </button>
          <button onClick={() => setSelMode(true)} style={{ flex: 1, padding: '7px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 700, background: selMode ? '#fbbf2420' : 'transparent', color: selMode ? '#fbbf24' : '#475569', borderBottom: selMode ? '2px solid #fbbf24' : '2px solid transparent' }}>
            ⬚ تحديد يدوي
          </button>
        </div>

        {selMode && (
          <div style={{ background: '#1c1008', border: '1px solid #3d2c08', borderRadius: 7, padding: '7px 11px', fontSize: 11, color: '#d97706', fontWeight: 600 }}>
            📌 ارسم مستطيلاً حول الوثيقة — سيُطبَّق تصحيح المنظور تلقائياً
          </div>
        )}

        {/* Interactive crop canvas */}
        {state.quad && (
          <CropCanvas
            imageUrl={state.original!} natW={state.natW} natH={state.natH}
            quad={state.quad}
            onQuadChange={q => setState(s => ({ ...s, quad: q }))}
            selMode={selMode}
            onSelRect={q => { setState(s => ({ ...s, quad: q })); setSelMode(false); applyWarp(sideKey, q); }}
          />
        )}

        {/* Warped result */}
        {state.warped && (
          <div>
            <div style={{ fontSize: 11, color: '#4ade80', fontWeight: 700, marginBottom: 5 }}>✅ Résultat après correction de perspective</div>
            <img src={state.warped} alt="warped" style={{ width: '100%', borderRadius: 8, border: '1.5px solid #1e3a5f', display: 'block' }} />
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          <button onClick={() => reDetect(sideKey)} style={{ flex: 1, minWidth: 90, padding: '8px', background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
            🔍 إعادة الكشف
          </button>
          {state.quad && (
            <button onClick={() => applyWarp(sideKey, state.quad!)} style={{ flex: 1, minWidth: 90, padding: '8px', background: 'linear-gradient(135deg,#0891b2,#22d3ee)', color: 'white', border: 'none', borderRadius: 8, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
              ✂️ تطبيق القص
            </button>
          )}
          <button onClick={() => fileRef.current?.click()} style={{ padding: '8px 11px', background: '#334155', color: '#94a3b8', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>📂</button>
          <button onClick={() => { setState(emptySide()); setSelMode(false); }} style={{ padding: '8px 11px', background: '#7f1d1d30', color: '#f87171', border: '1px solid #7f1d1d50', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>🗑️</button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f, sideKey); e.target.value = ''; }} />
      </div>
    );
  }

  /* ─────────────── RENDER ─────────────── */
  return (
    <div className="animate-fadeIn scan-page" style={{ padding: '24px 28px', background: '#070d1a', minHeight: '100%' }}>

      {/* ── Limit Reached Popup ── */}
      {showLimitPopup && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }} onClick={() => setShowLimitPopup(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'linear-gradient(135deg,#0f1e35,#1a2d4a)',
            border: '2px solid rgba(200,150,44,0.4)',
            borderRadius: 24, padding: '40px 36px', maxWidth: 420, width: '100%',
            textAlign: 'center', direction: 'rtl', fontFamily: "'Cairo', sans-serif",
            boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
          }}>
            {/* Gold icon */}
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'linear-gradient(135deg,#c8962c20,#e8b84b30)',
              border: '2px solid rgba(200,150,44,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36, margin: '0 auto 20px',
            }}>🔒</div>

            <div style={{
              background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)',
              borderRadius: 12, padding: '8px 16px', marginBottom: 20,
              fontSize: 11, color: '#f87171', fontFamily: 'Inter, sans-serif', fontWeight: 700,
            }}>
              انتهت الاستخدامات المجانية — 5 / 5
            </div>

            <h2 style={{ color: 'white', fontSize: 22, fontWeight: 900, margin: '0 0 10px' }}>
              سجّل للحصول على استخدام غير محدود
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 1.8, margin: '0 0 28px' }}>
              لقد استخدمت جميع الاستخدامات المجانية الـ 5 لـ Scan Studio.<br />
              أنشئ حساباً مجانياً للاستمرار بدون حدود.
            </p>

            {/* What you get */}
            <div style={{
              background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '14px 18px',
              marginBottom: 24, textAlign: 'right',
            }}>
              {[
                '✅ Scan Studio — استخدام غير محدود',
                '✅ الكاتب العمومي — 9 أنواع وثائق',
                '✅ مولّد السيرة الذاتية',
                '✅ الفواتير والحسابات',
                '✅ الرسائل الفرنسية',
              ].map(item => (
                <div key={item} style={{ fontSize: 12, color: '#86efac', marginBottom: 6 }}>{item}</div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => { setShowLimitPopup(false); onRequestRegister?.(); }}
                style={{
                  padding: '14px', borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg,#c8962c,#e8b84b)', color: '#0f2744',
                  fontSize: 15, fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 8px 24px rgba(200,150,44,0.35)',
                }}>
                📝 إنشاء حساب مجاني ←
              </button>
              <button
                onClick={() => { setShowLimitPopup(false); onRequestLogin?.(); }}
                style={{
                  padding: '12px', borderRadius: 12,
                  border: '1.5px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)',
                  color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                🔓 لدي حساب — تسجيل الدخول
              </button>
              <button
                onClick={() => setShowLimitPopup(false)}
                style={{
                  padding: '8px', border: 'none', background: 'transparent',
                  color: 'rgba(255,255,255,0.3)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Public mode: uses counter bar */}
      {isPublic && typeof scanUsesLeft === 'number' && (
        <div style={{
          background: scanUsesLeft > 0
            ? 'linear-gradient(135deg,rgba(34,211,238,0.08),rgba(34,211,238,0.04))'
            : 'linear-gradient(135deg,rgba(220,38,38,0.1),rgba(220,38,38,0.05))',
          border: `1px solid ${scanUsesLeft > 0 ? 'rgba(34,211,238,0.2)' : 'rgba(220,38,38,0.3)'}`,
          borderRadius: 12, padding: '10px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{
                  width: 22, height: 8, borderRadius: 4,
                  background: i < (5 - scanUsesLeft)
                    ? 'rgba(255,255,255,0.12)'
                    : '#22d3ee',
                  transition: 'background 0.3s',
                }} />
              ))}
            </div>
            <span style={{ fontSize: 12, color: scanUsesLeft > 0 ? '#22d3ee' : '#f87171', fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
              {scanUsesLeft > 0
                ? `${scanUsesLeft} استخدام متبقٍ من أصل 5`
                : 'انتهت الاستخدامات المجانية'}
            </span>
          </div>
          <button
            onClick={() => onRequestRegister?.()}
            style={{
              padding: '6px 14px', borderRadius: 8,
              background: 'linear-gradient(135deg,#c8962c,#e8b84b)', color: '#0f2744',
              border: 'none', fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
            }}>
            سجّل للاستخدام غير المحدود ←
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: 'linear-gradient(135deg,#0c1a32,#1e3a5f)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🪪</div>
        <div>
          <h2 style={{ fontSize: 19, fontWeight: 900, color: 'white', margin: 0 }}>Scan Studio — مسح الوثائق</h2>
          <p style={{ color: '#475569', fontSize: 10.5, margin: 0, fontFamily: 'Inter,sans-serif' }}>
            Auto Edge Detection • Perspective Homography • Margin Control • 300 DPI Export
          </p>
        </div>
        <div style={{ marginRight: 'auto', display: 'flex', gap: 8 }}>
          {cvLoading && <span style={{ background: '#1c1800', color: '#d97706', borderRadius: 20, padding: '4px 11px', fontSize: 10, border: '1px solid #3d2c05', display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 10, height: 10, border: '2px solid #d97706', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />OpenCV.js...</span>}
          {cvReady && !cvLoading && <span style={{ background: '#052e16', color: '#4ade80', borderRadius: 20, padding: '4px 11px', fontSize: 10, fontWeight: 700, border: '1px solid #14532d' }}>✓ OpenCV 4.9</span>}
          {!cvLoading && !cvReady && <span style={{ background: '#430a0a', color: '#f87171', borderRadius: 20, padding: '4px 11px', fontSize: 10, border: '1px solid #7f1d1d' }}>⚠ Mode manuel</span>}
        </div>
      </div>

      {/* Algorithm pipeline strip */}
      <div style={{ background: '#0a1225', borderRadius: 8, padding: '7px 12px', marginBottom: 14, display: 'flex', gap: 0, overflowX: 'auto', border: '1px solid #1e293b' }}>
        {[
          ['1', 'Upload', '#64748b'], ['2', 'Grayscale', '#94a3b8'], ['3', 'CLAHE', '#22d3ee'],
          ['4', 'Gaussian', '#38bdf8'], ['5', 'Canny', '#f59e0b'], ['6', 'Sobel', '#fb923c'],
          ['7', 'Adaptive', '#a78bfa'], ['8', 'findContours', '#f87171'], ['9', 'polyDP', '#4ade80'],
          ['10', 'Homography', '#c084fc'], ['11', 'Unsharp', '#34d399'],
        ].map(([n, t, c], i, arr) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 6px' }}>
              <div style={{ width: 16, height: 16, background: `${c}22`, border: `1px solid ${c}55`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: c }}>{n}</div>
              <span style={{ fontSize: 8.5, fontWeight: 700, color: c, fontFamily: 'Inter,monospace' }}>{t}</span>
            </div>
            {i < arr.length - 1 && <span style={{ color: '#1e3a5f', fontSize: 11 }}>›</span>}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '210px 1fr', gap: 14, alignItems: 'start' }}>

        {/* ── LEFT: Sidebar Controls ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Image Enhancement */}
          <div style={{ background: '#0a1225', borderRadius: 12, padding: 13, border: '1px solid #1e293b' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#22d3ee', marginBottom: 11, display: 'flex', alignItems: 'center', gap: 5 }}>🎛️ تحسين الصورة</div>
            {[
              { label: 'السطوع', val: brightness, set: setBrightness, min: 50, max: 200, color: '#f59e0b' },
              { label: 'التباين', val: contrast, set: setContrast, min: 50, max: 250, color: '#22d3ee' },
            ].map(ctrl => (
              <div key={ctrl.label} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{ctrl.label}</span>
                  <span style={{ fontSize: 10, color: ctrl.color, fontFamily: 'Inter,monospace', fontWeight: 700 }}>{ctrl.val}%</span>
                </div>
                <input type="range" min={ctrl.min} max={ctrl.max} value={ctrl.val}
                  onChange={e => ctrl.set(Number(e.target.value))}
                  style={{ width: '100%', accentColor: ctrl.color, cursor: 'pointer' }} />
              </div>
            ))}
            {/* Filter radio */}
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 6 }}>الفلتر — Filter</div>
            {([
              ['color', '🎨 لون أصلي'],
              ['auto-enhance', '✨ تحسين تلقائي'],
              ['grayscale', '🔲 رمادي'],
              ['bw', '⬛ أبيض وأسود'],
              ['high-contrast', '⚡ تباين عالي'],
              ['id-mode', '🪪 وضع البطاقة'],
            ] as [FilterMode, string][]).map(([m, lbl]) => (
              <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 10, color: filter === m ? '#22d3ee' : '#64748b', fontWeight: filter === m ? 700 : 400, marginBottom: 4 }}>
                <input type="radio" name="filter" checked={filter === m} onChange={() => setFilter(m)} style={{ accentColor: '#22d3ee' }} />{lbl}
              </label>
            ))}
            <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
              <button onClick={() => { setBrightness(105); setContrast(115); setFilter('color'); }}
                style={{ flex: 1, padding: '6px', background: '#1e293b', color: '#64748b', border: '1px solid #334155', borderRadius: 6, fontSize: 9, cursor: 'pointer', fontFamily: 'inherit' }}>↺ إعادة</button>
              <button onClick={reApplyFilters}
                style={{ flex: 1, padding: '6px', background: '#22d3ee20', color: '#22d3ee', border: '1px solid #22d3ee30', borderRadius: 6, fontSize: 9, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>✓ تطبيق</button>
            </div>
          </div>

          {/* Layout selector */}
          <div style={{ background: '#0a1225', borderRadius: 12, padding: 13, border: '1px solid #1e293b' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#22d3ee', marginBottom: 10 }}>📐 تخطيط الطباعة</div>
            {(Object.entries(LAYOUT_INFO) as [LayoutPreset, typeof LAYOUT_INFO[LayoutPreset]][]).map(([key, info]) => (
              <button key={key} onClick={() => { setLayout(key); if (key === 'a5-front-back') setPrintConfig(c => ({ ...c, page: { ...c.page, size: 'A5' } })); else setPrintConfig(c => ({ ...c, page: { ...c.page, size: 'A4' } })); }}
                style={{ width: '100%', padding: '8px 9px', marginBottom: 5, background: layout === key ? '#22d3ee15' : '#1e293b', border: `1.5px solid ${layout === key ? '#22d3ee' : '#1e3a5f'}`, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'right', display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 14 }}>{info.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: layout === key ? '#22d3ee' : '#94a3b8' }}>{info.label}</div>
                  <div style={{ fontSize: 8, color: '#475569', fontFamily: 'Inter,sans-serif' }}>{info.desc}</div>
                </div>
                {layout === key && <span style={{ fontSize: 11, color: '#22d3ee' }}>✓</span>}
              </button>
            ))}
          </div>

          {/* Export panel */}
          <div style={{ background: '#0a1225', borderRadius: 12, padding: 13, border: '1px solid #1e293b' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#22d3ee', marginBottom: 10 }}>📤 التصدير</div>
            <div style={{ background: '#070d1a', borderRadius: 7, padding: '8px 10px', marginBottom: 10, fontSize: 9, color: '#475569', fontFamily: 'Inter,sans-serif', lineHeight: 2 }}>
              📐 {getPageDimsMm(printConfig.page).w}×{getPageDimsMm(printConfig.page).h}mm<br />
              🖨️ {LAYOUT_INFO[layout].pages > 1 ? '2 pages séparées' : '1 page'} — {printConfig.dpi} DPI<br />
              🖼️ Taille image: {printConfig.imageSize.widthPct}% — Mode: {printConfig.fit === 'contain' ? 'Contain' : 'Cover'}
            </div>
            {/* Traits de coupe toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10, padding: '7px 10px', background: '#070d1a', borderRadius: 8, border: `1px solid ${printConfig.cropMarks ? '#22d3ee40' : '#1e293b'}` }}>
              <div
                onClick={() => setPrintConfig(c => ({ ...c, cropMarks: !c.cropMarks }))}
                style={{
                  width: 32, height: 17, borderRadius: 10, position: 'relative', cursor: 'pointer', flexShrink: 0,
                  background: printConfig.cropMarks ? '#22d3ee' : '#334155',
                  transition: 'background 0.2s',
                }}>
                <div style={{
                  position: 'absolute', top: 2, left: printConfig.cropMarks ? 17 : 2,
                  width: 13, height: 13, borderRadius: '50%', background: 'white',
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} />
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: printConfig.cropMarks ? '#22d3ee' : '#64748b' }}>✂️ Traits de coupe</div>
                <div style={{ fontSize: 8.5, color: '#475569', fontFamily: 'Inter,sans-serif' }}>Repères de découpe aux coins</div>
              </div>
            </label>
            <button onClick={handleExport} disabled={!hasAny || exporting}
              style={{ width: '100%', padding: '11px', background: hasAny ? 'linear-gradient(135deg,#dc2626,#991b1b)' : '#1e293b', color: hasAny ? 'white' : '#475569', border: 'none', borderRadius: 8, fontSize: 12, cursor: hasAny ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {exporting ? <><div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />جاري التصدير...</> : '📥 تصدير PDF'}
            </button>
            {hasAny && (
              <button onClick={() => { setFront(emptySide()); setBack(emptySide()); setActiveTab('front'); setFrontSelMode(false); setBackSelMode(false); }}
                style={{ width: '100%', marginTop: 6, padding: '7px', background: 'transparent', color: '#64748b', border: '1px solid #334155', borderRadius: 7, fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
                🗑️ مسح الكل
              </button>
            )}
          </div>

          {/* Tips */}
          <div style={{ background: '#1c1408', borderRadius: 10, padding: '11px 13px', border: '1px solid #3d2c08' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#d97706', marginBottom: 6 }}>💡 نصائح</div>
            <ul style={{ margin: 0, padding: '0 14px 0 0', fontSize: 9.5, color: '#92400e', lineHeight: 2.4 }}>
              <li>خلفية داكنة تحسن الكشف</li>
              <li>تجنب الانعكاسات والظلال</li>
              <li>اضبط الهوامش قبل التصدير</li>
              <li>«تحديد يدوي» للدقة الكاملة</li>
              <li>«وضع البطاقة» يحسن النص</li>
            </ul>
          </div>
        </div>

        {/* ── RIGHT: Main Tabs ── */}
        <div>
          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 5, marginBottom: 12, flexWrap: 'wrap' }}>
            {[
              { id: 'front', label: '🪪 الوجه الأمامي', sub: 'Recto' },
              { id: 'back', label: '🔄 الوجه الخلفي', sub: 'Verso' },
              { id: 'preview', label: '👁️ معاينة الطباعة', sub: 'Print Preview' },
              { id: 'settings', label: '📐 حجم الصورة', sub: 'Image Size' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                style={{ padding: '9px 13px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 11.5, background: activeTab === tab.id ? '#0a1225' : '#0f1a2e', color: activeTab === tab.id ? '#22d3ee' : '#64748b', borderBottom: activeTab === tab.id ? '2.5px solid #22d3ee' : '2.5px solid transparent' }}>
                {tab.label}
                <span style={{ display: 'block', fontSize: 8.5, opacity: 0.6, fontWeight: 400 }}>{tab.sub}</span>
              </button>
            ))}
            {/* Status dots */}
            <div style={{ marginRight: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
              {[{ label: 'Recto', st: front }, { label: 'Verso', st: back }].map(({ label, st }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#0a1225', borderRadius: 7, padding: '5px 9px', border: '1px solid #1e293b' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: st.warped ? '#4ade80' : st.detecting ? '#f59e0b' : '#334155', display: 'block', flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'Inter,sans-serif' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div style={{ background: '#0a1225', borderRadius: 12, padding: 20, border: '1px solid #1e293b', minHeight: 400 }}>

            {/* Front / Back editors */}
            {(activeTab === 'front' || activeTab === 'back') && (
              <SidePanel sideKey={activeTab} />
            )}

            {/* Print Preview */}
            {activeTab === 'preview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'Inter,sans-serif', fontWeight: 700, letterSpacing: 1, textAlign: 'center' }}>
                  APERÇU AVANT IMPRESSION — {LAYOUT_INFO[layout].desc.toUpperCase()}
                </div>
                <PrintPreviewCanvas front={front.warped} back={back.warped} config={printConfig} layout={layout} />

                {/* Recto-verso instructions */}
                {layout === 'a5-front-back' && (
                  <div style={{ maxWidth: 500, margin: '0 auto', background: '#070d1a', borderRadius: 10, padding: '14px 18px', border: '1px solid #22d3ee25', fontSize: 11, color: '#64748b', fontFamily: 'Inter,sans-serif', lineHeight: 2.2 }}>
                    <div style={{ color: '#22d3ee', fontWeight: 700, marginBottom: 4 }}>🖨️ طريقة الطباعة الرجوعية (Recto-Verso)</div>
                    1. افتح PDF → طباعة<br />
                    2. اختر <strong style={{ color: '#94a3b8' }}>Impression recto-verso</strong><br />
                    3. اختر <strong style={{ color: '#94a3b8' }}>Retourner sur le bord long</strong>
                  </div>
                )}
              </div>
            )}

            {/* Image Size Control */}
            {activeTab === 'settings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
                  📐 التحكم في حجم الصورة
                  <span style={{ fontSize: 10, background: '#22d3ee20', color: '#22d3ee', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>Image Size</span>
                </div>

                {/* Width slider */}
                <div style={{ background: '#070d1a', borderRadius: 12, padding: '16px', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#22d3ee', marginBottom: 14 }}>📏 عرض الصورة المطبوعة</div>

                  {/* Visual size preview */}
                  <div style={{ background: '#0a1225', borderRadius: 8, padding: '14px', marginBottom: 14, border: '1px solid #1e3a5f', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 120, height: 75, background: '#1e293b', borderRadius: 4, border: '1px dashed #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      <div style={{
                        width: `${printConfig.imageSize.widthPct}%`,
                        height: `${printConfig.imageSize.widthPct * 0.63}%`,
                        background: 'linear-gradient(135deg,#22d3ee30,#22d3ee60)',
                        border: '1.5px solid #22d3ee',
                        borderRadius: 2,
                        transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <span style={{ fontSize: 9, color: '#22d3ee', fontWeight: 700, fontFamily: 'Inter,monospace' }}>{printConfig.imageSize.widthPct}%</span>
                      </div>
                    </div>
                    <span style={{ fontSize: 9, color: '#64748b', fontFamily: 'Inter,sans-serif' }}>
                      معاينة النسبة على الورقة
                    </span>
                  </div>

                  {/* Slider */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>حجم الصورة</span>
                      <span style={{ fontSize: 13, color: '#22d3ee', fontWeight: 800, fontFamily: 'Inter,monospace' }}>
                        {printConfig.imageSize.widthPct}%
                      </span>
                    </div>
                    <input
                      type="range" min={20} max={100} step={1}
                      value={printConfig.imageSize.widthPct}
                      onChange={e => setPrintConfig(c => ({ ...c, imageSize: { ...c.imageSize, widthPct: Number(e.target.value) } }))}
                      style={{ width: '100%', accentColor: '#22d3ee', cursor: 'pointer', height: 6 }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                      <span style={{ fontSize: 9, color: '#475569', fontFamily: 'Inter,monospace' }}>20%</span>
                      <span style={{ fontSize: 9, color: '#475569', fontFamily: 'Inter,monospace' }}>100%</span>
                    </div>
                  </div>

                  {/* Quick presets */}
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 6 }}>اختيار سريع</div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {[
                      { label: '🔲 صغير', val: 50 },
                      { label: '⬛ متوسط', val: 70 },
                      { label: '🟦 كبير', val: 85 },
                      { label: '📄 كامل', val: 100 },
                    ].map(({ label, val }) => (
                      <button key={val}
                        onClick={() => setPrintConfig(c => ({ ...c, imageSize: { ...c.imageSize, widthPct: val } }))}
                        style={{
                          padding: '6px 10px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit', fontSize: 10, fontWeight: 700,
                          border: `1.5px solid ${printConfig.imageSize.widthPct === val ? '#22d3ee' : '#1e3a5f'}`,
                          background: printConfig.imageSize.widthPct === val ? '#22d3ee20' : '#1e293b',
                          color: printConfig.imageSize.widthPct === val ? '#22d3ee' : '#64748b',
                        }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fit mode */}
                <div style={{ background: '#070d1a', borderRadius: 12, padding: '16px', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#22d3ee', marginBottom: 12 }}>🖼️ وضع ملاءمة الصورة</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {([
                      ['contain', '📏 Contain — بدون تشويه', 'الصورة كاملة داخل المساحة المحددة', '#22d3ee'],
                      ['cover', '🔲 Cover — تغطية كاملة', 'تملأ المساحة مع اقتصاص محتمل', '#f59e0b'],
                    ] as [ImageFit, string, string, string][]).map(([mode, label, desc, color]) => (
                      <button key={mode}
                        onClick={() => setPrintConfig(c => ({ ...c, fit: mode, imageSize: { ...c.imageSize, fitMode: mode } }))}
                        style={{
                          padding: '11px 13px', borderRadius: 9,
                          border: `1.5px solid ${printConfig.fit === mode ? color : '#1e3a5f'}`,
                          background: printConfig.fit === mode ? `${color}15` : '#1e293b',
                          cursor: 'pointer', textAlign: 'right', fontFamily: 'inherit',
                          display: 'flex', alignItems: 'center', gap: 10
                        }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: printConfig.fit === mode ? color : '#94a3b8' }}>{label}</div>
                          <div style={{ fontSize: 9.5, color: '#475569', marginTop: 2, fontFamily: 'Inter,sans-serif' }}>{desc}</div>
                        </div>
                        {printConfig.fit === mode && <span style={{ color, fontSize: 14 }}>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Page settings */}
                <div style={{ background: '#070d1a', borderRadius: 12, padding: '16px', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#22d3ee', marginBottom: 12 }}>📄 إعدادات الصفحة</div>
                  <PageSettings config={printConfig.page} onChange={p => setPrintConfig(c => ({ ...c, page: p }))} />
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 6 }}>🖨️ Résolution DPI</div>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {[72, 150, 300].map(d => (
                        <button key={d} onClick={() => setPrintConfig(c => ({ ...c, dpi: d }))}
                          style={{ flex: 1, padding: '7px', borderRadius: 7, border: `1px solid ${printConfig.dpi === d ? '#22d3ee' : '#1e3a5f'}`, background: printConfig.dpi === d ? '#22d3ee20' : '#1e293b', color: printConfig.dpi === d ? '#22d3ee' : '#64748b', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                          {d} DPI
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Info box */}
                <div style={{ background: '#1c1408', borderRadius: 10, padding: '12px 14px', border: '1px solid #3d2c08' }}>
                  <div style={{ fontSize: 10, color: '#d97706', fontWeight: 700, marginBottom: 6 }}>ℹ️ معلومات</div>
                  <div style={{ fontSize: 9.5, color: '#92400e', lineHeight: 2, fontFamily: 'Inter,sans-serif' }}>
                    • حجم 100% = الصورة تملأ عرض منطقة الطباعة كاملاً<br />
                    • حجم 70% = حجم مثالي للبطاقة الوطنية (CIN)<br />
                    • النسبة الأصلية للصورة محفوظة دائماً<br />
                    • الصورة مركزة أفقياً ومثبتة في الأعلى
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
