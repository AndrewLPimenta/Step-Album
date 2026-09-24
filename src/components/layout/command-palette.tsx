"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import {
  ArrowRight,
  Download,
  FileImage,
  LogOut,
  Moon,
  Plus,
  Search,
  Sun,
  type AppIcon,
} from "@/lib/icons";
import { cn } from "@/lib/utils";
import {
  ALBUM_STATUS_DOT,
  ALBUM_STATUS_LABELS,
  ALBUM_TYPE_LABELS,
  NAV_GROUP_LABELS,
  navItemsForRole,
} from "@/lib/constants";
import {
  quickSearchAlbumsAction,
  type QuickSearchAlbum,
} from "@/server/actions/search";
import { signOutAction } from "@/server/actions/auth";
import type { UserRole } from "@/types/database";

const OPEN_EVENT = "stepalbum:open-command-palette";

/** Abre o palette de qualquer lugar sem prop drilling nem contexto. */
export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/** Mac usa ⌘, o resto Ctrl. Resolvido no cliente pra nao divergir do SSR. */
export function useCommandKeyLabel() {
  const [label, setLabel] = React.useState("Ctrl");
  React.useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform ?? "")) setLabel("⌘");
  }, []);
  return label;
}

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: AppIcon;
  group: string;
  /** Termos extras que tambem casam com a busca (sinonimos, plural). */
  keywords?: string;
  run: () => void;
}

/** Sem acento e sem caixa — "álbuns" tem que casar com "albuns". */
function fold(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function CommandPalette({ role }: { role: UserRole }) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [cursor, setCursor] = React.useState(0);
  const [albums, setAlbums] = React.useState<QuickSearchAlbum[]>([]);
  const [searching, setSearching] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);
  const cmdKey = useCommandKeyLabel();

  // ------------------------------------------------------------- atalhos
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      // "/" abre a busca, como em GitHub/Linear — mas so' quando o foco nao
      // esta' num campo, senao a pessoa nao consegue digitar uma barra.
      if (e.key === "/" && !mod) {
        const el = document.activeElement as HTMLElement | null;
        const typing =
          el &&
          (el.tagName === "INPUT" ||
            el.tagName === "TEXTAREA" ||
            el.isContentEditable);
        if (!typing) {
          e.preventDefault();
          setOpen(true);
        }
      }
    }
    function onOpenEvent() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOpenEvent);
    };
  }, []);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setAlbums([]);
      setCursor(0);
    }
  }, [open]);

  // ------------------------------------------------- busca de albuns
  React.useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setAlbums([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    let cancelled = false;
    const t = setTimeout(async () => {
      const rows = await quickSearchAlbumsAction(term);
      if (cancelled) return;
      setAlbums(rows);
      setSearching(false);
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  // ------------------------------------------------------------ comandos
  const go = React.useCallback(
    (href: string) => () => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const commands = React.useMemo<Command[]>(() => {
    const nav: Command[] = navItemsForRole(role).map((item) => ({
      id: `nav:${item.href}`,
      label: item.label,
      hint: NAV_GROUP_LABELS[item.group],
      icon: item.icon,
      group: "Ir para",
      keywords: item.href,
      run: go(item.href),
    }));

    const actions: Command[] = [
      {
        id: "act:new-album",
        label: "Novo álbum",
        hint: "Cadastrar manualmente",
        icon: Plus,
        group: "Ações",
        keywords: "criar adicionar cadastro formando",
        run: go("/albums/new"),
      },
      {
        id: "act:export",
        label: "Exportar ciclo em CSV",
        hint: "Download",
        icon: Download,
        group: "Ações",
        keywords: "planilha csv relatorio baixar",
        run: () => {
          setOpen(false);
          window.location.href = "/api/export/ciclo";
        },
      },
      {
        id: "act:theme",
        label: resolvedTheme === "dark" ? "Tema claro" : "Tema escuro",
        hint: "Alternar aparência",
        icon: resolvedTheme === "dark" ? Sun : Moon,
        group: "Ações",
        keywords: "tema dark light modo noturno aparencia",
        run: () => {
          setTheme(resolvedTheme === "dark" ? "light" : "dark");
          setOpen(false);
        },
      },
      {
        id: "act:signout",
        label: "Sair da conta",
        icon: LogOut,
        group: "Ações",
        keywords: "logout deslogar encerrar sessao",
        run: () => {
          setOpen(false);
          void signOutAction();
        },
      },
    ];

    return [...nav, ...actions];
  }, [role, go, resolvedTheme, setTheme]);

  const filtered = React.useMemo(() => {
    const q = fold(query.trim());
    if (!q) return commands;
    return commands.filter((c) =>
      fold(`${c.label} ${c.hint ?? ""} ${c.keywords ?? ""}`).includes(q),
    );
  }, [commands, query]);

  // Lista plana na ordem em que aparece — e' ela que o cursor percorre.
  const flat = React.useMemo<Command[]>(() => {
    const albumCommands: Command[] = albums.map((a) => ({
      id: `album:${a.id}`,
      label: a.student_name,
      hint: [a.class_code, a.faculty].filter(Boolean).join(" · "),
      icon: FileImage,
      group: "Álbuns",
      run: go(`/albums/${a.id}`),
    }));
    const seeAll: Command[] =
      query.trim().length >= 2
        ? [
            {
              id: "album:all",
              label: `Ver todos os resultados para “${query.trim()}”`,
              icon: ArrowRight,
              group: "Álbuns",
              run: go(`/albums?q=${encodeURIComponent(query.trim())}`),
            },
          ]
        : [];
    return [...filtered, ...albumCommands, ...seeAll];
  }, [filtered, albums, query, go]);

  React.useEffect(() => {
    setCursor(0);
  }, [query, albums.length]);

  // Mantem o item ativo visivel quando se navega so' pelo teclado.
  React.useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${cursor}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => (flat.length ? (c + 1) % flat.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => (flat.length ? (c - 1 + flat.length) % flat.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      flat[cursor]?.run();
    } else if (e.key === "Home") {
      e.preventDefault();
      setCursor(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setCursor(Math.max(0, flat.length - 1));
    }
  }

  // Agrupa preservando a ordem da lista plana, pra o indice do cursor bater
  // com o que esta' desenhado.
  const groups: { name: string; items: { cmd: Command; index: number }[] }[] =
    [];
  flat.forEach((cmd, index) => {
    const last = groups[groups.length - 1];
    if (last && last.name === cmd.group) last.items.push({ cmd, index });
    else groups.push({ name: cmd.group, items: [{ cmd, index }] });
  });

  const albumById = new Map(albums.map((a) => [`album:${a.id}`, a]));

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[hsl(240_30%_12%/0.35)] backdrop-blur-[6px] data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="glass-raised fixed left-1/2 top-[12vh] z-50 w-[min(38rem,calc(100vw-1.5rem))] -translate-x-1/2 overflow-hidden p-0 duration-150 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          onOpenAutoFocus={(e) => {
            // O foco vai pro input, nao pro primeiro focavel do dialogo.
            e.preventDefault();
            (
              document.getElementById("command-palette-input") as HTMLInputElement
            )?.focus();
          }}
        >
          <DialogPrimitive.Title className="sr-only">
            Busca e navegação rápida
          </DialogPrimitive.Title>

          <div className="flex items-center gap-3 border-b border-[var(--brd)] px-4">
            <Search
              className="h-[18px] w-[18px] shrink-0 text-muted-foreground/60"
              weight="regular"
              aria-hidden="true"
            />
            <input
              id="command-palette-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="Buscar formando, turma ou ir para uma tela..."
              autoComplete="off"
              spellCheck={false}
              role="combobox"
              aria-expanded
              aria-controls="command-palette-list"
              aria-activedescendant={
                flat[cursor] ? `cmd-${flat[cursor].id}` : undefined
              }
              className="h-14 w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/60"
            />
            {searching && (
              <span
                className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-[hsl(var(--brand-blue)/0.25)] border-t-[hsl(var(--brand-blue))]"
                aria-hidden="true"
              />
            )}
            <kbd className="hidden shrink-0 rounded-md border border-[var(--chip-brd)] bg-[var(--chip)] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:block">
              esc
            </kbd>
          </div>

          <div
            id="command-palette-list"
            ref={listRef}
            role="listbox"
            aria-label="Resultados"
            className="max-h-[min(24rem,60vh)] overflow-y-auto p-2"
          >
            {flat.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                Nada encontrado para “{query.trim()}”.
              </p>
            )}

            {groups.map((group) => (
              <div key={group.name} className="mb-1 last:mb-0">
                <div className="eyebrow px-3 pb-1 pt-2 text-muted-foreground/50">
                  {group.name}
                </div>
                {group.items.map(({ cmd, index }) => {
                  const album = albumById.get(cmd.id);
                  const Icon = cmd.icon;
                  const active = index === cursor;
                  return (
                    <div
                      key={cmd.id}
                      id={`cmd-${cmd.id}`}
                      data-index={index}
                      role="option"
                      aria-selected={active}
                      tabIndex={-1}
                      onMouseMove={() => setCursor(index)}
                      onClick={cmd.run}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm",
                        active && "bg-[hsl(var(--brand-blue)/0.1)]",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active
                            ? "text-[hsl(var(--ink-blue))]"
                            : "text-muted-foreground/70",
                        )}
                        weight={active ? "duotone" : "regular"}
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {cmd.label}
                      </span>
                      {album ? (
                        <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                          <span className="hidden sm:inline">{cmd.hint}</span>
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                ALBUM_STATUS_DOT[album.status],
                              )}
                              aria-hidden="true"
                            />
                            {ALBUM_STATUS_LABELS[album.status]}
                          </span>
                          <span className="hidden md:inline">
                            {ALBUM_TYPE_LABELS[album.type]}
                          </span>
                        </span>
                      ) : cmd.hint ? (
                        <span className="shrink-0 text-xs text-muted-foreground/70">
                          {cmd.hint}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 border-t border-[var(--brd)] px-4 py-2.5 text-[11px] text-muted-foreground">
            <Legend keys={["↑", "↓"]} label="navegar" />
            <Legend keys={["↵"]} label="abrir" />
            <span className="ml-auto hidden sm:inline">
              {cmdKey}K abre em qualquer tela
            </span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function Legend({ keys, label }: { keys: string[]; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      {keys.map((k) => (
        <kbd
          key={k}
          className="rounded-md border border-[var(--chip-brd)] bg-[var(--chip)] px-1.5 py-0.5 text-[10px] font-medium"
        >
          {k}
        </kbd>
      ))}
      {label}
    </span>
  );
}
