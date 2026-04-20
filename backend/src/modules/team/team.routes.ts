import { Router } from "express";
import { clerkAuth, requireRoles } from "../../middleware/auth.js";
import { teamController } from "./team.controller.js";

export const teamRouter = Router();

teamRouter.get("/users", clerkAuth, teamController.list);
teamRouter.post("/users", clerkAuth, requireRoles("team_leader"), teamController.create);
teamRouter.post("/invitations", clerkAuth, requireRoles("team_leader"), teamController.invite);
teamRouter.patch("/users/:id", clerkAuth, requireRoles("team_leader"), teamController.update);
