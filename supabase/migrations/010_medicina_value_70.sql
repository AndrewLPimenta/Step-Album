-- Medicina album value dropped from R$75 to R$70.
-- Replaces the value-forcing trigger function (001_initial_schema.sql) and
-- backfills existing rows, same pattern as 006_backfill_payment_dates.sql.

create or replace function public.tg_set_album_value()
returns trigger
language plpgsql
as $$
begin
  new.value := case new.type
    when 'colab'     then 15.00
    when 'faculdade' then 20.00
    when 'especial'  then 25.00
    when 'medicina'  then 70.00
  end;
  return new;
end;
$$;

update public.albums
set value = 70.00
where type = 'medicina' and value <> 70.00;
