import { ClinicalSnippet, ClinicalSnippetCategory } from '../types';

export const DEFAULT_CLINICAL_SNIPPETS: ClinicalSnippet[] = [
  // EXAME FÍSICO
  {
    id: 'ef_normal_geral',
    title: 'Exame Físico Geral Normal',
    category: 'EXAME_FISICO',
    shortcut: 'ef-normal',
    text: 'Mucosas normocoradas e úmidas, TPC < 2s. Linfonodos submandibulares, pré-escapulares e poplíteos simétricos, normotróficos e indolores. Ausculta cardiopulmonar límpida, ritmo sinusal regular, sem sopros ou ruídos adventícios. FC e FR fisiológicos para a espécie. Escore de condição corporal 5/9. Abdômen normotenso, indolor à palpação profunda, sem visceromegalias ou massas. Turgor cutâneo imediato (hidratação adequada).'
  },
  {
    id: 'ef_cardiorrespiratorio',
    title: 'Ausculta Cardiopulmonar Límpida',
    category: 'EXAME_FISICO',
    shortcut: 'ausculta-ok',
    text: 'Ausculta cardiopulmonar limpa e simétrica bilateralmente, ausência de estertores crepitantes, sibilos ou estridor traqueal. Sons cardíacos normofonéticos em 2 tempos, sem sopros audíveis. Pulso femoral forte, rítmico, simétrico e sincrônico com batimentos cardíacos.'
  },
  {
    id: 'ef_dermatite_otite',
    title: 'Dermatite e Otite Bilateral',
    category: 'EXAME_FISICO',
    shortcut: 'dermato-otite',
    text: 'Prurido moderado a severo em orelhas e extremidades. Presença de eritema cutâneo difuso, alopecia por atrito e escoriações por autoflagelo. Conduto auditivo externo bilateral com hiperemia marcante, estenose leve e acúmulo de exsudato ceruminoso escurecido fétido. Reflexo otopodal positivo.'
  },
  {
    id: 'ef_gastroenterite',
    title: 'Desidratação Leve e Desconforto Abdominal',
    category: 'EXAME_FISICO',
    shortcut: 'gastro-dor',
    text: 'Desidratação clínica estimada em 5-6%, leve retardo no retorno do turgor cutâneo e mucosa bucal discretamente pegajosa. Desconforto e tensão à palpação profunda em andar cranial abdominal. Alças intestinais com aumento de timpanismo e borborigmos aumentados. Ausência de corpos estranhos palpáveis.'
  },
  {
    id: 'ef_oftalmico',
    title: 'Avaliação Oftálmica Básica Normal',
    category: 'EXAME_FISICO',
    shortcut: 'olhos-ok',
    text: 'Olhos simétricos, reflexos pupilar fotomotor direto e consensual preservados bilateralmente. Reflexo de ameaça positivo em ambos os olhos. Ausência de blefarospasmo, epífora patológica ou secreção mucopurulenta. Córneas transparentes e límpidas.'
  },

  // ANAMNESE
  {
    id: 'ana_rotina_vacina',
    title: 'Rotina e Avaliação Vacinal',
    category: 'ANAMNESE',
    shortcut: 'rotina-vacina',
    text: 'Paciente trazido para consulta preventiva de rotina e atualização do protocolo vacinal anual. Tutor relata excelente apetite, ingestão hídrica normal, fezes e urina fisiológicas, ativo e responsivo em ambiente domiciliar. Sem episódios de êmese, diarreia, tosse ou espirros recentes.'
  },
  {
    id: 'ana_gastro_aguda',
    title: 'Histórico de Êmese e Diarreia Aguda',
    category: 'ANAMNESE',
    shortcut: 'ana-vomito',
    text: 'Histórico de episódios eméticos recorrentes iniciados há 24-48 horas, de conteúdo alimentar e bilioso, associados a fezes de consistência pastosa/líquida. Tutor relata hiporexia e apatia progressiva. Sem histórico conhecido de ingestão de corpo estranho ou substância tóxica.'
  },
  {
    id: 'ana_tosse_respiratorio',
    title: 'Tosse em Engasgo e Esforço',
    category: 'ANAMNESE',
    shortcut: 'ana-tosse',
    text: 'Queixa de acessos de tosse paroxística e seca, semelhante a engasgo, com piora noturna e após excitação física ou tração de coleira. Tutor nega dispneia evidente ou episódios de cianose em repouso.'
  },
  {
    id: 'ana_claudicacao',
    title: 'Claudicação Aguda de Membro',
    category: 'ANAMNESE',
    shortcut: 'ana-manco',
    text: 'Paciente apresenta claudicação de membro posterior sem apoio total de peso há cerca de 2 dias. Tutor relata relutância para subir escadas, pular no sofá e desconforto à manipulação da articulação.'
  },

  // PRÉ-ANESTÉSICO & CIRURGIA
  {
    id: 'ane_asa1_eletivo',
    title: 'Avaliação Pré-Anestésica ASA I (Eletivo)',
    category: 'ANESTESIA',
    shortcut: 'asa1-ok',
    text: 'Jejum alimentar de 8 horas e hídrico de 2 horas cumpridos e confirmados pelo tutor. Sem histórico de síncopes, convulsões ou cardiopatias. Paciente classificado como ASA I (hígido para procedimento cirúrgico eletivo). Exames laboratoriais pré-operatórios dentro dos limites fisiológicos.'
  },
  {
    id: 'ane_asa2_geriatrico',
    title: 'Avaliação Pré-Anestésica ASA II (Senil / Compensado)',
    category: 'ANESTESIA',
    shortcut: 'asa2-senil',
    text: 'Paciente classificado como risco anestésico ASA II devido à idade senil / doença sistêmica compensada. Confirmado jejum pré-operatório. Monitoração multiparamétrica contínua planejada com ECG, oximetria de pulso (SpO2), pressão arterial não invasiva e capnografia.'
  },
  {
    id: 'cir_pos_op_ok',
    title: 'Retorno Pós-Operatório: Cicatrização Perfeita',
    category: 'CIRURGIA',
    shortcut: 'posop-ok',
    text: 'Ferida cirúrgica em excelente processo de cicatrização. Bordas coaptadas, ausência de hematoma, seroma, secreção serossanguinolenta ou purulenta, sem deiscência de pontos. Animal ativo, normorréxico e sem dor à palpação local. Pontos cirúrgicos removidos com sucesso. Alta ambulatorial concedida.'
  },

  // CONDUTA & CUIDADOS
  {
    id: 'con_cuidados_pos_op',
    title: 'Orientações Pós-Operatórias e Colar Elizabetano',
    category: 'CONDUTA',
    shortcut: 'cuidados-posop',
    text: 'Repouso relativo por 10 dias. Uso ininterrupto de colar elizabetano ou roupa de proteção cirúrgica para evitar lambedura da ferida. Higienização local 2x ao dia com gaze embebida em Clorexidina 0,5% ou soro fisiológico. Retorno agendado em 10 dias para avaliação da cicatrização e retirada dos pontos de sutura.'
  },
  {
    id: 'con_gastro_dieta',
    title: 'Manejo de Gastroenterite e Hidratação',
    category: 'CONDUTA',
    shortcut: 'dieta-gastro',
    text: 'Instituída fluidoterapia de suporte. Prescritos antiemético, protetor de mucosa gástrica e probiótico conforme receita. Manejo dietético com alimentação de fácil digestão (Gastrointestinal / Frango cozido sem tempero com arroz) em pequenas porções fracionadas 4 a 6 vezes ao dia.'
  },
  {
    id: 'con_otite_limpeza',
    title: 'Protocolo Terapêutico de Otite Externa',
    category: 'CONDUTA',
    shortcut: 'tratamento-otite',
    text: 'Realizada limpeza mecânica inicial do conduto auditivo em consultório. Prescrita solução otológica com antibiótico, antifúngico e anti-inflamatório para aplicação a cada 12h por 14 dias. Reavaliação e otoscopia de controle agendada ao término do tratamento.'
  }
];

const STORAGE_CUSTOM_SNIPPETS_KEY = 'vetgo_custom_clinical_snippets';

/**
 * Loads all active snippets (built-in defaults + user created custom snippets).
 */
export function getAllClinicalSnippets(): ClinicalSnippet[] {
  let custom: ClinicalSnippet[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_SNIPPETS_KEY);
    if (raw) {
      custom = JSON.parse(raw);
    }
  } catch {}

  return [...DEFAULT_CLINICAL_SNIPPETS, ...custom];
}

/**
 * Saves or updates a custom snippet created by the veterinarian.
 */
export function saveCustomSnippet(snippet: Omit<ClinicalSnippet, 'id' | 'isCustom'> & { id?: string }): ClinicalSnippet {
  const fullSnippet: ClinicalSnippet = {
    ...snippet,
    id: snippet.id || `custom_snip_${Date.now()}`,
    isCustom: true,
  };

  try {
    let custom: ClinicalSnippet[] = [];
    const raw = localStorage.getItem(STORAGE_CUSTOM_SNIPPETS_KEY);
    if (raw) custom = JSON.parse(raw);

    const idx = custom.findIndex(s => s.id === fullSnippet.id);
    if (idx >= 0) {
      custom[idx] = fullSnippet;
    } else {
      custom.unshift(fullSnippet);
    }
    localStorage.setItem(STORAGE_CUSTOM_SNIPPETS_KEY, JSON.stringify(custom));
  } catch (e) {
    console.warn('Erro ao salvar snippet customizado:', e);
  }

  return fullSnippet;
}

/**
 * Removes a custom snippet.
 */
export function deleteCustomSnippet(id: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_SNIPPETS_KEY);
    if (raw) {
      const custom: ClinicalSnippet[] = JSON.parse(raw);
      const filtered = custom.filter(s => s.id !== id);
      localStorage.setItem(STORAGE_CUSTOM_SNIPPETS_KEY, JSON.stringify(filtered));
    }
  } catch {}
}
