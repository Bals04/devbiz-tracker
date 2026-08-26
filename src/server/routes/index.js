import { Router } from 'express';
import * as clientController from '../controllers/client.controller.js';
import * as paymentController from '../controllers/payment.controller.js';
import * as taskController from '../controllers/task.controller.js';
import * as metaController from '../controllers/meta.controller.js';
import * as authController from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/loginLimiter.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  accessCodeSchema, clientIdParams, clientSchema, clientUpdateSchema, columnSchema, commentSchema,
  idParams, moveTaskSchema, paymentSchema, taskIdParams, taskSchema, taskUpdateSchema,
} from '../validation/schemas.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => res.json({ status: 'ok', service: 'devbiz-tracker', timestamp: new Date().toISOString() }));
apiRouter.post('/auth/access', asyncHandler(loginLimiter), validate(accessCodeSchema), asyncHandler(authController.access));
apiRouter.post('/auth/logout', authController.logout);
apiRouter.use(requireAuth);

apiRouter.get('/auth/me', asyncHandler(metaController.me));
apiRouter.get('/dashboard/summary', asyncHandler(clientController.summary));

apiRouter.route('/clients')
  .get(asyncHandler(clientController.list))
  .post(validate(clientSchema), asyncHandler(clientController.create));
apiRouter.route('/clients/:id')
  .get(validate(idParams, 'params'), asyncHandler(clientController.get))
  .patch(validate(idParams, 'params'), validate(clientUpdateSchema), asyncHandler(clientController.update));
apiRouter.post('/clients/:id/archive', validate(idParams, 'params'), asyncHandler(clientController.archive));

// Workspace-wide read endpoints. Declared before the parameterised routes below
// so '/payments' is never captured by '/payments/:id'.
apiRouter.get('/payments', asyncHandler(paymentController.listAll));
apiRouter.get('/tasks', asyncHandler(taskController.listAll));
apiRouter.get('/activity', asyncHandler(metaController.recentActivity));

apiRouter.route('/clients/:clientId/payments')
  .get(validate(clientIdParams, 'params'), asyncHandler(paymentController.list))
  .post(validate(clientIdParams, 'params'), validate(paymentSchema), asyncHandler(paymentController.create));
apiRouter.route('/payments/:id')
  .patch(validate(idParams, 'params'), validate(paymentSchema.partial()), asyncHandler(paymentController.update))
  .delete(validate(idParams, 'params'), asyncHandler(paymentController.remove));

apiRouter.get('/clients/:clientId/board', validate(clientIdParams, 'params'), asyncHandler(taskController.board));
apiRouter.route('/tasks')
  .post(validate(taskSchema), asyncHandler(taskController.create));
apiRouter.route('/tasks/:id')
  .patch(validate(idParams, 'params'), validate(taskUpdateSchema), asyncHandler(taskController.update))
  .delete(validate(idParams, 'params'), asyncHandler(taskController.remove));
apiRouter.patch('/tasks/:id/move', validate(idParams, 'params'), validate(moveTaskSchema), asyncHandler(taskController.move));
apiRouter.post('/tasks/:taskId/comments', validate(taskIdParams, 'params'), validate(commentSchema), asyncHandler(taskController.comment));
apiRouter.route('/comments/:id')
  .patch(validate(idParams, 'params'), validate(commentSchema), asyncHandler(taskController.updateComment))
  .delete(validate(idParams, 'params'), asyncHandler(taskController.deleteComment));

apiRouter.get('/team-members', asyncHandler(metaController.team));
apiRouter.get('/clients/:clientId/activity', validate(clientIdParams, 'params'), asyncHandler(metaController.activity));
apiRouter.post('/clients/:clientId/columns', validate(clientIdParams, 'params'), validate(columnSchema), asyncHandler(metaController.createColumn));
apiRouter.patch('/columns/:id', validate(idParams, 'params'), validate(columnSchema.partial()), asyncHandler(metaController.updateColumn));
apiRouter.delete('/columns/:id', validate(idParams, 'params'), asyncHandler(metaController.deleteColumn));
