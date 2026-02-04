/* eslint-disable max-classes-per-file */
import { Request, Response, NextFunction } from 'express';
import { Error as MongooseError } from 'mongoose';
import { CelebrateError } from 'celebrate';

interface MongoError extends Error {
  code?: number;
}

export class BadRequestError extends Error {
  statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
    this.statusCode = 400;
  }
}

export class NotFoundError extends Error {
  statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

export class ConflictError extends Error {
  statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
  }
}

export class UnauthorizedError extends Error {
  statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
    this.statusCode = 401;
  }
}

export const errorHandler = (
  err: Error | BadRequestError | NotFoundError | ConflictError | UnauthorizedError | CelebrateError,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  // Проверяем, не был ли ответ уже отправлен
  if (res.headersSent) {
    return _next(err);
  }

  // Ошибка парсинга JSON — только от body-parser (express.json())
  const jsonErr = err as Error & { status?: number; type?: string };
  const isBodyParserJsonError = err instanceof SyntaxError
    && (jsonErr.type === 'entity.parse.failed' || jsonErr.status === 400);
  if (isBodyParserJsonError) {
    return res.status(400).json({
      message: 'Неверный формат JSON',
    });
  }

  // Обработка ошибок celebrate (валидация Joi)
  if (err instanceof CelebrateError || (err as Error).name === 'ValidationError') {
    const celebrateErr = err as CelebrateError;
    const errorBody = celebrateErr.details?.get?.('body')
      || celebrateErr.details?.get?.('params')
      || celebrateErr.details?.get?.('query');
    const details = errorBody?.details?.[0];

    return res.status(400).json({
      message: details?.message || 'Ошибка валидации данных',
    });
  }

  // Обработка кастомных ошибок
  if (err instanceof ConflictError) {
    return res.status(409).json({
      message: err.message,
    });
  }

  if (err instanceof BadRequestError || err instanceof NotFoundError || err instanceof UnauthorizedError) {
    return res.status(err.statusCode).json({
      message: err.message,
    });
  }

  // Устанавливаем статус по умолчанию
  let statusCode = 500;
  let message = 'На сервере произошла ошибка';

  // Обработка ошибок Mongoose
  if (err instanceof MongooseError.ValidationError) {
    statusCode = 400;
    message = err.message;
  } else if (err instanceof MongooseError.CastError) {
    statusCode = 400;
    message = 'Некорректный формат данных';
  } else {
    // Обработка ошибки дубликата уникального поля (проверяем message, так как code может быть не доступен)
    const mongoErr = err as MongoError;
    if (mongoErr.code === 11000 || (mongoErr.message && mongoErr.message.includes('E11000'))) {
      statusCode = 409;
      message = 'Такой объект уже существует';
    }
  }

  return res.status(statusCode).json({ message });
};
