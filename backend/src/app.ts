import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import dotenv from 'dotenv';
import { errors } from 'celebrate';
import { requestLogger, errorLogger } from './middlewares/logger';
import { errorHandler } from './middlewares/errorHandler';
import productRoutes from './routes/product';
import orderRoutes from './routes/order';
import authRoutes from './routes/auth';
import uploadRoutes from './routes/upload';

dotenv.config();

const { PORT = 3000, DB_ADDRESS = 'mongodb://127.0.0.1:27017/weblarek' } = process.env;

const app = express();

// Подключение к MongoDB
mongoose.connect(DB_ADDRESS)
  .then(() => {
    console.log('Подключено к MongoDB');
  })
  .catch((err: Error) => {
    console.error('Ошибка подключения к MongoDB:', err);
  });

// CORS
app.use(cors());

// Парсинг JSON и cookies
app.use(express.json());
app.use(cookieParser());

// Статические файлы
app.use(express.static(path.join(__dirname, '../public')));

// Логирование запросов
app.use(requestLogger);

// Роуты
app.use('/product', productRoutes);
app.use('/order', orderRoutes);
app.use('/auth', authRoutes);
app.use('/upload', uploadRoutes);

// Логирование ошибок
app.use(errorLogger);

// Обработка ошибок валидации celebrate
app.use(errors());

// Централизованная обработка ошибок
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
