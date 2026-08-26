import { CalendarDays, MessageSquare, MoveRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import { dueStatus } from '../lib/format.js';
import { EmptyState } from './ui/Feedback.jsx';
import { AssigneeList, CountPill, PriorityChip } from './ui/Data.jsx';
import { IconButton } from './ui/Button.jsx';
import { ConfirmDialog } from './ui/Modal.jsx';
import { Menu } from './ui/Menu.jsx';
import { TaskForm } from './TaskForm.jsx';

export function KanbanBoard({ clientId, board, members, onRefresh }) {
  const [formContext, setFormContext] = useState(null);
  const [dragged, setDragged] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  const tasksFor = (columnId) => board.tasks.filter((task) => task.column_id === columnId);

  const save = async (input) => {
    const task = formContext.task;
    await api(task ? `/tasks/${task.id}` : '/tasks', {
      method: task ? 'PATCH' : 'POST',
      body: JSON.stringify(input),
    });
    toast.success(task ? 'Task updated' : 'Task created', input.title);
    await onRefresh();
  };

  const comment = (body) =>
    api(`/tasks/${formContext.task.id}/comments`, { method: 'POST', body: JSON.stringify({ body }) });

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api(`/tasks/${pendingDelete.id}`, { method: 'DELETE' });
      toast.success('Task deleted', pendingDelete.title);
      setPendingDelete(null);
      await onRefresh();
    } catch (err) {
      toast.error('Could not delete task', err.message);
    } finally {
      setDeleting(false);
    }
  };

  /** Shared by drag-and-drop and the keyboard "Move to" menu. */
  const moveTask = async (task, columnId) => {
    if (!task || task.column_id === columnId) return;
    const target = board.columns.find((column) => column.id === columnId);
    try {
      await api(`/tasks/${task.id}/move`, {
        method: 'PATCH',
        body: JSON.stringify({ column_id: columnId, position: tasksFor(columnId).length }),
      });
      toast.success('Task moved', `“${task.title}” → ${target?.name}`);
      await onRefresh();
    } catch (err) {
      toast.error('Could not move task', err.message);
    }
  };

  const drop = async (column) => {
    setDropTarget(null);
    const task = dragged;
    setDragged(null);
    await moveTask(task, column.id);
  };

  if (!board.columns.length) {
    return <EmptyState title="No workflow columns" description="Add a Kanban column to start organizing tasks." />;
  }

  return (
    <>
      <div className="board">
        {board.columns.map((column) => {
          const tasks = tasksFor(column.id);
          return (
            <section
              key={column.id}
              className={`board-col ${dropTarget === column.id ? 'is-drop-target' : ''}`.trim()}
              aria-label={`${column.name}, ${tasks.length} tasks`}
              onDragOver={(event) => {
                event.preventDefault();
                setDropTarget(column.id);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setDropTarget(null);
              }}
              onDrop={() => drop(column)}
            >
              <header className="board-col__head">
                <div>
                  <span className={`board-col__dot ${column.is_completed ? 'is-done' : ''}`.trim()} aria-hidden="true" />
                  <h3 className="truncate">{column.name}</h3>
                  <CountPill>{tasks.length}</CountPill>
                </div>
                <IconButton
                  icon={Plus}
                  small
                  label={`Add task to ${column.name}`}
                  onClick={() => setFormContext({ columnId: column.id })}
                />
              </header>

              <div className="board-col__list">
                {tasks.length === 0 ? (
                  <p className="board-col__empty">Drop a task here</p>
                ) : (
                  tasks.map((task) => {
                    const due = dueStatus(task.due_date);
                    const people = task.assignees?.map((item) => item.team_member) ?? [];

                    return (
                      <article
                        key={task.id}
                        className={`task-card ${dragged?.id === task.id ? 'is-dragging' : ''}`.trim()}
                        draggable
                        onDragStart={() => setDragged(task)}
                        onDragEnd={() => {
                          setDragged(null);
                          setDropTarget(null);
                        }}
                      >
                        <div className="task-card__top">
                          <PriorityChip priority={task.priority} />
                          <Menu
                            icon={MoveRight}
                            small
                            label={`Actions for ${task.title}`}
                            items={[
                              { label: 'Task', heading: true },
                              { label: 'Edit task', icon: Pencil, onSelect: () => setFormContext({ task }) },
                              { divider: true },
                              { label: 'Move to', heading: true },
                              ...board.columns
                                .filter((target) => target.id !== task.column_id)
                                .map((target) => ({
                                  label: target.name,
                                  icon: MoveRight,
                                  onSelect: () => moveTask(task, target.id),
                                })),
                              { divider: true },
                              {
                                label: 'Delete task',
                                icon: Trash2,
                                danger: true,
                                onSelect: () => setPendingDelete(task),
                              },
                            ]}
                          />
                        </div>

                        {/* The title is the button, so the card is reachable by keyboard
                            without swallowing the menu trigger inside it. */}
                        <button
                          type="button"
                          className="task-card__title"
                          style={{ display: 'block', width: '100%', textAlign: 'left' }}
                          onClick={() => setFormContext({ task })}
                        >
                          {task.title}
                        </button>

                        {task.description && <p className="task-card__desc clamp-2">{task.description}</p>}

                        <div className="task-card__foot">
                          <span className="task-card__meta">
                            {task.due_date && (
                              <span
                                className={
                                  due.tone === 'overdue'
                                    ? 'due-flag due-flag--overdue'
                                    : due.tone === 'soon'
                                      ? 'due-flag due-flag--soon'
                                      : 'due-flag'
                                }
                              >
                                <CalendarDays size={12} aria-hidden="true" />
                                {due.label}
                              </span>
                            )}
                            {task.comments?.length > 0 && (
                              <span>
                                <MessageSquare size={12} aria-hidden="true" />
                                {task.comments.length}
                              </span>
                            )}
                          </span>
                          <AssigneeList people={people} max={3} />
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>

      {formContext && (
        <TaskForm
          clientId={clientId}
          columns={board.columns}
          members={members}
          task={formContext.task}
          defaultColumnId={formContext.columnId}
          onClose={() => setFormContext(null)}
          onSave={save}
          onComment={comment}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this task?"
          message={`“${pendingDelete.title}” and its comments will be permanently removed. This cannot be undone.`}
          confirmLabel="Delete task"
          destructive
          loading={deleting}
          onConfirm={confirmDelete}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </>
  );
}
