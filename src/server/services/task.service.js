import { getSupabaseAdmin } from '../config/supabase.js';
import { AppError, assertData } from '../utils/errors.js';
import { logActivity } from './activity.service.js';

const taskFields = '*, assignees:task_assignees(team_member:team_members(*)), comments:task_comments(id,body,created_at,author:profiles(full_name))';

export async function listBoard(clientId) {
  const supabase = getSupabaseAdmin();
  const [columns, tasks] = await Promise.all([
    supabase.from('kanban_columns').select('*').eq('client_id', clientId).order('position'),
    supabase.from('tasks').select(taskFields).eq('client_id', clientId).order('position'),
  ]);
  return { columns: assertData(columns), tasks: assertData(tasks) };
}

/**
 * Every task across every client, for the workspace-wide task view. Joins the
 * client and its column so tasks can be grouped and filtered without loading
 * one board per client.
 */
export async function listAllTasks({ limit = 800 } = {}) {
  return assertData(await getSupabaseAdmin()
    .from('tasks')
    // tasks has two foreign keys to kanban_columns — the simple column_id one
    // and the composite (client_id, column_id) ownership constraint — so the
    // embed must name the constraint or PostgREST rejects it as ambiguous.
    .select(`${taskFields}, client:clients(id,name,project_name,archived_at), column:kanban_columns!tasks_column_id_fkey(id,name,is_completed,position)`)
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(limit));
}

async function replaceAssignees(taskId, assigneeIds = []) {
  const supabase = getSupabaseAdmin();
  const deleted = await supabase.from('task_assignees').delete().eq('task_id', taskId);
  if (deleted.error) throw new AppError(400, deleted.error.message);
  if (assigneeIds.length) assertData(await supabase.from('task_assignees').insert(assigneeIds.map((team_member_id) => ({ task_id: taskId, team_member_id }))));
}

export async function createTask(input, actorId) {
  const { assignee_ids, ...taskInput } = input;
  const task = assertData(await getSupabaseAdmin().from('tasks').insert({ ...taskInput, created_by: actorId }).select().single());
  await replaceAssignees(task.id, assignee_ids);
  await logActivity({ actorId, clientId: task.client_id, entityType: 'task', entityId: task.id, action: 'task.created' });
  return task;
}

export async function updateTask(id, input, actorId) {
  const { assignee_ids, ...taskInput } = input;
  const task = assertData(await getSupabaseAdmin().from('tasks').update(taskInput).eq('id', id).select().single());
  if (assignee_ids) await replaceAssignees(id, assignee_ids);
  await logActivity({ actorId, clientId: task.client_id, entityType: 'task', entityId: id, action: 'task.updated' });
  return task;
}

export async function moveTask(id, input, actorId) {
  const supabase = getSupabaseAdmin();
  const column = assertData(await supabase.from('kanban_columns').select('client_id,is_completed').eq('id', input.column_id).single());
  const task = assertData(await supabase.from('tasks').update({ ...input, completed_at: column.is_completed ? new Date().toISOString() : null }).eq('id', id).eq('client_id', column.client_id).select().single());
  await logActivity({ actorId, clientId: task.client_id, entityType: 'task', entityId: id, action: 'task.moved', metadata: { column_id: input.column_id } });
  return task;
}

export async function deleteTask(id, actorId) {
  const task = assertData(await getSupabaseAdmin().from('tasks').delete().eq('id', id).select().single());
  await logActivity({ actorId, clientId: task.client_id, entityType: 'task', entityId: id, action: 'task.deleted' });
  return task;
}

export async function createComment(taskId, body, actorId) {
  const supabase = getSupabaseAdmin();
  const task = assertData(await supabase.from('tasks').select('client_id').eq('id', taskId).single());
  const comment = assertData(await supabase.from('task_comments').insert({ task_id: taskId, body, author_id: actorId }).select('*, author:profiles(full_name)').single());
  await logActivity({ actorId, clientId: task.client_id, entityType: 'comment', entityId: comment.id, action: 'comment.created' });
  return comment;
}

export async function updateComment(id, body, actorId) {
  const supabase = getSupabaseAdmin();
  const comment = assertData(await supabase.from('task_comments').update({ body }).eq('id', id).eq('author_id', actorId).select('*, task:tasks(client_id)').single());
  await logActivity({ actorId, clientId: comment.task.client_id, entityType: 'comment', entityId: id, action: 'comment.updated' });
  return comment;
}

export async function deleteComment(id, actorId) {
  const supabase = getSupabaseAdmin();
  const comment = assertData(await supabase.from('task_comments').delete().eq('id', id).eq('author_id', actorId).select('*, task:tasks(client_id)').single());
  await logActivity({ actorId, clientId: comment.task.client_id, entityType: 'comment', entityId: id, action: 'comment.deleted' });
  return comment;
}
