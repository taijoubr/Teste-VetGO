/**
 * Utilitário de compressão e redimensionamento de imagens no cliente (navegador).
 * Evita PayloadTooLargeError e sobrecarga de armazenamento no backend e Firestore.
 */
export async function compressImage(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Se não for imagem, rejeita
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Arquivo não é uma imagem válida.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo de imagem.'));
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        return reject(new Error('Não foi possível obter os dados da imagem.'));
      }

      // Se for SVG, não precisa de compressão por canvas
      if (file.type === 'image/svg+xml') {
        return resolve(dataUrl);
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Erro ao carregar a imagem para compressão.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Mantém proporção respeitando dimensões máximas
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback se não suportar 2D context
          return resolve(dataUrl);
        }

        // Fundo transparente para PNG ou branco suave se for converter para JPEG
        const isPng = file.type === 'image/png';
        if (!isPng) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Gera dataURL comprimido: mantém PNG para preservar transparência, senão usa JPEG
        const outputType = isPng ? 'image/png' : 'image/jpeg';
        const compressedDataUrl = canvas.toDataURL(outputType, quality);
        resolve(compressedDataUrl);
      };
      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
  });
}
