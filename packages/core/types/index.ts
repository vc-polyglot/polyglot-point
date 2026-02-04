export interface User {
  id: string;
  email: string;
  createdAt: Date;
}

export interface TokenPayload {
  userId: string;
  email: string;
}
