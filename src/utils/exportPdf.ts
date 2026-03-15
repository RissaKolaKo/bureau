import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const A4_W_MM  = 210;
const A4_H_MM  = 297;
const A4_W_PX  = 794;
const A5_W_MM  = 148;
const A5_H_MM  = 210;
const A5_W_PX  = 559;

const raf   = () => new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/* ═══════════════════════════════════════════════════════════════════
   captureNode — Reliable capture via on-screen fixed overlay.

   RULES:
   - overlay must be position:fixed top:0 left:0  (inside viewport → GPU paints it)
   - opacity:1 visibility:visible                  (no paint-skip optimization)
   - pointer-events:none                           (user never touches it)
   - clone keeps its original computed height      (sidebar backgrounds don't collapse)
   - We copy computed background-color explicitly  (fixes hex+alpha loss in html2canvas)
═══════════════════════════════════════════════════════════════════ */
async function captureNode(
  source: HTMLElement,
  targetW: number,
  dir: 'ltr' | 'rtl' = 'ltr',
  bgColor = '#ffffff',
  fixedH?: number        // pass a fixed height to preserve (e.g. for A4 page elements)
): Promise<HTMLCanvasElement> {

  /* ── Clone ── */
  const clone = source.cloneNode(true) as HTMLElement;

  /* ── Resolve computed background colors on every element ──
     html2canvas can miss `background` shorthand with hex+alpha.
     We convert every element's computed background to explicit backgroundColor. */
  const srcAll = Array.from(source.querySelectorAll<HTMLElement>('*'));
  const clnAll = Array.from(clone.querySelectorAll<HTMLElement>('*'));
  srcAll.forEach((srcEl, i) => {
    const clnEl = clnAll[i];
    if (!clnEl) return;
    const computed = window.getComputedStyle(srcEl);

    // Copy computed background-color explicitly (handles hex+alpha issues)
    const bg = computed.backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
      clnEl.style.backgroundColor = bg;
    }

    // Copy computed color
    const color = computed.color;
    if (color) clnEl.style.color = color;

    // Fix visibility
    clnEl.style.visibility = 'visible';
    clnEl.style.opacity    = '1';

    // Fix direction
    if (dir === 'ltr') {
      clnEl.style.direction   = 'ltr';
      clnEl.style.unicodeBidi = 'isolate';
    }

    // Unlock overflow (except images/canvas/videos)
    const tag = clnEl.tagName.toLowerCase();
    if (clnEl.style.overflow === 'hidden' && !['img','canvas','video'].includes(tag)) {
      clnEl.style.overflow = 'visible';
    }
  });

  /* ── Style the clone root ── */
  const baseStyles: Partial<CSSStyleDeclaration> = {
    width:          `${targetW}px`,
    minHeight:      'auto',
    maxHeight:      'none',
    transform:      'none',
    position:       'static',
    boxShadow:      'none',
    margin:         '0',
    backgroundColor: bgColor,
    direction:      dir,
    unicodeBidi:    'isolate',
    opacity:        '1',
    visibility:     'visible',
    overflow:       'visible',
  };

  // Preserve fixed height if provided (critical for flex column CV layouts)
  if (fixedH) {
    baseStyles.height    = `${fixedH}px`;
    baseStyles.minHeight = `${fixedH}px`;
    baseStyles.overflow  = 'hidden';
  } else {
    baseStyles.height = 'auto';
  }

  Object.assign(clone.style, baseStyles);
  clone.setAttribute('dir', dir);
  clone.setAttribute('lang', dir === 'ltr' ? 'fr' : 'ar');

  /* ── On-screen fixed overlay ── */
  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position:      'fixed',
    top:           '0',
    left:          '0',
    width:         `${targetW}px`,
    height:        fixedH ? `${fixedH}px` : 'auto',
    zIndex:        '2147483647',
    backgroundColor: bgColor,
    opacity:       '1',
    visibility:    'visible',
    pointerEvents: 'none',
    overflow:      fixedH ? 'hidden' : 'visible',
    direction:     dir,
  });
  overlay.setAttribute('dir', dir);
  overlay.appendChild(clone);
  document.body.appendChild(overlay);

  try {
    /* Force layout */
    void overlay.getBoundingClientRect();

    /* Wait for fonts + GPU paint */
    try { await document.fonts.ready; } catch { /* ignore */ }
    await raf();
    await delay(500);

    /* Measure real height */
    const realH = fixedH ?? Math.max(
      clone.scrollHeight,
      clone.offsetHeight,
      clone.getBoundingClientRect().height,
      600
    );

    if (!fixedH) {
      overlay.style.height = `${realH}px`;
      await raf();
      await delay(100);
    }

    /* Capture */
    const canvas = await html2canvas(clone, {
      scale:                  3,
      useCORS:                true,
      allowTaint:             true,
      backgroundColor:        bgColor,
      logging:                false,
      width:                  targetW,
      height:                 realH,
      windowWidth:            targetW + 20,
      windowHeight:           realH + 20,
      x:                      0,
      y:                      0,
      scrollX:                0,
      scrollY:                0,
      foreignObjectRendering: false,
      imageTimeout:           15000,
    });

    if (!canvas || canvas.width < 10 || canvas.height < 10) {
      throw new Error('html2canvas returned empty canvas');
    }

    return canvas;

  } finally {
    try { document.body.removeChild(overlay); } catch { /* ignore */ }
  }
}

/* ═══════════════════════════════════════════════════════════════
   sliceToPDF — slices canvas into A4/A5 pages, prevents blank last page
═══════════════════════════════════════════════════════════════ */
function sliceToPDF(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  pageW_mm: number,
  pageH_mm: number,
  quality = 0.97
): void {
  const cW      = canvas.width;
  const cH      = canvas.height;
  const mmPerPx = pageW_mm / cW;
  const pageHpx = Math.round(pageH_mm / mmPerPx);

  let yPx     = 0;
  let isFirst = true;

  while (yPx < cH) {
    const remaining = cH - yPx;
    if (remaining < 4) break;

    const sliceH  = Math.min(pageHpx, remaining);
    const sliceMM = sliceH * mmPerPx;

    const sl  = document.createElement('canvas');
    sl.width  = cW;
    sl.height = sliceH;
    const ctx = sl.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cW, sliceH);
    ctx.drawImage(canvas, 0, yPx, cW, sliceH, 0, 0, cW, sliceH);

    if (!isFirst) pdf.addPage();
    pdf.addImage(
      sl.toDataURL('image/jpeg', quality),
      'JPEG',
      0, 0,
      pageW_mm,
      parseFloat(Math.min(sliceMM, pageH_mm).toFixed(4))
    );

    yPx    += sliceH;
    isFirst  = false;
  }
}

/* ═══════════════════════════════════════════════════════════════
   PUBLIC — Arabic/RTL documents (Public Writer, French Letters)
═══════════════════════════════════════════════════════════════ */
export async function exportElementToPDF(
  element: HTMLElement,
  filename: string,
  format: 'a4' | 'a5' = 'a4',
  direction: 'ltr' | 'rtl' = 'rtl'
): Promise<void> {
  const pageW   = format === 'a4' ? A4_W_MM : A5_W_MM;
  const pageH   = format === 'a4' ? A4_H_MM : A5_H_MM;
  const targetW = format === 'a4' ? A4_W_PX : A5_W_PX;

  const canvas = await captureNode(element, targetW, direction);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit:        'mm',
    format:      format === 'a4' ? 'a4' : [pageW, pageH],
    compress:    true,
  });

  sliceToPDF(pdf, canvas, pageW, pageH);
  pdf.save(`${filename}.pdf`);
}

/* ═══════════════════════════════════════════════════════════════
   PUBLIC — CV (LTR, A4)
   Uses fixed A4 height to preserve sidebar flex-stretch backgrounds
═══════════════════════════════════════════════════════════════ */
export async function exportCVToPDF(
  element: HTMLElement,
  filename: string,
  bgColor = '#ffffff'
): Promise<void> {
  // A4 at 96 DPI = 794 × 1123px — preserve exact dimensions so
  // the Modern template's flex sidebar background fills the page
  const A4_H_PX = 1123;

  const canvas = await captureNode(element, A4_W_PX, 'ltr', bgColor, A4_H_PX);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit:        'mm',
    format:      'a4',
    compress:    true,
  });

  // For CV: exactly one A4 page (no slicing needed — content fits)
  pdf.addImage(
    canvas.toDataURL('image/jpeg', 0.97),
    'JPEG',
    0, 0,
    A4_W_MM, A4_H_MM
  );

  pdf.save(`${filename}.pdf`);
}

/* ═══════════════════════════════════════════════════════════════
   PUBLIC — Invoices / Devis (LTR, French, A4)
═══════════════════════════════════════════════════════════════ */
export async function exportInvoiceToPDF(
  element: HTMLElement,
  filename: string
): Promise<void> {
  /* Clone with full LTR override */
  const clone = element.cloneNode(true) as HTMLElement;

  const forceAllLTR = (el: HTMLElement) => {
    el.style.direction   = 'ltr';
    el.style.unicodeBidi = 'isolate';
    el.style.visibility  = 'visible';
    el.style.opacity     = '1';
    if (el.style.overflow === 'hidden' && !['IMG','CANVAS'].includes(el.tagName)) {
      el.style.overflow = 'visible';
    }
    Array.from(el.children).forEach(c => forceAllLTR(c as HTMLElement));
  };
  forceAllLTR(clone);

  // Copy computed background-colors from source
  const srcAll = Array.from(element.querySelectorAll<HTMLElement>('*'));
  const clnAll = Array.from(clone.querySelectorAll<HTMLElement>('*'));
  srcAll.forEach((srcEl, i) => {
    const clnEl = clnAll[i];
    if (!clnEl) return;
    const bg = window.getComputedStyle(srcEl).backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)') clnEl.style.backgroundColor = bg;
    const color = window.getComputedStyle(srcEl).color;
    if (color) clnEl.style.color = color;
  });

  Object.assign(clone.style, {
    width:           '794px',
    minHeight:       'auto',
    height:          'auto',
    position:        'static',
    transform:       'none',
    boxShadow:       'none',
    margin:          '0',
    backgroundColor: '#ffffff',
    direction:       'ltr',
    overflow:        'visible',
  });
  clone.setAttribute('dir', 'ltr');
  clone.setAttribute('lang', 'fr');

  /* On-screen overlay */
  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position:        'fixed',
    top:             '0',
    left:            '0',
    width:           '794px',
    zIndex:          '2147483647',
    backgroundColor: '#ffffff',
    opacity:         '1',
    visibility:      'visible',
    pointerEvents:   'none',
    overflow:        'visible',
    direction:       'ltr',
  });
  overlay.setAttribute('dir', 'ltr');
  overlay.appendChild(clone);
  document.body.appendChild(overlay);

  try {
    void overlay.getBoundingClientRect();
    try { await document.fonts.ready; } catch { /* ignore */ }
    await raf();
    await delay(500);

    const realH = Math.max(
      clone.scrollHeight,
      clone.offsetHeight,
      clone.getBoundingClientRect().height,
      1123
    );

    overlay.style.height = `${realH}px`;
    await raf();
    await delay(150);

    const canvas = await html2canvas(clone, {
      scale:                  3,
      useCORS:                true,
      allowTaint:             true,
      backgroundColor:        '#ffffff',
      logging:                false,
      width:                  794,
      height:                 realH,
      windowWidth:            814,
      windowHeight:           realH + 20,
      x: 0, y: 0,
      scrollX: 0, scrollY: 0,
      foreignObjectRendering: false,
      imageTimeout:           15000,
    });

    if (!canvas || canvas.width < 10 || canvas.height < 10) {
      throw new Error('Blank canvas from html2canvas');
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit:        'mm',
      format:      'a4',
      compress:    true,
    });

    sliceToPDF(pdf, canvas, A4_W_MM, A4_H_MM, 0.97);
    pdf.save(`${filename}.pdf`);

  } finally {
    try { document.body.removeChild(overlay); } catch { /* ignore */ }
  }
}

/* ═══════════════════════════════════════════════════════════════
   PUBLIC — CIN A5 two-page portrait (no text, no watermark)
═══════════════════════════════════════════════════════════════ */
export async function exportCINToPDF(
  frontImg: string,
  backImg:  string,
  filename = 'CIN'
): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit:        'mm',
    format:      'a5',
    compress:    true,
  });

  const pageW     = 148;
  const pageH     = 210;
  const margin    = 10;
  const cardRatio = 85.6 / 54;
  const cardW     = pageW - margin * 2;
  const cardH     = cardW / cardRatio;

  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageW, pageH, 'F');
  if (frontImg) {
    pdf.addImage(frontImg, 'JPEG', margin, margin, cardW, cardH, undefined, 'FAST');
    _cropMarks(pdf, margin, margin, cardW, cardH);
  }

  if (backImg) {
    pdf.addPage();
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageW, pageH, 'F');
    pdf.addImage(backImg, 'JPEG', margin, margin, cardW, cardH, undefined, 'FAST');
    _cropMarks(pdf, margin, margin, cardW, cardH);
  }

  pdf.save(`${filename}.pdf`);
}

function _cropMarks(pdf: jsPDF, x: number, y: number, w: number, h: number) {
  const t = 3, g = 1;
  pdf.setDrawColor(190, 190, 190);
  pdf.setLineWidth(0.1);
  pdf.line(x - g - t, y,         x - g,          y);
  pdf.line(x,         y - g - t, x,               y - g);
  pdf.line(x + w + g, y,         x + w + g + t,   y);
  pdf.line(x + w,     y - g - t, x + w,           y - g);
  pdf.line(x - g - t, y + h,     x - g,           y + h);
  pdf.line(x,         y + h + g, x,               y + h + g + t);
  pdf.line(x + w + g, y + h,     x + w + g + t,   y + h);
  pdf.line(x + w,     y + h + g, x + w,           y + h + g + t);
}
