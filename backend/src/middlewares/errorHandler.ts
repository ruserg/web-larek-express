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

  // Обработка ошибок celebrate (первым делом)
  if (err instanceof CelebrateError) {
    const errorBody = err.details.get('body') || err.details.get('params') || err.details.get('query');
    const details = errorBody?.details?.[0];

    return res.status(400).json({
      message: details?.message || 'Ошибка валидации данных',
    });
  }

  let statusCode = 500;
  let message = 'На сервере произошла ошибка';

  if (err instanceof BadRequestError || err instanceof NotFoundError
    || err instanceof ConflictError || err instanceof UnauthorizedError) {
    statusCode = err.statusCode;
    message = err.message;
  } else {
    const mongoErr = err as MongoError;
    if (mongoErr.code === 11000 || (mongoErr.message && mongoErr.message.includes('E11000'))) {
      statusCode = 409;
      message = 'Такой объект уже существует';
    } else if (err instanceof MongooseError.ValidationError) {
      statusCode = 400;
      message = err.message;
    } else if (err instanceof MongooseError.CastError) {
      statusCode = 400;
      message = 'Некорректный формат данных';
    }
  }

  return res.status(statusCode).json({ message });
};
