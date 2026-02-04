import fs from 'fs/promises';
import path from 'path';

const { UPLOAD_PATH_TEMP = 'temp', UPLOAD_PATH = 'images' } = process.env;

const TEMP_DIR = path.join(__dirname, '../../', UPLOAD_PATH_TEMP);
const PUBLIC_IMAGES_DIR = path.join(__dirname, '../../public', UPLOAD_PATH);

// Создаем директории, если их нет
const ensureDirectoriesExist = async () => {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
    await fs.mkdir(PUBLIC_IMAGES_DIR, { recursive: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Ошибка при создании директорий:', err);
  }
};

// Инициализируем директории при загрузке модуля
ensureDirectoriesExist();

export const moveFileFromTemp = async (
  fileName: string,
  originalName?: string,
): Promise<{ fileName: string; originalName: string }> => {
  const tempPath = path.join(TEMP_DIR, fileName);
  const publicPath = path.join(PUBLIC_IMAGES_DIR, fileName);

  try {
    // Проверяем, существует ли файл во временной директории
    await fs.access(tempPath);

    // Перемещаем файл
    await fs.rename(tempPath, publicPath);

    return {
      fileName,
      originalName: originalName || fileName,
    };
  } catch (err) {
    throw new Error(`Ошибка при перемещении файла: ${err}`);
  }
};

export const deleteTempFile = async (fileName: string): Promise<void> => {
  const tempPath = path.join(TEMP_DIR, fileName);
  try {
    await fs.unlink(tempPath);
  } catch (err) {
    // Игнорируем ошибку, если файл не существует
    // eslint-disable-next-line no-console
    console.error('Ошибка при удалении временного файла:', err);
  }
};

export { TEMP_DIR, PUBLIC_IMAGES_DIR };
