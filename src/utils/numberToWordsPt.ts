/**
 * Converte valores monetários em reais para texto por extenso em português.
 * Exemplo: 250.50 -> "duzentos e cinquenta reais e cinquenta centavos"
 */
export function numberToWordsBRL(value: number): string {
  if (value === 0) return 'zero reais';
  if (isNaN(value)) return '';

  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const especiais = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  function converterGrupo(n: number): string {
    if (n === 100) return 'cem';
    let res = '';
    const c = Math.floor(n / 100);
    const restoC = n % 100;
    const d = Math.floor(restoC / 10);
    const u = restoC % 10;

    if (c > 0) {
      res += centenas[c];
    }

    if (restoC >= 10 && restoC <= 19) {
      if (res) res += ' e ';
      res += especiais[restoC - 10];
    } else {
      if (d > 0) {
        if (res) res += ' e ';
        res += dezenas[d];
      }
      if (u > 0) {
        if (res) res += ' e ';
        res += unidades[u];
      }
    }
    return res;
  }

  const inteiro = Math.floor(Math.abs(value));
  const centavos = Math.round((Math.abs(value) - inteiro) * 100);

  let partes: string[] = [];

  if (inteiro > 0) {
    const milhares = Math.floor(inteiro / 1000);
    const restoMil = inteiro % 1000;

    if (milhares > 0) {
      if (milhares === 1) {
        partes.push('mil');
      } else {
        partes.push(`${converterGrupo(milhares)} mil`);
      }
    }

    if (restoMil > 0) {
      partes.push(converterGrupo(restoMil));
    }

    const extensoInteiro = partes.join(' e ');
    const labelReais = inteiro === 1 ? 'real' : 'reais';
    partes = [`${extensoInteiro} ${labelReais}`];
  }

  if (centavos > 0) {
    const extensoCentavos = converterGrupo(centavos);
    const labelCentavos = centavos === 1 ? 'centavo' : 'centavos';
    partes.push(`${extensoCentavos} ${labelCentavos}`);
  }

  const resultado = partes.join(' e ');
  return resultado ? resultado.charAt(0).toUpperCase() + resultado.slice(1) : '';
}
