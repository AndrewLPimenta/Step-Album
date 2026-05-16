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
};

export const ALBUM_STATUS_ORDER: AlbumStatus[] = [
  "baixado",
  "descartado",
  "editando",
  "montado",
  "enviado",
  "concluido",
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
];

export const ALL_PROBLEM_TYPES: ProblemType[] = [
  "formando_duplicado",
  "fotos_insuficientes",
  "erro_download",
  "arquivos_corrompidos",
  "outro",
];
