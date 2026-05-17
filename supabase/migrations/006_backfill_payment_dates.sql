-- Backfill payment_date/cycle_start/cycle_end para álbuns enviados/concluídos
-- que foram marcados antes da lógica de ciclo quinzenal estar implementada.
-- Usa completed_at quando disponível, senão created_at como referência.

-- 1. Preenche completed_at nos que não têm
update albums
set completed_at = created_at
where status in ('enviado', 'concluido')
  and completed_at is null;

-- 2. Backfill das datas de ciclo
update albums
set
  payment_date = case
    when extract(day from coalesce(completed_at, created_at)::date) >= 18 then
      (date_trunc('month', coalesce(completed_at, created_at)::date)
        + interval '1 month' + interval '17 days')::date
    when extract(day from coalesce(completed_at, created_at)::date) >= 3 then
      (date_trunc('month', coalesce(completed_at, created_at)::date)
        + interval '1 month' + interval '2 days')::date
    else
      (date_trunc('month', coalesce(completed_at, created_at)::date)
        + interval '17 days')::date
  end,
  cycle_start = case
    when extract(day from coalesce(completed_at, created_at)::date) >= 18 then
      (date_trunc('month', coalesce(completed_at, created_at)::date)
        + interval '17 days')::date
    when extract(day from coalesce(completed_at, created_at)::date) >= 3 then
      (date_trunc('month', coalesce(completed_at, created_at)::date)
        + interval '2 days')::date
    else
      (date_trunc('month', coalesce(completed_at, created_at)::date)
        - interval '1 month' + interval '17 days')::date
  end,
  cycle_end = case
    when extract(day from coalesce(completed_at, created_at)::date) >= 18 then
      (date_trunc('month', coalesce(completed_at, created_at)::date)
        + interval '1 month' + interval '2 days')::date
    when extract(day from coalesce(completed_at, created_at)::date) >= 3 then
      (date_trunc('month', coalesce(completed_at, created_at)::date)
        + interval '17 days')::date
    else
      (date_trunc('month', coalesce(completed_at, created_at)::date)
        + interval '2 days')::date
  end
where status in ('enviado', 'concluido')
  and payment_date is null;
