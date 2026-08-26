import { z } from 'zod';

const optionalText = z.string().trim().max(4000).nullable().optional();
const date = z.string().date().nullable().optional();

export const idParams = z.object({ id: z.string().uuid() });
export const clientIdParams = z.object({ clientId: z.string().uuid() });
export const taskIdParams = z.object({ taskId: z.string().uuid() });

export const clientSchema = z.object({
  name: z.string().trim().min(2).max(150),
  project_name: z.string().trim().min(2).max(180),
  contact_name: z.string().trim().max(150).nullable().optional(),
  contact_email: z.string().email().nullable().optional().or(z.literal('')),
  contact_phone: z.string().trim().max(50).nullable().optional(),
  status: z.enum(['lead', 'active', 'on_hold', 'completed', 'cancelled']).default('lead'),
  contract_price: z.coerce.number().min(0),
  currency: z.string().length(3).default('PHP'),
  due_date: date,
  notes: optionalText,
});

export const clientUpdateSchema = clientSchema.partial();

export const paymentSchema = z.object({
  amount: z.coerce.number().positive(),
  payment_type: z.enum(['down_payment', 'installment', 'final', 'refund', 'other']).default('installment'),
  payment_date: z.string().date(),
  reference_number: z.string().trim().max(120).nullable().optional(),
  notes: optionalText,
});

export const columnSchema = z.object({
  name: z.string().trim().min(1).max(80),
  position: z.coerce.number().int().min(0),
  is_completed: z.boolean().default(false),
});

export const taskSchema = z.object({
  client_id: z.string().uuid(),
  column_id: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  description: optionalText,
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  due_date: date,
  position: z.coerce.number().int().min(0).default(0),
  assignee_ids: z.array(z.string().uuid()).default([]),
});

export const taskUpdateSchema = taskSchema.partial().extend({ assignee_ids: z.array(z.string().uuid()).optional() });

export const moveTaskSchema = z.object({
  column_id: z.string().uuid(),
  position: z.coerce.number().int().min(0),
});

export const commentSchema = z.object({ body: z.string().trim().min(1).max(4000) });
export const accessCodeSchema = z.object({ code: z.string().min(6).max(128) });
