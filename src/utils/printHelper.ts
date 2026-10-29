// Vetgo Isolated Print & PDF Engine
// Garante impressão A4 impecável e geração de PDFs reais em qualquer navegador e dispositivo móvel,
// eliminando travamentos em iframes/sandbox, fundos escuros de modais e perda de estilos em produção.

// @ts-ignore
import html2pdf from 'html2pdf.js';

export interface PrintOptions {
  orientation?: 'portrait' | 'landscape';
  margin?: string;
  fallbackToPdfOnFailure?: boolean;
}

/**
 * Coleta todas as regras CSS ativas na página para injeção síncrona no documento de impressão,
 * garantindo que classes utilitárias do Tailwind e estilos compilados nunca fiquem faltando em produção.
 */
function getActiveStylesheets(): string {
  let cssText = '';

  // 1. Tenta extrair diretamente as regras CSS compiladas (funciona em produção e evita atraso de rede)
  try {
    const sheets = Array.from(document.styleSheets);
    for (const sheet of sheets) {
      try {
        const rules = Array.from(sheet.cssRules || []);
        for (const rule of rules) {
          cssText += rule.cssText + '\n';
        }
      } catch {
        // Ignora stylesheets de domínios externos protegidos por CORS
      }
    }
  } catch (e) {
    console.warn('Não foi possível ler styleSheets diretamente:', e);
  }

  // 2. Coleta tags <link> e <style> existentes como garantia adicional
  const htmlTags = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((el) => el.outerHTML)
    .join('\n');

  return `
    ${htmlTags}
    ${cssText ? `<style type="text/css" id="vetgo-inlined-print-styles">${cssText}</style>` : ''}
  `;
}

/**
 * Imprime um elemento HTML de forma isolada, limpa e sem travamento.
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
    } catch {
      // Ignora erro se bloqueado
    }
    return;
  }

  // Verifica se o ambiente atual está em um iframe (ex: preview do AI Studio)
  const isInsideIframe = window.self !== window.top;

  // Remove iframe anterior de impressão se existir
  const oldFrame = document.getElementById('vetgo-print-iframe');
  if (oldFrame) {
    try {
      oldFrame.remove();
    } catch {}
  }

  // Cria iframe isolado com dimensões reais e fora da visão do usuário.
  // IMPORTANTE: Chrome e Chromium travam a fila de impressão se o iframe tiver width:0, height:0 ou visibility:hidden!
  const iframe = document.createElement('iframe');
  iframe.id = 'vetgo-print-iframe';
  iframe.setAttribute('title', 'Vetgo Print Frame');
  iframe.setAttribute(
    'style',
    'position: fixed; top: 0; left: 0; width: 1024px; height: 768px; opacity: 0; pointer-events: none; border: none; z-index: -99999;'
  );
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    if (options?.fallbackToPdfOnFailure !== false) {
      exportToPdf(elementId, documentTitle, options);
    } else {
      window.print();
    }
    return;
  }

  const orientation = options?.orientation || 'portrait';
  const pageMargin = options?.margin || (orientation === 'landscape' ? '8mm 10mm 8mm 10mm' : '10mm 12mm 12mm 12mm');
  const stylesBlock = getActiveStylesheets();

  // Clona o HTML e garante que tudo seja visível
  const contentHtml = sourceEl.innerHTML;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>${documentTitle}</title>
        ${stylesBlock}
        <style>
          @page {
            size: A4 ${orientation};
            margin: ${pageMargin};
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            overflow: visible !important;
            width: 100% !important;
          }
          /* Garante que áreas com rolagem (overflow-x/y) fiquem 100% visíveis e não cortem conteúdo na impressão */
          div, section, main, article, table, tbody, thead, tr {
            overflow: visible !important;
            max-height: none !important;
          }
          table {
            border-collapse: collapse !important;
            page-break-inside: auto !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .printable-document, .printable-anesthesia-landscape {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 auto !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          /* Remove barras de rolagem */
          ::-webkit-scrollbar {
            display: none !important;
          }
        </style>
      </head>
      <body>
        <div class="printable-document">
          ${contentHtml}
        </div>
      </body>
    </html>
  `);
  doc.close();

  // Flag para garantir execução ÚNICA de triggerPrint e evitar múltiplos diálogos que travam a aba
  let hasTriggered = false;

  const cleanupIframe = () => {
    setTimeout(() => {
      try {
        const frame = document.getElementById('vetgo-print-iframe');
        if (frame) frame.remove();
      } catch {}
    }, 2000);
  };

  const executePrint = () => {
    if (hasTriggered) return;
    hasTriggered = true;

    try {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();

        // Configura limpeza pós-impressão
        iframe.contentWindow.onafterprint = cleanupIframe;

        // Dispara diálogo de impressão nativo
        iframe.contentWindow.print();
        cleanupIframe();
      } else {
        throw new Error('Janela do iframe indisponível');
      }
    } catch (err) {
      console.warn('Erro ou bloqueio na impressão nativa do iframe:', err);
      // Se estiver em iframe/preview ou falhar, gera o PDF diretamente sem travar a interface
      if (isInsideIframe || options?.fallbackToPdfOnFailure !== false) {
        exportToPdf(elementId, documentTitle, options);
      } else {
        try {
          window.print();
        } catch {}
      }
      cleanupIframe();
    }
  };

  // Aguarda carregamento de imagens e fontes antes de disparar
  const waitForReady = () => {
    const images = Array.from(doc.images || []);
    const uncompletedImages = images.filter((img) => !img.complete);

    const imagePromises = uncompletedImages.map(
      (img) =>
        new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
          setTimeout(resolve, 800); // timeout de segurança
        })
    );

    const fontPromise = (doc as any).fonts?.ready || Promise.resolve();

    Promise.all([...imagePromises, fontPromise])
      .then(() => {
        setTimeout(executePrint, 250);
      })
      .catch(() => {
        setTimeout(executePrint, 350);
      });
  };

  if (iframe.contentWindow) {
    if (doc.readyState === 'complete') {
      waitForReady();
    } else {
      iframe.contentWindow.onload = waitForReady;
      // Timeout limite caso onload não dispare
      setTimeout(() => {
        if (!hasTriggered) waitForReady();
      }, 700);
    }
  } else {
    executePrint();
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
    console.warn(`Elemento #${elementId} não encontrado para exportToPdf.`);
    return;
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
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: orientation === 'landscape' ? 1200 : 800
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation }
  };

  try {
    await html2pdf().set(opt).from(element).save();
  } catch (err) {
    console.error('Erro ao gerar PDF via html2pdf:', err);
  }
}
