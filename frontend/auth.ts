import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import { comparePasswords } from "./lib/password-utils";
export const { handlers, auth, signIn, signOut } = NextAuth({
  useSecureCookies: process.env.NODE_ENV === "production",
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "example@example.com",
        },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // 1. 모든 값들이 정상적으로 들어왔는가
        const { email, password } = credentials;
        if (!credentials || !email || !password) {
          throw new Error("이메일과 비밀번호를 입력해주세요.");
        }

        // 2.DB에서 유저 찾기
        const user = await prisma.user.findUnique({
          where: { email: email as string },
        });
        if (!user) {
          throw new Error("존재하지 않는 이메일입니다.");
        }
        // 3. 비밀번호 일치 여부 확인
        const passwordsMatch = comparePasswords(
          password as string,
          user.hashedPassword as string
        );
        if (!passwordsMatch) {
          throw new Error("비밀번호가 일치하지 않습니다.");
        }
        return user;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {},
  callbacks: {},
});
