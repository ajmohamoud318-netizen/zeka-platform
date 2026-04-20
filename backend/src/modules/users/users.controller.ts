import type { Response } from "express";
import type { AuthedRequest } from "../../middleware/auth.js";
import { usersService } from "./users.service.js";

export const usersController = {
  async me(req: AuthedRequest, res: Response): Promise<void> {
    const u = await usersService.getMe(req.dbUser!);
    res.json({ user: u });
  },
};
