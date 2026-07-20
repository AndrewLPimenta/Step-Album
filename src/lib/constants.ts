import type {
  AlbumStatus,
  AlbumType,
  ProblemType,
  UserRole,
} from "@/types/database";

export const ALBUM_VALUES: Record<AlbumType, number> = {
  colab: 15,
  faculdade: 20,
  especial: 25,
  medicina: 75,
};

export const ALBUM_TYPE_LABELS: Record<AlbumType, string> = {
  colab: "Colab",
  faculdade: "Faculdade",
  especial: "Especial",
  medicina: "Medicina",
};

export const ALBUM_STATUS_LABELS: Record<AlbumStatus, string> = {
  baixado: "Baixado",
  editando: "Editando",
  descartado: "Descartado",
  montado: "Montado",
  enviado: "Enviado",
  concluido: "Concluído",
  fotos_insuficientes: "Fotos insuficientes",
  duplicado: "Cópia / Duplicado",
};

export const ALBUM_STATUS_ORDER: AlbumStatus[] = [
  "baixado",
  "descartado",
  "editando",
  "montado",
  "enviado",
  "concluido",
  "fotos_insuficientes",
  "duplicado",
];

export const INUTILIZAVEL_STATUSES: AlbumStatus[] = [
  "fotos_insuficientes",
  "duplicado",
];

export const PROBLEM_LABELS: Record<ProblemType, string> = {
  formando_duplicado: "Formando duplicado na plataforma",
  fotos_insuficientes: "Fotos insuficientes",
  erro_download: "Erro no download",
  arquivos_corrompidos: "Arquivos corrompidos",
  outro: "Outro",
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  diagramador: "Diagramador",
};

export const ALL_ALBUM_TYPES: AlbumType[] = [
  "colab",
  "faculdade",
  "especial",
  "medicina",
];

export const ALL_ALBUM_STATUSES: AlbumStatus[] = [
  "baixado",
  "descartado",
  "editando",
  "montado",
  "enviado",
  "concluido",
  "fotos_insuficientes",
  "duplicado",
];

// Valor fixo pago ao diagramador por álbum produzido (independe do valor cobrado do cliente)
export const DIAGRAMADOR_PAYOUTS: Record<AlbumType, number> = {
  colab: 10,
  faculdade: 15,
  especial: 20,
  medicina: 50,
};

export const ALL_PROBLEM_TYPES: ProblemType[] = [
  "formando_duplicado",
  "fotos_insuficientes",
  "erro_download",
  "arquivos_corrompidos",
  "outro",
];

export type GoalType = "valor" | "albuns";

export const ALL_GOAL_TYPES: GoalType[] = ["valor", "albuns"];

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  valor: "Valor a receber (R$)",
  albuns: "Quantidade de álbuns",
};

export type ArquivoCategoria = "contrato" | "tutorial" | "modelo" | "outro";

export const ALL_ARQUIVO_CATEGORIAS: ArquivoCategoria[] = [
  "contrato",
  "tutorial",
  "modelo",
  "outro",
];

export const ARQUIVO_CATEGORIA_LABELS: Record<ArquivoCategoria, string> = {
  contrato: "Contratos",
  tutorial: "Tutoriais",
  modelo: "Modelos",
  outro: "Outros",
};

export const ARQUIVO_MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB, matches the Storage bucket limit
