import jwt from 'jsonwebtoken';

export interface IAuthService {
  validateToken(token: string): Promise<any>;
  generateToken(payload: any): string;
}

export class AuthService implements IAuthService {
  private jwtSecret: string;

  constructor(jwtSecret?: string) {
    this.jwtSecret = jwtSecret || process.env.JWT_SECRET || 'default-secret';
  }

  async validateToken(token: string): Promise<any> {
    return jwt.verify(token, this.jwtSecret);
  }

  generateToken(payload: any): string {
    return jwt.sign(payload, this.jwtSecret, { expiresIn: '7d' });
  }
}
