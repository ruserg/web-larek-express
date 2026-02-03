import { Router, Request } from 'express';
import multer from 'multer';
import path from 'path';
import { TEMP_DIR } from '../utils/fileUtils';
import auth from '../middlewares/auth';
import { BadRequestError } from '../middlewares/errorHandler';

const router = Router();

// Настройка multer для сохранения файлов во временную директорию
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, TEMP_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const allowedMimeTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/gif', 'image/svg+xml'];

const fileFilter = (
  _req: Request,
  // eslint-disable-next-line no-undef
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  // Разрешаем только указанные типы изображений
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Разрешена загрузка только изображений (png, jpg, jpeg, gif, svg)'));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter,
});

router.post('/', auth, upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) {
      return next(new BadRequestError('Файл не был загружен'));
    }

    return res.json({
      fileName: req.file.filename,
      originalName: req.file.originalname,
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
