import { Species } from '../types';

export interface SpeciesConfig {
  species: Species;
  subTypeLabel: string; // Ex: 'Raça', 'Espécie / Variedade', etc.
  coatLabel: string; // Ex: 'Cor / Pelagem', 'Coloração / Plumagem', etc.
  defaultBreeds: string[];
  popularBreeds?: string[];
  requiresScientificName?: boolean;
  breedLabel?: string;
  breedPlaceholder?: string;
  coatPlaceholder?: string;
  showScientificName?: boolean;
}

export const SPECIES_CONFIGS: Record<Species, SpeciesConfig> = {
  Canina: {
    species: 'Canina',
    subTypeLabel: 'Raça',
    coatLabel: 'Cor / Pelagem',
    popularBreeds: [
      'Sem Raça Definida (SRD)',
      'Shih Tzu',
      'Spitz Alemão (Lulu da Pomerânia)',
      'Yorkshire Terrier',
      'Poodle',
      'Bulldog Francês',
      'Golden Retriever',
      'Pinscher'
    ],
    defaultBreeds: [
      'Sem Raça Definida (SRD)',
      'Akita',
      'Basset Hound',
      'Beagle',
      'Bernese Mountain Dog',
      'Bichon Frisé',
      'Border Collie',
      'Boston Terrier',
      'Boxer',
      'Bulldog Francês',
      'Bulldog Inglês',
      'Bull Terrier',
      'Cane Corso',
      'Cavalier King Charles Spaniel',
      'Chihuahua',
      'Chow Chow',
      'Cocker Spaniel Inglês',
      'Dachshund (Teckel / Salsicha)',
      'Dálmata',
      'Doberman',
      'Dogue Alemão',
      'Fila Brasileiro',
      'Fox Paulistinha (Terrier Brasileiro)',
      'Golden Retriever',
      'Husky Siberiano',
      'Jack Russell Terrier',
      'Labrador Retriever',
      'Lhasa Apso',
      'Maltês',
      'Mastiff',
      'Pastor Alemão',
      'Pastor Australiano',
      'Pastor Belga (Malinois)',
      'Pastor de Shetland',
      'Pastor Suíço',
      'Pequinês',
      'Pinscher',
      'Pitbull (American Pit Bull Terrier)',
      'Pointer Inglês',
      'Poodle (Toy / Miniatura / Médio / Gigante)',
      'Pug',
      'Rottweiler',
      'Samoyeda',
      'Schnauzer (Miniatura / Standard / Gigante)',
      'Setter Irlandês',
      'Shar-pei',
      'Shiba Inu',
      'Shih Tzu',
      'Spitz Alemão (Lulu da Pomerânia)',
      'Staffordshire Bull Terrier',
      'Weimaraner',
      'West Highland White Terrier',
      'Whippet',
      'Yorkshire Terrier'
    ]
  },
  Felina: {
    species: 'Felina',
    subTypeLabel: 'Raça',
    coatLabel: 'Cor / Pelagem',
    popularBreeds: [
      'Sem Raça Definida (SRD)',
      'Siamês',
      'Persa',
      'Maine Coon',
      'Angorá Brasileiro'
    ],
    defaultBreeds: [
      'Sem Raça Definida (SRD)',
      'Abissínio',
      'American Shorthair',
      'Angorá Brasileiro',
      'Azul Russo (Russian Blue)',
      'Bengal',
      'Birmanês (Sagrado da Birmânia)',
      'Bombay',
      'British Shorthair',
      'Burmês',
      'Chartreux',
      'Cornish Rex',
      'Devon Rex',
      'Exótico (Exotic Shorthair)',
      'Himalaio',
      'Maine Coon',
      'Mau Egípcio',
      'Munchkin',
      'Norueguês da Floresta',
      'Oriental',
      'Persa',
      'Ragdoll',
      'Savanah',
      'Scottish Fold',
      'Selkirk Rex',
      'Siamês',
      'Siberiano',
      'Snowshoe',
      'Somali',
      'Sphynx',
      'Tonquinês'
    ]
  },
  Equina: {
    species: 'Equina',
    subTypeLabel: 'Raça',
    coatLabel: 'Pelagem',
    defaultBreeds: [
      'Mangalarga Marchador',
      'Quarto de Milha',
      'Crioulo',
      'Campolina',
      'Puro Sangue Inglês (PSI)',
      'Puro Sangue Lusitano (PSL)',
      'Árabe',
      'Brasileiro de Hipismo',
      'Appaloosa',
      'Sem Raça Definida (Mestiço)',
      'Outra'
    ]
  },
  Bovina: {
    species: 'Bovina',
    subTypeLabel: 'Raça',
    coatLabel: 'Pelagem',
    defaultBreeds: [
      'Nelore',
      'Holandês',
      'Girolando',
      'Gir Leiteiro',
      'Angus',
      'Brahman',
      'Senepol',
      'Brangus',
      'Mestiço',
      'Outra'
    ]
  },
  Ovina: {
    species: 'Ovina',
    subTypeLabel: 'Raça',
    coatLabel: 'Cor / Pelagem',
    defaultBreeds: ['Santa Inês', 'Dorper', 'Texel', 'Morada Nova', 'Suffolk', 'Ile de France', 'Mestiço', 'Outra']
  },
  Caprina: {
    species: 'Caprina',
    subTypeLabel: 'Raça',
    coatLabel: 'Pelagem',
    defaultBreeds: ['Boer', 'Saanen', 'Anglo-Nubiana', 'Toggenburg', 'Pardo Alpina', 'Mestiço', 'Outra']
  },
  Suína: {
    species: 'Suína',
    subTypeLabel: 'Raça / Linhagem',
    coatLabel: 'Pelagem',
    defaultBreeds: ['Landrace', 'Large White', 'Duroc', 'Pietrain', 'Mini Pig / Pet', 'Caipira / Mestiço', 'Outra']
  },
  Lagomorfa: {
    species: 'Lagomorfa',
    subTypeLabel: 'Raça / Variedade',
    coatLabel: 'Cor / Pelagem',
    defaultBreeds: [
      'Mini Lionhead',
      'Mini Netherland Dwarf',
      'Mini Lop / Fuzzy Lop',
      'Holandês',
      'Nova Zelândia',
      'Flemish Giant (Gigante de Flandres)',
      'Mestiço',
      'Outra'
    ]
  },
  Roedores: {
    species: 'Roedores',
    subTypeLabel: 'Espécie / Variedade',
    coatLabel: 'Cor / Características',
    defaultBreeds: [
      'Porquinho-da-Índia (Cavia porcellus)',
      'Hamster Sírio',
      'Hamster Anão Russo',
      'Chinchila (Chinchilla lanigera)',
      'Rato Wistar / Twister (Rattus norvegicus)',
      'Gerbil / Esquilo-da-Mongólia',
      'Camundongo (Mus musculus)',
      'Degus',
      'Outra'
    ]
  },
  Aves: {
    species: 'Aves',
    subTypeLabel: 'Espécie / Variedade',
    coatLabel: 'Coloração / Plumagem',
    defaultBreeds: [
      'Calopsita (Nymphicus hollandicus)',
      'Periquito Australiano',
      'Agapornis',
      'Canário Belga',
      'Papagaio Verdadeiro (Amazona aestiva)',
      'Arara Canindé / Vermelha',
      'Cacatua',
      'Ringneck',
      'Galinha de Raça / Ornamental',
      'Pato / Ganso',
      'Outra'
    ]
  },
  Répteis: {
    species: 'Répteis',
    subTypeLabel: 'Espécie / Variedade',
    coatLabel: 'Coloração / Padrão',
    defaultBreeds: [
      'Jabuti-piranga (Chelonoidis carbonarius)',
      'Jabuti-tinga',
      'Tigre-d’água (Trachemys dorbigni)',
      'Pogona / Dragão Barbudo',
      'Gecko Leopardo (Eublepharis macularius)',
      'Iguana Verde',
      'Jiboia (Boa constrictor)',
      'Corn Snake (Cobra-do-milho)',
      'Teiú',
      'Outra'
    ]
  },
  Anfíbios: {
    species: 'Anfíbios',
    subTypeLabel: 'Espécie / Variedade',
    coatLabel: 'Coloração / Padrão',
    defaultBreeds: [
      'Axolote (Ambystoma mexicanum)',
      'Sapo Cururu (Rhinella diptycha)',
      'Rã Touro',
      'Perereca de Olhos Vermelhos',
      'Pacman Frog (Ceratophrys)',
      'Outra'
    ]
  },
  Mustelídeos: {
    species: 'Mustelídeos',
    subTypeLabel: 'Espécie / Variedade',
    coatLabel: 'Cor / Pelagem',
    defaultBreeds: ['Furão / Ferret (Mustela putorius furo)', 'Outra']
  },
  'Silvestres/Exóticos': {
    species: 'Silvestres/Exóticos',
    subTypeLabel: 'Nome Popular + Espécie / Científico',
    coatLabel: 'Cor / Características',
    requiresScientificName: true,
    defaultBreeds: [
      'Ouriço Pigmeu Africano (Hedgehog)',
      'Petauro do Açúcar (Sugar Glider)',
      'Macaco-prego (Sapajus)',
      'Sagui (Callithrix)',
      'Coelho Bravo / Silvestre',
      'Outra'
    ]
  },
  Outra: {
    species: 'Outra',
    subTypeLabel: 'Classificação / Raça',
    coatLabel: 'Cor / Características',
    defaultBreeds: ['Outra']
  }
};
