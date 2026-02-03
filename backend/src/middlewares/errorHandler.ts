/* eslint-disable max-classes-per-file */
import { Request, Response, NextFunction } from 'express';
import { Error as MongooseError } from 'mongoose';
import { isCelebrateError } from 'celebrate';

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
  err: Error | BadRequestError | NotFoundError | ConflictError | UnauthorizedError,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  let statusCode = 500;
  let message = 'На сервере произошла ошибка';

  if (err instanceof BadRequestError || err instanceof NotFoundError
    || err instanceof ConflictError || err instanceof UnauthorizedError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (isCelebrateError(err)) {
    statusCode = 400;
    const details = err.details.get('body') || err.details.get('params') || err.details.get('query');
    message = details ? details.message : 'Ошибка валидации данных';
  } else if (err instanceof MongooseError.ValidationError) {
    statusCode = 400;
    message = err.message;
  } else if (err.message && err.message.includes('E11000')) {
    statusCode = 409;
    message = 'Такой объект уже существует';
  }

  res.status(statusCode).json({ message });
};
