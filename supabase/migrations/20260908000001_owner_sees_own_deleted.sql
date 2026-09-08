-- Soft deletes are UPDATEs, and PostgREST always RETURNs the updated row, so
-- the new row must still pass the SELECT policy. Let owners read their own
-- deleted rows (no privacy cost: it is their content). Clients filter
-- deleted_at is null in queries.

drop policy messages_read on public.messages;
create policy messages_read on public.messages for select to authenticated
  using (neighborhood_id = public.my_neighborhood_id()
         and (deleted_at is null or user_id = auth.uid())
         and not public.is_blocked(user_id));

drop policy threads_read on public.threads;
create policy threads_read on public.threads for select to authenticated
  using (neighborhood_id = public.my_neighborhood_id()
         and (deleted_at is null or user_id = auth.uid())
         and not public.is_blocked(user_id));

drop policy replies_read on public.replies;
create policy replies_read on public.replies for select to authenticated
  using ((deleted_at is null or user_id = auth.uid())
         and not public.is_blocked(user_id)
         and exists (select 1 from public.threads t
                     where t.id = thread_id and t.neighborhood_id = public.my_neighborhood_id()
                       and t.deleted_at is null));
