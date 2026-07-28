-- Adds "software" and "automações" categories to public.arquivos.
-- Already applied directly on the live DB by Andrew on 2026-07-28; this file
-- just records it in migration history so a fresh environment matches prod.

ALTER TABLE public.arquivos
DROP CONSTRAINT arquivos_category_check;

ALTER TABLE public.arquivos
ADD CONSTRAINT arquivos_category_check
CHECK (
  category IN (
    'contrato',
    'tutorial',
    'modelo',
    'outro',
    'software',
    'automações'
  )
);
