import * as tasks from '../services/task.service.js';

export const board = async (req, res) => res.json(await tasks.listBoard(req.params.clientId));
export const listAll = async (_req, res) => res.json(await tasks.listAllTasks());
export const create = async (req, res) => res.status(201).json(await tasks.createTask(req.body, req.profile.id));
export const update = async (req, res) => res.json(await tasks.updateTask(req.params.id, req.body, req.profile.id));
export const move = async (req, res) => res.json(await tasks.moveTask(req.params.id, req.body, req.profile.id));
export const remove = async (req, res) => res.json(await tasks.deleteTask(req.params.id, req.profile.id));
export const comment = async (req, res) => res.status(201).json(await tasks.createComment(req.params.taskId, req.body.body, req.profile.id));
export const updateComment = async (req, res) => res.json(await tasks.updateComment(req.params.id, req.body.body, req.profile.id));
export const deleteComment = async (req, res) => res.json(await tasks.deleteComment(req.params.id, req.profile.id));
