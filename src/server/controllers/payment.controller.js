import * as payments from '../services/payment.service.js';

export const list = async (req, res) => res.json(await payments.listPayments(req.params.clientId));
export const listAll = async (_req, res) => res.json(await payments.listAllPayments());
export const create = async (req, res) => res.status(201).json(await payments.createPayment(req.params.clientId, req.body, req.profile.id));
export const update = async (req, res) => res.json(await payments.updatePayment(req.params.id, req.body, req.profile.id));
export const remove = async (req, res) => res.json(await payments.deletePayment(req.params.id, req.profile.id));
