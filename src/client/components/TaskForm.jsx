import { Check, MessageSquare, Send } from 'lucide-react';
import { useState } from 'react';
import { initials, relativeTime } from '../lib/format.js';
import { Alert } from './ui/Feedback.jsx';
import { Button } from './ui/Button.jsx';
import { Field, Input, Select, Textarea } from './ui/Form.jsx';
import { Modal } from './ui/Modal.jsx';

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export function TaskForm({
  clientId, columns, members, task, defaultColumnId, onClose, onSave, onComment,
}) {
  const [form, setForm] = useState({
    client_id: clientId,
    column_id: task?.column_id || defaultColumnId || columns[0]?.id || '',
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || 'medium',
    due_date: task?.due_date || '',
    position: task?.position || 0,
    assignee_ids: task?.assignees?.map((item) => item.team_member.id) || [],
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState(task?.comments || []);
  const [posting, setPosting] = useState(false);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const toggleAssignee = (id) =>
    setForm((current) => ({
      ...current,
      assignee_ids: current.assignee_ids.includes(id)
        ? current.assignee_ids.filter((item) => item !== id)
        : [...current.assignee_ids, id],
    }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave({ ...form, due_date: form.due_date || null });
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const addComment = async () => {
    const body = comment.trim();
    if (!body) return;
    setPosting(true);
    try {
      const created = await onComment(body);
      setComments((current) => [...current, created]);
      setComment('');
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <Modal
      title={task ? 'Edit task' : 'Create a task'}
      description={task ? undefined : 'Tasks land in the column you choose below.'}
      onClose={onClose}
      wide
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="task-form" variant="primary" loading={saving}>
            {task ? 'Save task' : 'Create task'}
          </Button>
        </>
      }
    >
      <form id="task-form" onSubmit={submit} className="form-grid">
        {error && (
          <div className="span-2">
            <Alert>{error}</Alert>
          </div>
        )}

        <Field label="Task title" span>
          {(props) => (
            <Input
              {...props}
              autoFocus
              required
              value={form.title}
              onChange={set('title')}
              placeholder="What needs to be done?"
            />
          )}
        </Field>

        <Field label="Description" optional span>
          {(props) => (
            <Textarea
              {...props}
              value={form.description}
              onChange={set('description')}
              placeholder="Add context and acceptance details"
            />
          )}
        </Field>

        <Field label="Column">
          {(props) => (
            <Select {...props} value={form.column_id} onChange={set('column_id')}>
              {columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Priority">
          {(props) => (
            <Select {...props} value={form.priority} onChange={set('priority')}>
              {PRIORITIES.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Due date" optional>
          {(props) => <Input {...props} type="date" value={form.due_date} onChange={set('due_date')} />}
        </Field>

        <fieldset className="fieldset span-2">
          <legend>Assignees</legend>
          <div className="assignee-picker">
            {members.map((member) => {
              const selected = form.assignee_ids.includes(member.id);
              return (
                <button
                  type="button"
                  key={member.id}
                  aria-pressed={selected}
                  onClick={() => toggleAssignee(member.id)}
                >
                  <span className="avatar avatar--sm" style={{ backgroundColor: member.avatar_color }} aria-hidden="true">
                    {initials(member.name)}
                  </span>
                  {member.name}
                  {selected && <Check size={14} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </fieldset>
      </form>

      {task && (
        <section className="span-2" style={{ marginTop: 'var(--sp-6)', paddingTop: 'var(--sp-5)', borderTop: '1px solid var(--border)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
            <MessageSquare size={15} aria-hidden="true" />
            Comments
            <span className="count-pill">{comments.length}</span>
          </h3>

          {comments.length === 0 ? (
            <p className="muted">No comments yet. Add the first one below.</p>
          ) : (
            <div className="comments">
              {comments.map((item) => (
                <article className="comment" key={item.id}>
                  <strong>{item.author?.full_name || 'DevBiz team'}</strong>
                  {item.created_at && (
                    <strong style={{ color: 'var(--text-subtle)', fontWeight: 500 }}>
                      {' · '}
                      {relativeTime(item.created_at)}
                    </strong>
                  )}
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          )}

          <div className="comment-compose">
            <input
              className="input"
              value={comment}
              aria-label="Add a comment"
              placeholder="Add a comment…"
              onChange={(event) => setComment(event.target.value)}
              onKeyDown={(event) => {
                // Enter posts; the form's own submit must not fire from here.
                if (event.key !== 'Enter') return;
                event.preventDefault();
                addComment();
              }}
            />
            <Button icon={Send} onClick={addComment} loading={posting} disabled={!comment.trim()}>
              Post
            </Button>
          </div>
        </section>
      )}
    </Modal>
  );
}
