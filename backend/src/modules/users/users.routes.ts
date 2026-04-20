import { Router } from "express";
import { clerkAuth } from "../../middleware/auth.js";
import { usersController } from "./users.controller.js";

export const usersRouter = Router();

usersRouter.get("/me", clerkAuth, usersController.me);
