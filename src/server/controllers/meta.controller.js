import { getSupabaseAdmin } from '../config/supabase.js';
import { assertData } from '../utils/errors.js';

export const me = async (req, res) => res.json({ authenticated: true, member: req.profile });
export const team = async (_req, res) => res.json(assertData(await getSupabaseAdmin().from('team_members').select('*').eq('is_active', true).order('name')));
export const activity = async (req, res) => res.json(assertData(await getSupabaseAdmin().from('activity_logs').select('*, actor:profiles(full_name)').eq('client_id', req.params.clientId).order('created_at', { ascending: false }).limit(30)));

// Workspace-wide feed for the dashboard. Joins the client so each entry can say
// which project it belongs to.
export const recentActivity = async (_req, res) => res.json(assertData(await getSupabaseAdmin().from('activity_logs').select('*, actor:profiles(full_name), client:clients(id,name)').order('created_at', { ascending: false }).limit(25)));

export const createColumn = async (req, res) => res.status(201).json(assertData(await getSupabaseAdmin().from('kanban_columns').insert({ ...req.body, client_id: req.params.clientId }).select().single()));
export const updateColumn = async (req, res) => res.json(assertData(await getSupabaseAdmin().from('kanban_columns').update(req.body).eq('id', req.params.id).select().single()));
export const deleteColumn = async (req, res) => res.json(assertData(await getSupabaseAdmin().from('kanban_columns').delete().eq('id', req.params.id).select().single()));
