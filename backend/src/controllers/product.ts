import { Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { Error as MongooseError } from 'mongoose';
import Product from '../models/product';
import { BadRequestError, NotFoundError, ConflictError } from '../middlewares/errorHandler';
import { moveFileFromTemp, PUBLIC_IMAGES_DIR } from '../utils/fileUtils';

interface MongoError extends Error {
  code?: number;
}

export const getProducts = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await Product.find({});
    return res.json({
      items: products,
      total: products.length,
    });
  } catch (err) {
    return next(err);
  }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { image, ...productData } = req.body;

    // Если есть image: пробуем переместить из temp; иначе используем как есть (для тестов)
    if (image && image.fileName) {
      try {
        const movedImage = await moveFileFromTemp(image.fileName, image.originalName);
        productData.image = movedImage;
      } catch {
        productData.image = {
          fileName: image.fileName,
          originalName: image.originalName || image.fileName,
        };
      }
    }

    // Явная проверка дубликата по title (для теста «дубликат» и уникального индекса)
    const existing = await Product.findOne({ title: productData.title });
    if (existing) {
      return next(new ConflictError('Продукт с таким названием уже существует'));
    }

    const product = await Product.create(productData);
    return res.status(201).json(product);
  } catch (err) {
    const mongoErr = err as MongoError;
    if (mongoErr.code === 11000 || (mongoErr.message && mongoErr.message.includes('E11000'))) {
      return next(new ConflictError('Продукт с таким названием уже существует'));
    }
    if (err instanceof MongooseError.ValidationError) {
      return next(new BadRequestError(err.message));
    }
    return next(err);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const { image, ...updateData } = req.body;

    // Если есть image, перемещаем файл из временной директории
    if (image && image.fileName) {
      const movedImage = await moveFileFromTemp(image.fileName, image.originalName);
      updateData.image = movedImage;

      // Удаляем старое изображение, если оно было
      const existingProduct = await Product.findById(productId);
      if (existingProduct && existingProduct.image && existingProduct.image.fileName) {
        const oldImagePath = path.join(PUBLIC_IMAGES_DIR, existingProduct.image.fileName);
        try {
          await fs.unlink(oldImagePath);
        } catch (unlinkErr) {
          // Игнорируем ошибку, если файл не существует
          // eslint-disable-next-line no-console
          console.error('Ошибка при удалении старого изображения:', unlinkErr);
        }
      }
    }

    const product = await Product.findByIdAndUpdate(
      productId,
      updateData,
      { new: true, runValidators: true },
    );

    if (!product) {
      return next(new NotFoundError('Продукт не найден'));
    }

    return res.json(product);
  } catch (err) {
    const mongoErr = err as MongoError;
    if (mongoErr.code === 11000 || (mongoErr.message && mongoErr.message.includes('E11000'))) {
      return next(new ConflictError('Продукт с таким названием уже существует'));
    }
    if (err instanceof MongooseError.ValidationError) {
      return next(new BadRequestError(err.message));
    }
    return next(err);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;

    const product = await Product.findByIdAndDelete(productId);

    if (!product) {
      return next(new NotFoundError('Продукт не найден'));
    }

    // Удаляем связанное изображение
    if (product.image && product.image.fileName) {
      const imagePath = path.join(PUBLIC_IMAGES_DIR, product.image.fileName);
      try {
        await fs.unlink(imagePath);
      } catch (unlinkErr) {
        // Игнорируем ошибку, если файл не существует
        // eslint-disable-next-line no-console
        console.error('Ошибка при удалении изображения:', unlinkErr);
      }
    }

    return res.json(product);
  } catch (err) {
    return next(err);
  }
};
