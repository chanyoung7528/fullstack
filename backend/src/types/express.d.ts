export type JwtPayload = {
  sub: string;
  email?: string;
  name?: string;
  picture?: string | null; // picture가 null일 수도 있다면 이게 더 안전
  iat?: number;
};

declare global {
  namespace Express {
    interface User extends JwtPayload {
      role?: string;
    }
  }
}
