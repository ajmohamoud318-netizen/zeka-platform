import type { DbUser } from "../../types/domain.js";
import { usersRepository } from "./users.repository.js";

export const usersService = {
  async getMe(dbUser: DbUser): Promise<DbUser> {
    return dbUser;
  },
};
