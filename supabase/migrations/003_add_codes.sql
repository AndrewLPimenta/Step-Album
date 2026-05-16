-- Add class_code (turma, 5 digits) and student_code (formando, 4 digits)
alter table public.albums
  add column class_code  text,
  add column student_code text;

create index albums_class_code_idx   on public.albums(class_code);
create index albums_student_code_idx on public.albums(student_code);
