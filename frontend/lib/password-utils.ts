import bcrypt from "bcryptjs";

/* 비밀번호 암호화 */
export const saltAndHashPassword = async (password: string) => {
  const salt = await bcrypt.genSaltSync(10);
  const hash = await bcrypt.hashSync(password, salt);
  return hash;
};

/* DB에 있는 비밀번호 vs 입력받은 비밀번호 비교 */
export const comparePasswords = (
  password: string,
  hashedPassword: string
): boolean => {
  return bcrypt.compareSync(password, hashedPassword);
};
