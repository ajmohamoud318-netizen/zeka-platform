import type { Response } from "express";
import type { AuthedRequest } from "../../middleware/auth.js";
import { teamService } from "./team.service.js";

export const teamController = {
  async list(req: AuthedRequest, res: Response): Promise<void> {
    const users = await teamService.listUsers();
    res.json({ users });
  },

  async create(req: AuthedRequest, res: Response): Promise<void> {
    const u = await teamService.createUser(req.dbUser!, req.body);
    res.status(201).json({ user: u });
  },

  async invite(req: AuthedRequest, res: Response): Promise<void> {
    await teamService.inviteUser(req.dbUser!, req.body);
    res.status(201).json({ ok: true });
  },

  async update(req: AuthedRequest, res: Response): Promise<void> {
    const u = await teamService.updateUser(req.dbUser!, req.params.id, req.body);
    res.json({ user: u });
  },
};
