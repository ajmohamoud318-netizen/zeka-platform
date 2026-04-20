import { Router } from "express";
import { clerkAuth } from "../../middleware/auth.js";
import { activityController } from "./activity.controller.js";

export const activityRouter = Router();

activityRouter.get("/feed", clerkAuth, activityController.feed);
activityRouter.get("/project-timeline", clerkAuth, activityController.projectTimeline);
activityRouter.post("/daily-log", clerkAuth, activityController.dailyLog);
