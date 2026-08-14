-- ============================================================================
-- Novo status: 'aguardando'
--
-- Hoje o primeiro status é 'baixado', o que assume que o álbum já veio da
-- Kaz para o disco. Falta o estado anterior: existe na Kaz, foi importado
-- para o StepAlbum, mas a pasta ainda não está na máquina de ninguém.
--
-- Sem isso, o agente que varre o disco não consegue distinguir "ainda não
-- baixei" de "baixei e não mexi" — as duas coisas ficariam como 'baixado'.
--
-- ############################################################################
-- ATENÇÃO: RODAR EM DUAS EXECUÇÕES SEPARADAS NO SQL EDITOR
--
-- O Postgres não deixa usar um valor de enum na mesma transação em que ele
-- foi criado. Mesmo problema da migration 012 (criador_role).
--
--   1) selecione e execute SÓ o PASSO 1
--   2) depois selecione e execute SÓ o PASSO 2
-- ############################################################################


-- ============================== PASSO 1 =====================================
-- (executar sozinho, primeiro)

alter type album_status add value if not exists 'aguardando' before 'baixado';


-- ============================== PASSO 2 =====================================
-- (executar sozinho, depois que o PASSO 1 terminar)

-- O default de novos álbuns continua 'baixado': quem cria pela tela está
-- registrando algo que já tem em mãos. Quem importa em massa da Kaz é que
-- deve gravar 'aguardando' — a importação sabe que aquilo ainda não veio
-- para o disco.
comment on type album_status is
  'aguardando = existe na Kaz, ainda não veio para o disco; baixado = pasta '
  'no disco, sem edição; editando = tem tratadas; montado = tem álbum '
  'exportado; enviado/concluido = fecha o ciclo';

-- Índice para o agente: ele consulta sempre por turma, e as turmas grandes
-- (171 formandos) fariam varredura sequencial a cada rodada.
create index if not exists albums_class_student_idx
  on public.albums (class_code, student_code);
