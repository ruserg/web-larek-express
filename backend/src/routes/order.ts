import { Router } from 'express';
import { celebrate, Joi } from 'celebrate';
import { createOrder } from '../controllers/order';

const router = Router();

router.post(
  '/',
  celebrate({
    body: Joi.object().keys({
      payment: Joi.string().valid('card', 'online').required(),
      email: Joi.string().email().required(),
      phone: Joi.string().required(),
      address: Joi.string().required(),
      total: Joi.number().required(),
      items: Joi.array().items(Joi.string().hex().length(24)).min(1).required(),
    }),
  }),
  createOrder,
);

export default router;
