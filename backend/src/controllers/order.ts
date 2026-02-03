import { Request, Response, NextFunction } from 'express';
import { faker } from '@faker-js/faker';
import { Error as MongooseError } from 'mongoose';
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

    // Проверяем, что все продукты существуют и имеют цену
    let products;
    try {
      products = await Product.find({ _id: { $in: items } });
    } catch (dbErr) {
      if (dbErr instanceof MongooseError.CastError) {
        return next(new BadRequestError('Некорректный формат ID продукта'));
      }
      return next(dbErr);
    }

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
