import {
  LayoutDashboard,
  Wallet,
  Users as UsersIcon,
  FileImage,
  FolderOpen,
  Library,
  ListTodo,
  Target,
  Paperclip,
  CalendarRange,
  MonitorDown,
  HardDriveDownload,
  type AppIcon,
} from "@/lib/icons";
import type {
  AlbumStatus,
  AlbumType,
  ProblemType,
  UserRole,
} from "@/types/database";

export type NavGroup = "operacao" | "acompanhamento" | "recursos" | "sistema";

export const NAV_GROUP_ORDER: NavGroup[] = [
  "operacao",
  "acompanhamento",
  "recursos",
  "sistema",
];

export const NAV_GROUP_LABELS: Record<NavGroup, string> = {
  operacao: "Operação",
  acompanhamento: "Acompanhamento",
  recursos: "Recursos",
  sistema: "Sistema",
};

export interface NavItem {
  href: string;
  label: string;
  icon: AppIcon;
  group: NavGroup;
  criadorOnly?: boolean;
  /**
   * Ocupa um dos 4 slots fixos da barra inferior no mobile. O resto vai pro
   * sheet "Mais" — a barra tentava caber os 9-10 itens numa linha so', o que
   * dava ~37px por item num aparelho de 375px (abaixo dos 44px de alvo de
   * toque) e truncava os rotulos ate virarem ilegiveis.
   */
  primary?: boolean;
}

/**
 * Ordem = frequencia de uso, nao convencao. A /fila e' a tela que a equipe
 * abre todo dia; o /app (download do instalador desktop) e' aberto uma vez
 * na vida. Antes era uma lista plana com os quatro dominios intercalados.
 */
export const NAV_ITEMS: NavItem[] = [
  // Operação — o trabalho do dia
  { href: "/fila", label: "Fila", icon: ListTodo, group: "operacao", primary: true },
  { href: "/albums", label: "Álbuns", icon: FileImage, group: "operacao", primary: true },
  { href: "/sprint", label: "Sprint", icon: CalendarRange, group: "operacao", primary: true },
  // Acompanhamento — leitura, não operação
  { href: "/financial", label: "Financeiro", icon: Wallet, group: "acompanhamento", primary: true },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "acompanhamento" },
  { href: "/metas", label: "Metas", icon: Target, group: "acompanhamento" },
  // Recursos — material de apoio
  { href: "/arquivos", label: "Arquivos", icon: Paperclip, group: "recursos" },
  { href: "/transferencias", label: "Transferências", icon: HardDriveDownload, group: "recursos" },
  // Sistema — administração e instalação
  { href: "/users", label: "Usuários", icon: UsersIcon, group: "sistema", criadorOnly: true },
  { href: "/app", label: "App", icon: MonitorDown, group: "sistema" },
];

/** Itens visiveis para um papel, preservando a ordem de NAV_ITEMS. */
export function navItemsForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.criadorOnly || role === "criador");
}

/** Item do aside: um link direto ou um grupo que abre. */
export type SidebarNode =
  | { kind: "item"; href: string }
  | {
      kind: "group";
      id: string;
      label: string;
      icon: AppIcon;
      /** hrefs de NAV_ITEMS, na ordem em que aparecem dentro do grupo. */
      children: string[];
    };

/**
 * Estrutura e ordem do aside. Vive separada do NAV_ITEMS de proposito: la' a
 * ordem e' por dominio (e alimenta a barra inferior do mobile e o titulo do
 * header), aqui e' por leitura — primeiro o que se OLHA (Dashboard,
 * Financeiro, Metas), depois o que se ABRE pra trabalhar. Dez links soltos
 * numa coluna faziam a /fila e o /app terem o mesmo peso visual.
 *
 * O /app nao entra aqui: virou o rodape "Baixar app", que e' o que ele e' —
 * algo que se usa uma vez, nao um destino do menu.
 */
export const SIDEBAR_TREE: SidebarNode[] = [
  { kind: "item", href: "/dashboard" },
  { kind: "item", href: "/financial" },
  { kind: "item", href: "/metas" },
  {
    kind: "group",
    id: "recursos",
    label: "Recursos",
    icon: FolderOpen,
    children: ["/arquivos", "/transferencias"],
  },
  {
    kind: "group",
    id: "albums",
    label: "Álbuns",
    icon: Library,
    children: ["/fila", "/albums", "/sprint"],
  },
  { kind: "item", href: "/users" },
];

/** Rodape do aside — download do app de desktop. */
export const SIDEBAR_FOOTER_HREF = "/app";

/**
 * Titulo da pagina atual. Deriva do proprio NAV_ITEMS — antes o header tinha
 * um PAGE_LABELS separado com 7 entradas para 10 destinos, entao /sprint,
 * /transferencias e /app ficavam sem titulo nenhum, e a /fila aparecia como
 * "Fila" no menu e "Fila de Trabalho" no header.
 */
export function navLabelForPathname(pathname: string): string | undefined {
  return NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  )?.label;
}

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

// FONTE UNICA de cor de status. Antes existiam dois mapas — este e o
// STATUS_STYLES do status-badge.tsx — e eles se contradiziam: "montado" era
// roxo aqui e ambar la, "enviado" era verde aqui e roxo la. O mesmo status
// aparecia em duas cores dependendo da tela. Agora ha um mapa so'; o que
// varia entre /fila, /albums e o detalhe e' a FORMA (pilula, ponto, badge
// com contorno), nunca o tom.
//
// Os tokens seguem a ordem do fluxo de producao — idle -> active ->
// assembled -> sent -> done. Estados fora do fluxo (descartado, duplicado,
// fotos_insuficientes) usam excluded/problem justamente pra nao serem lidos
// como mais uma etapa do caminho normal.
export const ALBUM_STATUS_STYLES: Record<AlbumStatus, string> = {
  baixado: "bg-status-idle/10 text-status-idle",
  editando: "bg-status-active/10 text-status-active",
  montado: "bg-status-assembled/10 text-status-assembled",
  enviado: "bg-status-sent/10 text-status-sent",
  concluido: "bg-status-done/10 text-status-done",
  descartado: "bg-status-excluded/10 text-status-excluded",
  fotos_insuficientes: "bg-status-problem/10 text-status-problem",
  duplicado: "bg-status-excluded/10 text-status-excluded",
};

// Mesmas cores do mapa acima, com contorno — usado pelo StatusBadge no
// detalhe do album. Deriva do mesmo token, entao nao tem como divergir de
// matiz; so' muda o peso.
export const ALBUM_STATUS_BORDER_STYLES: Record<AlbumStatus, string> = {
  baixado: "bg-status-idle/10 text-status-idle border-status-idle/30",
  editando: "bg-status-active/10 text-status-active border-status-active/30",
  montado: "bg-status-assembled/10 text-status-assembled border-status-assembled/30",
  enviado: "bg-status-sent/10 text-status-sent border-status-sent/30",
  concluido: "bg-status-done/10 text-status-done border-status-done/30",
  descartado: "bg-status-excluded/10 text-status-excluded border-status-excluded/30",
  fotos_insuficientes: "bg-status-problem/10 text-status-problem border-status-problem/30",
  duplicado: "bg-status-excluded/10 text-status-excluded border-status-excluded/30",
};

// Ponto solido — usado no gatilho do StatusSelect na tabela /albums, que
// antes era a unica tela em que o status nao tinha nenhum sinal de cor.
export const ALBUM_STATUS_DOT: Record<AlbumStatus, string> = {
  baixado: "bg-status-idle",
  editando: "bg-status-active",
  montado: "bg-status-assembled",
  enviado: "bg-status-sent",
  concluido: "bg-status-done",
  descartado: "bg-status-excluded",
  fotos_insuficientes: "bg-status-problem",
  duplicado: "bg-status-excluded",
};

// FONTE UNICA de cor de tipo. Antes o type-badge.tsx e o sprint-board.tsx
// tinham mapas proprios que nao batiam em NENHUM dos quatro tipos —
// faculdade era azul num e ambar no outro, medicina era roxo num e azul no
// outro. Aqui a ordem de intensidade acompanha o valor cobrado do cliente
// (colab 15 -> faculdade 20 -> especial 25 -> medicina 70).
export const ALBUM_TYPE_STYLES: Record<AlbumType, string> = {
  colab: "bg-type-colab/10 text-type-colab border-type-colab/25",
  faculdade: "bg-type-faculdade/10 text-type-faculdade border-type-faculdade/25",
  especial: "bg-type-especial/10 text-type-especial border-type-especial/25",
  medicina: "bg-type-medicina/10 text-type-medicina border-type-medicina/25",
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
  criador: "Criador",
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
