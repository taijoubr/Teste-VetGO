// Vetgo Isolated Print & PDF Engine
// Garante impressão A4 impecável e geração de PDFs reais em qualquer navegador e dispositivo móvel,
// eliminando travamentos em iframes/sandbox, fundos escuros de modais, cores oklch/oklab do Tailwind v4 e perda de estilos em produção.

// @ts-ignore
import html2pdf from 'html2pdf.js';

export interface PrintOptions {
  orientation?: 'portrait' | 'landscape';
  margin?: string;
  fallbackToPdfOnFailure?: boolean;
}

let cachedColorCanvasCtx: CanvasRenderingContext2D | null | undefined;

function getColorCanvasContext(): CanvasRenderingContext2D | null {
  if (cachedColorCanvasCtx !== undefined) return cachedColorCanvasCtx;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    cachedColorCanvasCtx = canvas.getContext('2d', { willReadFrequently: true });
  } catch {
    cachedColorCanvasCtx = null;
  }
  return cachedColorCanvasCtx;
}

const resolvedColorCache = new Map<string, string>();

/**
 * Converte qualquer função de cor moderna (oklch, oklab, color-mix, lab, lch)
 * para rgba(r, g, b, a) compatível com html2canvas usando o motor nativo do navegador.
 */
function resolveCssColorToRgba(colorExpr: string): string {
  const cached = resolvedColorCache.get(colorExpr);
  if (cached) return cached;

  const ctx = getColorCanvasContext();
  if (!ctx) return 'rgb(15, 23, 42)';

  try {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillStyle = colorExpr;
    ctx.fillRect(0, 0, 1, 1);
    const data = ctx.getImageData(0, 0, 1, 1).data;
    const r = data[0];
    const g = data[1];
    const b = data[2];
    const a = Number((data[3] / 255).toFixed(3));
    const resolved = a >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a})`;
    resolvedColorCache.set(colorExpr, resolved);
    return resolved;
  } catch {
    return 'rgb(15, 23, 42)';
  }
}

/**
 * Substitui recursivamente todas as expressões oklch(...), oklab(...), lab(...), lch(...) e color-mix(...)
 * e remove modificadores de interpolação de gradiente ("in oklab", "in oklch") não suportados pelo html2canvas.
 */
function sanitizeCssValueForPdf(value: string): string {
  if (!value) return value;

  let result = value.replace(
    /(linear-gradient|radial-gradient|conic-gradient)\(\s*([^,()]*?)\s+in\s+(oklab|oklch|lab|lch|srgb-linear|srgb|hsl|hwb)\b/gi,
    (_m, fn, dir) => `${fn}(${dir}`
  );
  result = result.replace(/\s+in\s+(oklab|oklch|lab|lch|srgb-linear|srgb|hsl|hwb)(?=\s*[,;)}])/gi, '');

  const fnRegex = /(oklch|oklab|color-mix|lch|lab)\(/gi;
  let guard = 0;
  const maxMatches = 15000;

  while (guard < maxMatches) {
    fnRegex.lastIndex = 0;
    const match = fnRegex.exec(result);
    if (!match) break;

    const startIdx = match.index;
    let depth = 0;
    let endIdx = -1;

    for (let i = startIdx; i < result.length; i++) {
      const ch = result[i];
      if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth === 0) {
          endIdx = i;
          break;
        }
      }
    }

    if (endIdx === -1) break;

    const fullExpr = result.slice(startIdx, endIdx + 1);
    const rgba = resolveCssColorToRgba(fullExpr);
    result = result.slice(0, startIdx) + rgba + result.slice(endIdx + 1);
    guard++;
  }

  return result;
}

/**
 * Sanitiza folhas de estilo e todos os estilos computados do elemento clonado pelo html2canvas
 * para eliminar funções oklch/oklab/color-mix incompatíveis (Tailwind CSS v4).
 */
function sanitizeClonedTreeForPdf(clonedDoc: Document, clonedRoot: HTMLElement): void {
  const win = clonedDoc.defaultView || window;

  // 1. Converte <link rel="stylesheet"> acessíveis em <style> sanitizados (produção / build Vite)
  try {
    const links = Array.from(clonedDoc.querySelectorAll('link[rel="stylesheet"]'));
    for (const link of links) {
      const href = (link as HTMLLinkElement).href;
      const matchingSheet = Array.from(document.styleSheets).find((s) => s.href === href);
      if (matchingSheet) {
        try {
          const rulesText = Array.from(matchingSheet.cssRules || []).map((r) => r.cssText).join('\n');
          if (rulesText) {
            const replacementStyle = clonedDoc.createElement('style');
            replacementStyle.textContent = /oklch|oklab|color-mix|lch\(|lab\(/i.test(rulesText)
              ? sanitizeCssValueForPdf(rulesText)
              : rulesText;
            link.parentNode?.replaceChild(replacementStyle, link);
          }
        } catch {}
      }
    }
  } catch {}

  // 2. Sanitiza tags <style> inline (desenvolvimento / Tailwind Vite plugin)
  try {
    const styles = Array.from(clonedDoc.querySelectorAll('style'));
    for (const styleEl of styles) {
      if (styleEl.textContent && /oklch|oklab|color-mix|lch\(|lab\(/i.test(styleEl.textContent)) {
        styleEl.textContent = sanitizeCssValueForPdf(styleEl.textContent);
      }
    }
  } catch {}

  // 3. Força conversão de estilos computados em todos os nós da árvore alvo (fallback definitivo)
  const colorProps: Array<[keyof CSSStyleDeclaration, string]> = [
    ['color', 'color'],
    ['backgroundColor', 'background-color'],
    ['backgroundImage', 'background-image'],
    ['borderTopColor', 'border-top-color'],
    ['borderRightColor', 'border-right-color'],
    ['borderBottomColor', 'border-bottom-color'],
    ['borderLeftColor', 'border-left-color'],
    ['outlineColor', 'outline-color'],
    ['textDecorationColor', 'text-decoration-color'],
    ['textShadow', 'text-shadow'],
    ['webkitTextStrokeColor', '-webkit-text-stroke-color'],
    ['boxShadow', 'box-shadow'],
    ['fill', 'fill'],
    ['stroke', 'stroke'],
    ['listStyleImage', 'list-style-image'],
    ['caretColor', 'caret-color'],
    ['columnRuleColor', 'column-rule-color'],
  ];

  const sanitizeNode = (el: Element) => {
    try {
      const cs = win.getComputedStyle(el);
      const styleTarget = (el as HTMLElement).style;
      if (!styleTarget) return;

      for (const [jsProp, cssProp] of colorProps) {
        const val = cs[jsProp] as unknown as string;
        if (val && typeof val === 'string' && /oklch|oklab|color-mix|lch\(|lab\(|\sin\s/i.test(val)) {
          styleTarget.setProperty(cssProp, sanitizeCssValueForPdf(val), 'important');
        }
      }

      if (cs.backdropFilter && cs.backdropFilter !== 'none') {
        styleTarget.setProperty('backdrop-filter', 'none', 'important');
      }

      if (
        el.classList?.contains('no-print') ||
        el.classList?.contains('print:hidden')
      ) {
        styleTarget.setProperty('display', 'none', 'important');
      }

      if (el.tagName === 'IMG') {
        const img = el as HTMLImageElement;
        if (img.src && !img.src.startsWith('data:') && !img.src.startsWith('blob:')) {
          if (!img.complete || img.naturalWidth === 0) {
            styleTarget.setProperty('display', 'none', 'important');
          }
        }
      }
    } catch {}
  };

  sanitizeNode(clonedDoc.documentElement);
  if (clonedDoc.body) sanitizeNode(clonedDoc.body);

  const descendants = clonedRoot.querySelectorAll('*');
  sanitizeNode(clonedRoot);
  for (let i = 0; i < descendants.length; i++) {
    sanitizeNode(descendants[i]);
  }
}

/**
 * Imprime um elemento HTML de forma isolada, síncrona (preservando o gesto do usuário),
 * compatível com qualquer navegador, mobile e preview em iframe.
 */
export function printElement(
  elementId: string,
  documentTitle = 'Documento_Veterinario_Vetgo',
  options?: PrintOptions
): void {
  const sourceEl = document.getElementById(elementId);
  if (!sourceEl) {
    console.warn(`Elemento #${elementId} não encontrado para impressão.`);
    try {
      window.print();
    } catch {}
    return;
  }

  // Remove qualquer raiz/estilo de impressão anterior pendente
  try {
    document.getElementById('vetgo-direct-print-root')?.remove();
    document.getElementById('vetgo-direct-print-style')?.remove();
    document.getElementById('vetgo-print-iframe')?.remove();
  } catch {}

  const orientation = options?.orientation || 'portrait';
  const pageMargin =
    options?.margin ||
    (orientation === 'landscape' ? '8mm 10mm 8mm 10mm' : '10mm 12mm 12mm 12mm');

  // Clona o próprio elemento para preservar suas classes de layout (space-y-*, text-*, grid, etc.)
  const clonedEl = sourceEl.cloneNode(true) as HTMLElement;
  clonedEl.removeAttribute('id');
  clonedEl.classList.add('printable-document');
  if (orientation === 'landscape') {
    clonedEl.classList.add('printable-anesthesia-landscape');
  }

  // Sincroniza valores de inputs/textareas/selects caso haja campos editáveis no documento
  try {
    const srcFields = sourceEl.querySelectorAll('input, textarea, select');
    const dstFields = clonedEl.querySelectorAll('input, textarea, select');
    for (let i = 0; i < srcFields.length && i < dstFields.length; i++) {
      const s = srcFields[i] as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      const d = dstFields[i] as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (s instanceof HTMLInputElement && d instanceof HTMLInputElement) {
        if (s.type === 'checkbox' || s.type === 'radio') {
          d.checked = s.checked;
          if (s.checked) d.setAttribute('checked', 'checked');
          else d.removeAttribute('checked');
        } else {
          d.value = s.value;
          d.setAttribute('value', s.value);
        }
      } else if (s instanceof HTMLTextAreaElement && d instanceof HTMLTextAreaElement) {
        d.value = s.value;
        d.textContent = s.value;
      } else if (s instanceof HTMLSelectElement && d instanceof HTMLSelectElement) {
        d.selectedIndex = s.selectedIndex;
      }
    }
  } catch {}

  const printRoot = document.createElement('div');
  printRoot.id = 'vetgo-direct-print-root';
  printRoot.setAttribute('aria-hidden', 'true');
  printRoot.appendChild(clonedEl);

  const printStyle = document.createElement('style');
  printStyle.id = 'vetgo-direct-print-style';
  printStyle.textContent = `
    #vetgo-direct-print-root {
      display: none;
    }
    @media print {
      @page {
        size: A4 ${orientation};
        margin: ${pageMargin};
      }
      html, body {
        background: #ffffff !important;
        color: #000000 !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        height: auto !important;
        overflow: visible !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body > *:not(#vetgo-direct-print-root) {
        display: none !important;
      }
      #vetgo-direct-print-root {
        display: block !important;
        position: static !important;
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #000000 !important;
        overflow: visible !important;
      }
      #vetgo-direct-print-root .no-print,
      #vetgo-direct-print-root .print\\:hidden {
        display: none !important;
      }
      #vetgo-direct-print-root div,
      #vetgo-direct-print-root section,
      #vetgo-direct-print-root main,
      #vetgo-direct-print-root article,
      #vetgo-direct-print-root table,
      #vetgo-direct-print-root tbody,
      #vetgo-direct-print-root thead,
      #vetgo-direct-print-root tr {
        overflow: visible !important;
        max-height: none !important;
      }
      #vetgo-direct-print-root table {
        border-collapse: collapse !important;
        page-break-inside: auto !important;
      }
      #vetgo-direct-print-root tr,
      #vetgo-direct-print-root .break-inside-avoid {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      #vetgo-direct-print-root .printable-document,
      #vetgo-direct-print-root .printable-anesthesia-landscape {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        margin: 0 auto !important;
        max-width: 100% !important;
        width: 100% !important;
      }
    }
  `;

  const previousTitle = document.title;
  document.title = documentTitle;
  document.head.appendChild(printStyle);
  document.body.appendChild(printRoot);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    window.removeEventListener('afterprint', onAfterPrint);
    window.removeEventListener('beforeprint', onBeforePrint);
    try {
      document.title = previousTitle;
    } catch {}
    try {
      printRoot.remove();
      printStyle.remove();
    } catch {}
  };

  let beforePrintFired = false;
  const onBeforePrint = () => {
    beforePrintFired = true;
  };
  const onAfterPrint = () => {
    cleanup();
  };

  window.addEventListener('beforeprint', onBeforePrint);
  window.addEventListener('afterprint', onAfterPrint);

  const isInsideIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const startMs = performance.now();
  let printThrew = false;

  try {
    window.focus();
    window.print();
  } catch (err) {
    printThrew = true;
    console.warn('Erro ou bloqueio ao chamar window.print():', err);
  }

  const elapsedMs = performance.now() - startMs;

  // Se estiver dentro de um iframe com sandbox (ex: Preview sem allow-modals),
  // window.print() retorna imediatamente sem disparar beforeprint.
  // Nesse caso, faz fallback automático gerando e baixando o PDF A4 pronto para imprimir.
  if (
    options?.fallbackToPdfOnFailure !== false &&
    (printThrew || (isInsideIframe && !beforePrintFired && elapsedMs < 100))
  ) {
    cleanup();
    void exportToPdf(elementId, documentTitle, options);
    return;
  }

  // Fallback de segurança para navegadores que não disparam afterprint após fechar o diálogo
  setTimeout(cleanup, 60000);
}

/**
 * Gera download real de arquivo PDF a partir de um elemento HTML,
 * com sanitização automática de cores modernas (oklch/oklab/color-mix) do Tailwind v4
 * e proteção contra travamentos.
 */
export async function exportToPdf(
  elementId: string,
  filename = 'documento-vetgo.pdf',
  options?: PrintOptions
): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Elemento #${elementId} não encontrado para exportToPdf.`);
    return false;
  }

  const cleanName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const orientation = options?.orientation || 'portrait';
  const margin =
    orientation === 'landscape'
      ? ([8, 8, 8, 8] as [number, number, number, number])
      : ([10, 10, 10, 10] as [number, number, number, number]);

  const opt = {
    margin,
    filename: cleanName,
    image: { type: 'jpeg' as const, quality: 0.96 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: orientation === 'landscape' ? 1200 : 800,
      onclone: (clonedDoc: Document, clonedElement: HTMLElement) => {
        sanitizeClonedTreeForPdf(clonedDoc, clonedElement);
      },
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation }
  };

  try {
    const savePromise = html2pdf().set(opt).from(element).save();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Tempo limite ao gerar PDF excedido')), 15000)
    );
    await Promise.race([savePromise, timeoutPromise]);
    return true;
  } catch (err) {
    console.error('Erro ao gerar PDF via html2pdf:', err);
    return false;
  } finally {
    try {
      document.querySelectorAll('.html2pdf__overlay').forEach((overlay) => overlay.remove());
    } catch {}
  }
}
