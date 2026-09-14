"use client";

/**
 * "use client" e' obrigatorio aqui: o @phosphor-icons/react chama
 * createContext no topo do modulo (o IconContext, que da o peso/tamanho
 * padrao) e nao traz a diretiva no proprio pacote. Sem isto, qualquer
 * Server Component que importe um icone — /loading, /error, o EmptyState —
 * executa esse createContext no bundle RSC, onde ele nao existe, e o app
 * quebra com "createContext is not a function".
 *
 * Os `export type` daqui continuam valendo em Server Components: tipo nao
 * existe em tempo de execucao, entao nao atravessa a fronteira.
 */
/**
 * Fonte unica de icone do app.
 *
 * Trocamos o lucide-react pelo Phosphor (@phosphor-icons/react): o lucide e'
 * um traco unico de 1.5px sem variacao, e sobre vidro ele some — nao tem
 * peso pra segurar contraste contra um fundo borrado. O Phosphor traz seis
 * pesos da MESMA familia (thin, light, regular, bold, fill, duotone), entao
 * da' pra usar `duotone` no item ativo e `regular` no resto sem misturar
 * duas bibliotecas com metricas diferentes.
 *
 * Os nomes exportados aqui sao os do lucide de proposito: as ~39 telas que
 * ja' importavam `Wallet`, `Send`, `Trash2` continuam iguais, so' trocando o
 * caminho do import. Quando um nome nao existe no Phosphor, o apelido aponta
 * pro equivalente mais proximo (a lista abaixo mostra o par).
 */
import type * as React from "react";

export {
  WarningCircle as AlertCircle,
  Warning as AlertTriangle,
  Warning as TriangleAlert,
  AppleLogo as Apple,
  ArrowLeft,
  ArrowRight,
  Prohibit as Ban,
  BookOpen,
  CalendarBlank as CalendarClock,
  CalendarX as CalendarOff,
  CalendarCheck as CalendarRange,
  Check,
  CheckCircle as CheckCircle2,
  CaretDown as ChevronDown,
  CaretRight as ChevronRight,
  CaretUp as ChevronUp,
  Circle,
  Clock,
  Copy,
  DownloadSimple as Download,
  ArrowSquareOut as ExternalLink,
  Eye,
  EyeSlash as EyeOff,
  File,
  Image as FileImage,
  FolderOpen,
  HardDrives as HardDriveDownload,
  ImageBroken as ImageOff,
  Stack as Layers,
  SquaresFour as LayoutDashboard,
  Images as Library,
  LinkSimple as Link2,
  ListChecks as ListTodo,
  SpinnerGap as Loader2,
  Lock,
  SignOut as LogOut,
  Envelope as Mail,
  Monitor,
  Desktop as MonitorDown,
  Moon,
  DotsThree as MoreHorizontal,
  SidebarSimple as PanelLeft,
  Sidebar as PanelLeftClose,
  Paperclip,
  Plus,
  ArrowsClockwise as RefreshCw,
  ArrowCounterClockwise as RotateCcw,
  MagnifyingGlass as Search,
  MagnifyingGlass as SearchX,
  PaperPlaneTilt as Send,
  SlidersHorizontal as Settings2,
  ShieldWarning as ShieldAlert,
  Sun,
  Target,
  Trash as Trash2,
  TrendUp as TrendingUp,
  UploadSimple as Upload,
  UserPlus,
  Users,
  Wallet,
  X,
} from "@phosphor-icons/react";

/** Os seis pesos do Phosphor. */
export type IconWeight =
  | "thin"
  | "light"
  | "regular"
  | "bold"
  | "fill"
  | "duotone";

/**
 * Tipo de um icone do app — substitui o `LucideIcon`. Declarado a' mao (em
 * vez de reexportar o tipo da lib) pra que trocar de biblioteca de novo nao
 * obrigue a mexer em toda assinatura que guarda um icone.
 */
export type AppIcon = React.ComponentType<
  React.SVGProps<SVGSVGElement> & {
    weight?: IconWeight;
    size?: number | string;
    mirrored?: boolean;
  }
>;

/** Alias de transicao — havia `LucideIcon` espalhado pelas assinaturas. */
export type LucideIcon = AppIcon;
