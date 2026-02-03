import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Error as MongooseError } from 'mongoose';
import User from '../models/user';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
} from '../middlewares/errorHandler';

interface MongoError extends Error {
  code?: number;
}

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return next(new UnauthorizedError('Неправильные почта или пароль'));
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return next(new UnauthorizedError('Неправильные почта или пароль'));
    }

    const { accessToken, refreshToken } = user.generateTokens();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 дней
    });

    return res.json({
      accessToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    return next(err);
  }
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = req.body;

    // Создание пользователя без дополнительной проверки, так как поле email уникальное
    const user = await User.create({ name, email, password });
    const { accessToken, refreshToken } = user.generateTokens();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 дней
    });

    return res.status(201).json({
      accessToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    if (err instanceof MongooseError.ValidationError) {
      return next(new BadRequestError(err.message));
    }
    const mongoErr = err as MongoError;
    if (mongoErr.code === 11000 || (mongoErr.message && mongoErr.message.includes('E11000'))) {
      return next(new ConflictError('Пользователь с таким email уже существует'));
    }
    return next(err);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken: token } = req.cookies;

    if (!token) {
      return next(new UnauthorizedError('Токен не предоставлен'));
    }

    const { JWT_SECRET = 'secret-key' } = process.env;
    let payload: { _id: string };
    try {
      payload = jwt.verify(token, JWT_SECRET) as { _id: string };
    } catch (err) {
      return next(new UnauthorizedError('Неверный токен'));
    }

    const user = await User.findById(payload._id).select('+tokens');
    if (!user) {
      return next(new NotFoundError('Пользователь не найден'));
    }

    // Проверяем, что токен есть в списке токенов пользователя
    const tokenExists = user.tokens && user.tokens.some((t) => t.token === token);
    if (!tokenExists) {
      return next(new UnauthorizedError('Токен не найден'));
    }

    // Удаляем старый refresh токен
    user.tokens = user.tokens.filter((t) => t.token !== token);
    await user.save();

    // Генерируем новые токены
    const { accessToken, refreshToken: newRefreshToken } = user.generateTokens();

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 дней
    });

    return res.json({ accessToken });
  } catch (err) {
    return next(err);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken: token } = req.cookies;

    if (!token) {
      return next(new UnauthorizedError('Токен не предоставлен'));
    }

    const { JWT_SECRET = 'secret-key' } = process.env;
    let payload: { _id: string };
    try {
      payload = jwt.verify(token, JWT_SECRET) as { _id: string };
    } catch (err) {
      return next(new UnauthorizedError('Неверный токен'));
    }

    const user = await User.findById(payload._id).select('+tokens');
    if (!user) {
      return next(new NotFoundError('Пользователь не найден'));
    }

    // Удаляем токен из списка токенов пользователя
    user.tokens = (user.tokens || []).filter((t) => t.token !== token);
    await user.save();

    res.clearCookie('refreshToken', {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
    });

    return res.json({ message: 'Выход выполнен успешно' });
  } catch (err) {
    return next(err);
  }
};

export const getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user } = req;
    if (!user) {
      return next(new UnauthorizedError('Пользователь не найден'));
    }

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
    });
  } catch (err) {
    return next(err);
  }
};
