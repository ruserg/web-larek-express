/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user';
import { UnauthorizedError } from './errorHandler';

interface JwtPayload {
  _id: string;
}

const auth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const { authorization } = req.headers;

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return next(new UnauthorizedError('Необходима авторизация'));
    }

    const token = authorization.replace('Bearer ', '');
    const { JWT_SECRET = 'secret-key' } = process.env;

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch (err) {
      return next(new UnauthorizedError('Неверный токен'));
    }

    const user = await User.findById(payload._id);
    if (!user) {
      return next(new UnauthorizedError('Пользователь не найден'));
    }

    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
};

export default auth;
