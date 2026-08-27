import { CalendarDays, MessageSquare, MoveRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
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

  /**
   * In-flight column changes, keyed by task id, layered over the server board.
   * A drop repaints immediately instead of waiting on the round trip; the entry
   * is dropped once the refetched board carries the move, and dropping it after
   * a failure is what rolls the card back to where it came from.
   */
  const [pendingMoves, setPendingMoves] = useState({});
  // Distinguishes overlapping moves of the same task, so a slow first request
  // settling late cannot clear the override belonging to a newer one.
  const moveToken = useRef(0);

  const columnOf = (task) => pendingMoves[task.id]?.columnId ?? task.column_id;

  /**
   * Tasks come back ordered by their global `position`, so an optimistically
   * moved card is appended rather than slotted mid-list — matching the position
   * the server assigns it.
   */
  const tasksFor = (columnId) => {
    const settled = [];
    const moved = [];
    for (const task of board.tasks) {
      if (columnOf(task) !== columnId) continue;
      (pendingMoves[task.id] ? moved : settled).push(task);
    }
    return [...settled, ...moved];
  };

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
    if (!task || columnOf(task) === columnId) return;
    const target = board.columns.find((column) => column.id === columnId);
    // Read the length before the override lands, or the card counts itself.
    const position = tasksFor(columnId).length;
    const token = ++moveToken.current;

    setPendingMoves((current) => ({ ...current, [task.id]: { columnId, token } }));

    try {
      await api(`/tasks/${task.id}/move`, {
        method: 'PATCH',
        body: JSON.stringify({ column_id: columnId, position }),
      });
      toast.success('Task moved', `“${task.title}” → ${target?.name}`);
      await onRefresh();
    } catch (err) {
      toast.error('Could not move task', err.message);
    } finally {
      setPendingMoves((current) => {
        // A newer move for this task owns the override now — leave it alone.
        if (current[task.id]?.token !== token) return current;
        const { [task.id]: _settled, ...rest } = current;
        return rest;
      });
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
                                .filter((target) => target.id !== columnOf(task))
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
