import jwt from 'jsonwebtoken';
import type {
  PhoneNumberInterface,
  TokenPayload,
  UserInterface,
} from './types';

export class AuthenticationUtils {
  // Secure password hashing using Bun.password.hash
  static async hashPassword(password: string): Promise<string> {
    return Bun.password.hash(password);
  }

  // Password verification method using Bun.password.verify
  static async verifyPassword(
    inputPassword: string,
    storedHash: string,
  ): Promise<boolean> {
    return Bun.password.verify(inputPassword, storedHash);
  }

  static async generateToken(user: Partial<UserInterface>): Promise<string> {
    // Replace with your actual secret key
    const secretKey = process.env.JWT_SECRET || 'your-secret-key'; // NEVER hardcode secrets in production!

    const token = jwt.sign(
      {
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber as PhoneNumberInterface,
        roles: user.roles,
        email: user.email,
        inviteCode: user.inviteCode,
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
        iat: Math.floor(Date.now() / 1000),
      },
      secretKey,
    );
    return token;
  }

  static verifyToken(token: string): string | TokenPayload {
    // Replace with your actual secret key
    const secretKey = process.env.JWT_SECRET || 'your-secret-key'; // NEVER hardcode secrets in production!
    const verified: TokenPayload = jwt.verify(token, secretKey) as TokenPayload;
    return verified;
  }
}
