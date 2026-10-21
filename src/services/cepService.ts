// Serviço de consulta e formatação de CEP com redundância (ViaCEP + BrasilAPI)

export interface AddressFromCep {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
  complement?: string;
}

export interface CepLookupResult {
  success: boolean;
  data?: AddressFromCep;
  error?: string;
}

/**
 * Formata string como CEP brasileiro: 00000-000
 */
export function formatCEP(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/**
 * Busca endereço pelo CEP com timeout e fallback automático
 * 1º Provedor: ViaCEP (rápido e padrão nacional)
 * 2º Provedor (reserva): BrasilAPI (alta disponibilidade)
 */
export async function fetchAddressByCep(rawCep: string): Promise<CepLookupResult> {
  const cleanCep = rawCep.replace(/\D/g, '');

  if (cleanCep.length !== 8) {
    return {
      success: false,
      error: 'O CEP deve conter 8 dígitos numéricos.',
    };
  }

  // 1ª Tentativa: ViaCEP
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (!data.erro) {
        return {
          success: true,
          data: {
            street: data.logradouro || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || '',
            postal_code: formatCEP(cleanCep),
            complement: data.complemento || '',
          },
        };
      }
    }
  } catch (e) {
    // ViaCEP falhou ou deu timeout, prossegue para o fallback BrasilAPI
  }

  // 2ª Tentativa: BrasilAPI (Fallback)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCep}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.city) {
        return {
          success: true,
          data: {
            street: data.street || '',
            neighborhood: data.neighborhood || '',
            city: data.city || '',
            state: data.state || '',
            postal_code: formatCEP(cleanCep),
            complement: '',
          },
        };
      }
    }
  } catch (e) {
    // Fallback também falhou
  }

  return {
    success: false,
    error: 'CEP não encontrado. Preencha os dados do endereço manualmente.',
  };
}
