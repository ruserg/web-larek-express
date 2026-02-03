import { Router } from 'express';
import { celebrate, Joi } from 'celebrate';
import {
  login,
  register,
  refreshToken,
  logout,
  getCurrentUser,
} from '../controllers/auth';
import auth from '../middlewares/auth';

const router = Router();

router.post(
  '/login',
  celebrate({
    body: Joi.object().keys({
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required(),
    }),
  }),
  login,
);

router.post(
  '/register',
  celebrate({
    body: Joi.object().keys({
      name: Joi.string().min(2).max(30).optional(),
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required(),
    }),
  }),
  register,
);

router.get('/token', refreshToken);

router.get('/logout', logout);

router.get('/user', auth, getCurrentUser);

export default router;
