/**
 * Validação e formatação de CPF e CNPJ para o Vetgo
 * Conforme especificação:
 * - Validação matemática de dígitos verificadores (módulo 11)
 * - Máscara automática de digitação
 * - Campo opcional / permissão para deixar vazio quando não disponível
 * - Mensagem explicativa de que a validação matemática não substitui
 *   nem representa confirmação de regularidade ou existência junto à Receita Federal do Brasil.
 */

export const CPF_CNPJ_DISCLAIMER =
  'A validação é estritamente matemática baseada nos dígitos verificadores e não substitui nem representa confirmação de regularidade ou existência cadastral junto à Receita Federal do Brasil.';

/**
 * Remove caracteres não numéricos
 */
export function cleanDigits(value: string = ''): string {
  return value.replace(/\D/g, '');
}

/**
 * Formata CPF: 000.000.000-00
 */
export function formatCPF(value: string = ''): string {
  const digits = cleanDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Validação matemática de CPF (módulo 11)
 */
export function validateCPF(cpf: string = ''): { isValid: boolean; error?: string } {
  const digits = cleanDigits(cpf);

  // Permite vazio caso o usuário não disponha do documento no momento
  if (digits.length === 0) {
    return { isValid: true };
  }

  if (digits.length !== 11) {
    return { isValid: false, error: 'O CPF deve conter exatamente 11 dígitos numéricos.' };
  }

  // Bloqueia sequências de dígitos iguais repetidos (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(digits)) {
    return { isValid: false, error: 'CPF inválido (dígitos repetidos).' };
  }

  // 1º dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits.charAt(i), 10) * (10 - i);
  }
  let rest = 11 - (sum % 11);
  let digit1 = rest >= 10 ? 0 : rest;

  if (digit1 !== parseInt(digits.charAt(9), 10)) {
    return { isValid: false, error: 'Dígito verificador do CPF inválido.' };
  }

  // 2º dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits.charAt(i), 10) * (11 - i);
  }
  rest = 11 - (sum % 11);
  let digit2 = rest >= 10 ? 0 : rest;

  if (digit2 !== parseInt(digits.charAt(10), 10)) {
    return { isValid: false, error: 'Dígito verificador do CPF inválido.' };
  }

  return { isValid: true };
}

/**
 * Formata CNPJ: 00.000.000/0000-00
 */
export function formatCNPJ(value: string = ''): string {
  const digits = cleanDigits(value).slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

/**
 * Validação matemática de CNPJ (módulo 11)
 */
export function validateCNPJ(cnpj: string = ''): { isValid: boolean; error?: string } {
  const digits = cleanDigits(cnpj);

  if (digits.length === 0) {
    return { isValid: true };
  }

  if (digits.length !== 14) {
    return { isValid: false, error: 'O CNPJ deve conter exatamente 14 dígitos numéricos.' };
  }

  if (/^(\d)\1{13}$/.test(digits)) {
    return { isValid: false, error: 'CNPJ inválido (dígitos repetidos).' };
  }

  // 1º dígito verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits.charAt(i), 10) * weights1[i];
  }
  let rest = sum % 11;
  let digit1 = rest < 2 ? 0 : 11 - rest;

  if (digit1 !== parseInt(digits.charAt(12), 10)) {
    return { isValid: false, error: 'Dígito verificador do CNPJ inválido.' };
  }

  // 2º dígito verificador
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(digits.charAt(i), 10) * weights2[i];
  }
  rest = sum % 11;
  let digit2 = rest < 2 ? 0 : 11 - rest;

  if (digit2 !== parseInt(digits.charAt(13), 10)) {
    return { isValid: false, error: 'Dígito verificador do CNPJ inválido.' };
  }

  return { isValid: true };
}

/**
 * Formata telefone: (00) 00000-0000 ou (00) 0000-0000
 */
export function formatPhone(value: string = ''): string {
  const digits = cleanDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}
