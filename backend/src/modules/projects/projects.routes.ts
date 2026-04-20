import { Router } from "express";
import { clerkAuth } from "../../middleware/auth.js";
import { projectsController } from "./projects.controller.js";

export const projectsRouter = Router();

projectsRouter.get("/", clerkAuth, projectsController.list);
projectsRouter.get("/:id", clerkAuth, projectsController.getOne);
projectsRouter.post("/", clerkAuth, projectsController.create);
projectsRouter.patch("/:id", clerkAuth, projectsController.patch);
projectsRouter.patch("/:id/progress", clerkAuth, projectsController.patchProgress);
projectsRouter.post("/:id/designers", clerkAuth, projectsController.assignDesigner);
projectsRouter.delete("/:id/designers/:userId", clerkAuth, projectsController.unassignDesigner);
projectsRouter.patch("/:id/status", clerkAuth, projectsController.changeStatus);
