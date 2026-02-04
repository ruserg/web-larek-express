import { Router } from 'express';
import { celebrate, Joi } from 'celebrate';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/product';
import auth from '../middlewares/auth';

const router = Router();

// GET /product - получить все продукты (публичный)
router.get('/', getProducts);

// POST /product - создать продукт (для базовых тестов без auth; для Level 2 добавить auth)
router.post(
  '/',
  celebrate({
    body: Joi.object().keys({
      title: Joi.string().min(2).max(30).required(),
      image: Joi.object().keys({
        fileName: Joi.string().required(),
        originalName: Joi.string().required(),
      }).required(),
      category: Joi.string().required(),
      description: Joi.string().optional(),
      price: Joi.number().allow(null).optional(),
    }),
  }),
  createProduct,
);

// PATCH /product/:productId - обновить продукт (требует авторизации)
router.patch(
  '/:productId',
  auth,
  celebrate({
    params: Joi.object().keys({
      productId: Joi.string().hex().length(24).required(),
    }),
    body: Joi.object().keys({
      title: Joi.string().min(2).max(30).optional(),
      image: Joi.object().keys({
        fileName: Joi.string().required(),
        originalName: Joi.string().required(),
      }).optional(),
      category: Joi.string().optional(),
      description: Joi.string().optional(),
      price: Joi.number().allow(null).optional(),
    }),
  }),
  updateProduct,
);

// DELETE /product/:productId - удалить продукт (требует авторизации)
router.delete(
  '/:productId',
  auth,
  celebrate({
    params: Joi.object().keys({
      productId: Joi.string().hex().length(24).required(),
    }),
  }),
  deleteProduct,
);

export default router;
