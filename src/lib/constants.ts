import {
  LayoutDashboard,
  Wallet,
  Users as UsersIcon,
  FileImage,
  ListTodo,
  Target,
  Paperclip,
  type LucideIcon,
} from "lucide-react";
import type {
  AlbumStatus,
  AlbumType,
  ProblemType,
  UserRole,
} from "@/types/database";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/albums", label: "Álbuns", icon: FileImage },
  { href: "/fila", label: "Fila", icon: ListTodo },
  { href: "/financial", label: "Financeiro", icon: Wallet },
  { href: "/metas", label: "Metas", icon: Target },
  { href: "/arquivos", label: "Arquivos", icon: Paperclip },
  { href: "/users", label: "Usuários", icon: UsersIcon, adminOnly: true },
];

export const ALBUM_VALUES: Record<AlbumType, number> = {
  colab: 15,
  faculdade: 20,
  especial: 25,
  medicina: 70,
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

// Inline pill colors (bg + text, no border) — used by fila-queue and the
// fila page's per-user status chips. StatusBadge has its own bordered look
// and is intentionally not merged into this.
export const ALBUM_STATUS_STYLES: Record<AlbumStatus, string> = {
  baixado: "bg-muted text-muted-foreground",
  descartado: "bg-[hsl(var(--brand-amber)/0.12)] text-[hsl(var(--brand-amber))]",
  editando: "bg-[hsl(var(--brand-blue)/0.12)] text-[hsl(var(--brand-blue))]",
  montado: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  enviado: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  concluido: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  fotos_insuficientes: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  duplicado: "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400",
};

// Kaz's public download endpoint — takes the numeric id (kaz_id with any
// "row_" prefix stripped).
export const KAZ_DOWNLOAD_URL = (numericId: string) =>
  `https://api-php.kazformaturas.com.br/apis/download_formando/${numericId}`;

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

export type ArquivoCategoria =
  | "contrato"
  | "tutorial"
  | "modelo"
  | "outro"
  | "software"
  | "automações";

export const ALL_ARQUIVO_CATEGORIAS: ArquivoCategoria[] = [
  "contrato",
  "tutorial",
  "modelo",
  "software",
  "automações",
  "outro",
];

export const ARQUIVO_CATEGORIA_LABELS: Record<ArquivoCategoria, string> = {
  contrato: "Contratos",
  tutorial: "Tutoriais",
  modelo: "Modelos",
  software: "Softwares",
  "automações": "Automações",
  outro: "Outros",
};

export const ARQUIVO_MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB, matches the Storage bucket limit
