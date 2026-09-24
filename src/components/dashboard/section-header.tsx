import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  /** "01", "02"... — numera a leitura, como um relatorio. */
  index: string;
  /** Dominio da secao: "Faturamento", "Produção". */
  kicker: string;
  /**
   * A manchete. Tem que ser uma FRASE com o achado dentro ("O funil trava em
   * Baixado: 123 álbuns parados"), nunca um rotulo de categoria ("Produção")
   * — o rotulo ja' esta' no kicker, e um titulo que so' nomeia a secao
   * obriga a pessoa a extrair sozinha o que os numeros dizem.
   */
  headline: React.ReactNode;
  /** Uma ou duas frases de contexto: de onde vem o numero, o que excluir. */
  lede?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  index,
  kicker,
  headline,
  lede,
  right,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("mb-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 max-w-[62ch]">
          <p className="eyebrow text-muted-foreground/55">
            Seção {index} · {kicker}
          </p>
          <h2 className="mt-2 font-display text-[1.375rem] font-semibold leading-[1.25] tracking-tight sm:text-[1.6rem]">
            {headline}
          </h2>
          {lede && (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {lede}
            </p>
          )}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
      {/* Fio abaixo do cabecalho: e' o que faz a secao ler como secao de
          relatorio, e nao como mais um card solto na pilha. */}
      <div className="mt-4 h-px w-full bg-[var(--brd)]" />
    </div>
  );
}
