// Vetgo Isolated Print & PDF Engine
// Garante impressão A4 impecável e geração de PDFs reais em qualquer navegador e dispositivo móvel,
// eliminando fundos escuros de modais, menus laterais e cabeçalhos da página.

// @ts-ignore
import html2pdf from 'html2pdf.js';

export interface PrintOptions {
  orientation?: 'portrait' | 'landscape';
  margin?: string;
}

export function printElement(
  elementId: string,
  documentTitle = 'Documento_Veterinario_Vetgo',
  options?: PrintOptions
): void {
  const sourceEl = document.getElementById(elementId);
  if (!sourceEl) {
    window.print();
    return;
  }

  // Remove iframe anterior de impressão se existir
  const oldFrame = document.getElementById('vetgo-print-iframe');
  if (oldFrame) {
    oldFrame.remove();
  }

  // Cria um iframe invisível isolado para impressão
  const iframe = document.createElement('iframe');
  iframe.id = 'vetgo-print-iframe';
  iframe.setAttribute(
    'style',
    'position: fixed; right: 0; bottom: 0; width: 0; height: 0; border: 0; visibility: hidden;'
  );
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  // Coleta todas as folhas de estilo da página atual
  const styleTags = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((el) => el.outerHTML)
    .join('\n');

  const orientation = options?.orientation || 'portrait';
  const pageMargin = options?.margin || (orientation === 'landscape' ? '8mm 10mm 8mm 10mm' : '10mm 12mm 12mm 12mm');

  // Monta o HTML completo dentro do iframe isolado
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>${documentTitle}</title>
        ${styleTags}
        <style>
          @page {
            size: A4 ${orientation};
            margin: ${pageMargin};
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          .break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .printable-document {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 auto !important;
            max-width: 100% !important;
            width: 100% !important;
          }
        </style>
      </head>
      <body>
        <div class="printable-document">
          ${sourceEl.innerHTML}
        </div>
      </body>
    </html>
  `);
  doc.close();

  // Aguarda carregar estilos e dispara impressão
  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      window.print();
    }
  };

  if (iframe.contentWindow) {
    iframe.contentWindow.onload = () => {
      setTimeout(triggerPrint, 300);
    };
    // Fallback de segurança se onload já tiver disparado
    setTimeout(triggerPrint, 600);
  } else {
    window.print();
  }
}

/**
 * Gera download real de arquivo PDF a partir de um elemento HTML
 */
export async function exportToPdf(
  elementId: string,
  filename = 'documento-vetgo.pdf',
  options?: PrintOptions
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    printElement(elementId, filename, options);
    return;
  }

  const cleanName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const orientation = options?.orientation || 'portrait';
  const margin = orientation === 'landscape' ? ([8, 8, 8, 8] as [number, number, number, number]) : ([10, 10, 10, 10] as [number, number, number, number]);

  const opt = {
    margin,
    filename: cleanName,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation }
  };

  try {
    await html2pdf().set(opt).from(element).save();
  } catch (err) {
    console.warn('Erro ao gerar PDF direto via html2pdf, acionando impressão isolada:', err);
    printElement(elementId, cleanName, options);
  }
}
