// Vetgo Isolated Print Engine
// Garante impressão A4 impecável em qualquer navegador, dispositivo móvel e desktop,
// eliminando fundos de modais, menus laterais e cabeçalhos da página.

export function printElement(elementId: string, documentTitle = 'Prontuario_Veterinario_Vetgo'): void {
  const sourceEl = document.getElementById(elementId);
  if (!sourceEl) {
    // Fallback: tenta imprimir a janela atual
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
            size: A4 portrait;
            margin: 10mm 12mm 12mm 12mm;
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
