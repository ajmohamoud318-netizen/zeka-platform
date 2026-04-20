import type { Response } from "express";
import type { AuthedRequest } from "../../middleware/auth.js";
import { AppError } from "../../lib/errors.js";
import { computeProgressPercent } from "../../lib/progress.js";
import { projectsService } from "./projects.service.js";

function progressPayload(p: {
  total_page_count: number;
  completed_page_count: number;
  has_kapak: boolean;
  has_kutu: boolean;
  has_medya: boolean;
  kapak_complete: boolean;
  kutu_complete: boolean;
  medya_complete: boolean;
}) {
  return computeProgressPercent({
    totalPageCount: p.total_page_count,
    completedPageCount: p.completed_page_count,
    hasKapak: p.has_kapak,
    hasKutu: p.has_kutu,
    hasMedya: p.has_medya,
    kapakComplete: p.kapak_complete,
    kutuComplete: p.kutu_complete,
    medyaComplete: p.medya_complete,
  });
}

export const projectsController = {
  async list(_req: AuthedRequest, res: Response): Promise<void> {
    const projects = await projectsService.list();
    res.json({
      projects: projects.map((p) => ({
        ...p,
        progressPercent: progressPayload(p),
      })),
    });
  },

  async getOne(req: AuthedRequest, res: Response): Promise<void> {
    const data = await projectsService.getEnriched(req.params.id);
    res.json({
      ...data,
      progressPercent: data.progressPercent,
    });
  },

  async create(req: AuthedRequest, res: Response): Promise<void> {
    try {
      const p = await projectsService.create(req.dbUser!, req.body);
      res.status(201).json({ project: { ...p, progressPercent: progressPayload(p) } });
    } catch (e) {
      if (e instanceof AppError) {
        res.status(e.statusCode).json({ error: e.message, code: e.code });
        return;
      }
      throw e;
    }
  },

  async patch(req: AuthedRequest, res: Response): Promise<void> {
    try {
      const p = await projectsService.patchCore(req.dbUser!, req.params.id, req.body);
      res.json({ project: { ...p, progressPercent: progressPayload(p) } });
    } catch (e) {
      if (e instanceof AppError) {
        res.status(e.statusCode).json({ error: e.message, code: e.code });
        return;
      }
      throw e;
    }
  },

  async patchProgress(req: AuthedRequest, res: Response): Promise<void> {
    try {
      const p = await projectsService.patchProgress(req.dbUser!, req.params.id, req.body);
      res.json({ project: { ...p, progressPercent: progressPayload(p) } });
    } catch (e) {
      if (e instanceof AppError) {
        res.status(e.statusCode).json({ error: e.message, code: e.code });
        return;
      }
      throw e;
    }
  },

  async assignDesigner(req: AuthedRequest, res: Response): Promise<void> {
    try {
      const p = await projectsService.assignDesigner(req.dbUser!, req.params.id, req.body);
      res.json({ project: { ...p, progressPercent: progressPayload(p) } });
    } catch (e) {
      if (e instanceof AppError) {
        res.status(e.statusCode).json({ error: e.message, code: e.code });
        return;
      }
      throw e;
    }
  },

  async unassignDesigner(req: AuthedRequest, res: Response): Promise<void> {
    try {
      await projectsService.unassignDesigner(req.dbUser!, req.params.id, req.params.userId);
      res.status(204).send();
    } catch (e) {
      if (e instanceof AppError) {
        res.status(e.statusCode).json({ error: e.message, code: e.code });
        return;
      }
      throw e;
    }
  },

  async changeStatus(req: AuthedRequest, res: Response): Promise<void> {
    try {
      const p = await projectsService.changeStatus(req.dbUser!, req.params.id, req.body);
      res.json({ project: { ...p, progressPercent: progressPayload(p) } });
    } catch (e) {
      if (e instanceof AppError) {
        res.status(e.statusCode).json({ error: e.message, code: e.code });
        return;
      }
      throw e;
    }
  },
};
