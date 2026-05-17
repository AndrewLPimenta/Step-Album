-- Adiciona novos status ao enum album_status
ALTER TYPE album_status ADD VALUE IF NOT EXISTS 'fotos_insuficientes';
ALTER TYPE album_status ADD VALUE IF NOT EXISTS 'duplicado';

-- Função que deleta álbuns excluídos do ciclo após o fim do ciclo
CREATE OR REPLACE FUNCTION cleanup_cycle_excluded_albums()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM album_problems
  WHERE album_id IN (
    SELECT id FROM albums
    WHERE status IN ('fotos_insuficientes', 'duplicado')
      AND cycle_end IS NOT NULL
      AND cycle_end < CURRENT_DATE
  );

  DELETE FROM albums
  WHERE status IN ('fotos_insuficientes', 'duplicado')
    AND cycle_end IS NOT NULL
    AND cycle_end < CURRENT_DATE;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
