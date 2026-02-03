import { Request, Response, NextFunction } from 'express';
import { faker } from '@faker-js/faker';
import Product from '../models/product';
import { BadRequestError } from '../middlewares/errorHandler';

const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      payment: _payment,
      email: _email,
      phone: _phone,
      address: _address,
      total,
      items,
    } = req.body;

    // Проверяем, что items является массивом и не пустой
    if (!Array.isArray(items) || items.length === 0) {
      return next(new BadRequestError('Массив товаров не может быть пустым'));
    }

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

    return res.status(200).json({
      id: orderId,
      total,
    });
  } catch (err) {
    return next(err);
  }
};

export default createOrder;
