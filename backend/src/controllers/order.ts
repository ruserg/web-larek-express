import { Request, Response, NextFunction } from 'express';
import { faker } from '@faker-js/faker';
import Product from '../models/product';
import { BadRequestError } from '../middlewares/errorHandler';

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { payment, email, phone, address, total, items } = req.body;

    // Проверяем, что все продукты существуют и имеют цену
    const products = await Product.find({ _id: { $in: items } });

    if (products.length !== items.length) {
      return next(new BadRequestError('Один или несколько продуктов не найдены'));
    }

    // Проверяем, что у всех продуктов есть цена
    const productsWithoutPrice = products.filter((p) => p.price === null || p.price === undefined);
    if (productsWithoutPrice.length > 0) {
      return next(new BadRequestError('У одного или нескольких продуктов отсутствует цена'));
    }

    // Проверяем, что сумма заказа равна сумме цен продуктов
    const calculatedTotal = products.reduce((sum, p) => sum + (p.price || 0), 0);
    if (calculatedTotal !== total) {
      return next(new BadRequestError('Сумма заказа не соответствует сумме цен продуктов'));
    }

    // Генерируем ID заказа
    const orderId = faker.string.uuid();

    res.status(201).json({
      id: orderId,
      total,
    });
  } catch (err) {
    next(err);
  }
};
