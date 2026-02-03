import mongoose, { Schema, Model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export interface IToken {
  token: string;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  tokens: IToken[];
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateTokens(): { accessToken: string; refreshToken: string };
}

const userSchema = new Schema<IUser>({
  name: {
    type: String,
    minlength: 2,
    maxlength: 30,
    default: 'Ё-мое',
  },
  email: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      message: 'Некорректный email',
    },
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false,
  },
  tokens: {
    type: [{
      token: {
        type: String,
        required: true,
      },
    }],
    select: false,
    default: [],
  },
});

// Хеширование пароля перед сохранением
userSchema.pre('save', async function preSave(next) {
  if (!this.isModified('password')) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  return next();
});

// Метод для сравнения пароля
userSchema.methods.comparePassword = async function comparePassword(
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Метод для генерации токенов
userSchema.methods.generateTokens = function generateTokens(): {
    accessToken: string;
    refreshToken: string;
    } {
  const { JWT_SECRET = 'secret-key', AUTH_REFRESH_TOKEN_EXPIRY = '7d' } = process.env;
  const accessToken = jwt.sign({ _id: this._id.toString() }, JWT_SECRET, { expiresIn: '10m' });
  const refreshToken = jwt.sign(
    { _id: this._id.toString() },
    JWT_SECRET,
    { expiresIn: AUTH_REFRESH_TOKEN_EXPIRY } as jwt.SignOptions,
  );

  if (!this.tokens) {
    this.tokens = [];
  }
  this.tokens.push({ token: refreshToken });
  this.save().catch((err: Error) => {
    // eslint-disable-next-line no-console
    console.error('Ошибка при сохранении токена:', err);
  });

  return { accessToken, refreshToken };
};

const User: Model<IUser> = mongoose.model<IUser>('user', userSchema);

export default User;
