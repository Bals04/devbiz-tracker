import * as clients from '../services/client.service.js';

export const list = async (req, res) => res.json(await clients.listClients(req.query));
export const get = async (req, res) => res.json(await clients.getClient(req.params.id));
export const create = async (req, res) => res.status(201).json(await clients.createClient(req.body, req.profile.id));
export const update = async (req, res) => res.json(await clients.updateClient(req.params.id, req.body, req.profile.id));
export const archive = async (req, res) => res.json(await clients.archiveClient(req.params.id, req.profile.id));
export const summary = async (_req, res) => res.json(await clients.dashboardSummary());
