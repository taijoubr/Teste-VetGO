// Gerador de Payload PIX Padrão Banco Central do Brasil (BR Code / EMVCo)

function formatTLV(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

// Remove acentos e caracteres especiais para compatibilidade bancária estrita
function normalizeText(text: string, maxLength: number): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .substring(0, maxLength);
}

// Cálculo do CRC16-CCITT (Polinômio 0x1021, Init 0xFFFF)
function calculateCRC16(payload: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export interface PixPayloadOptions {
  pixKey: string;
  receiverName: string;
  city: string;
  amount?: number;
  txId?: string;
  description?: string;
}

export function generatePixPayload(options: PixPayloadOptions): string {
  const { pixKey, receiverName, city, amount, txId = '***' } = options;

  const cleanKey = pixKey.trim();
  const cleanName = normalizeText(receiverName || 'VETERINARIO', 25) || 'VETERINARIO';
  const cleanCity = normalizeText(city || 'BRASIL', 15) || 'BRASIL';
  const cleanTxId = normalizeText(txId, 25) || '***';

  // ID 00: Payload Format Indicator
  let payload = formatTLV('00', '01');

  // ID 26: Merchant Account Information (PIX)
  const gui = formatTLV('00', 'br.gov.bcb.pix');
  const key = formatTLV('01', cleanKey);
  payload += formatTLV('26', `${gui}${key}`);

  // ID 52: Merchant Category Code
  payload += formatTLV('52', '0000');

  // ID 53: Transaction Currency (986 = Real brasileiro)
  payload += formatTLV('53', '986');

  // ID 54: Transaction Amount (se especificado)
  if (amount && amount > 0) {
    const formattedAmount = amount.toFixed(2);
    payload += formatTLV('54', formattedAmount);
  }

  // ID 58: Country Code
  payload += formatTLV('58', 'BR');

  // ID 59: Merchant Name
  payload += formatTLV('59', cleanName);

  // ID 60: Merchant City
  payload += formatTLV('60', cleanCity);

  // ID 62: Additional Data Field (TxID)
  const txIdField = formatTLV('05', cleanTxId);
  payload += formatTLV('62', txIdField);

  // ID 63: CRC16
  const payloadWithCRCId = `${payload}6304`;
  const crc = calculateCRC16(payloadWithCRCId);

  return `${payloadWithCRCId}${crc}`;
}
