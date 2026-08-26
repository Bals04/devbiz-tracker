alter table public.kanban_columns
  add constraint kanban_columns_client_id_id_key unique (client_id, id);

alter table public.tasks
  add constraint tasks_client_column_fkey
  foreign key (client_id, column_id)
  references public.kanban_columns(client_id, id)
  on delete restrict;
