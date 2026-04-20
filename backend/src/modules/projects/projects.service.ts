import { z } from "zod";
import { AppError, assert } from "../../lib/errors.js";
import { computeProgressPercent } from "../../lib/progress.js";
import type { DbUser, ProjectStatus } from "../../types/domain.js";
import { usersRepository } from "../users/users.repository.js";
import { approvalsRepository } from "../approvals/approvals.repository.js";
import { approvalsService } from "../approvals/approvals.service.js";
import { projectsRepository, type ProjectRow } from "./projects.repository.js";

const STATUS_ORDER: ProjectStatus[] = [
  "new",
  "active",
  "demo",
  "ozalit_onay",
  "uretim",
  "satis",
  "completed",
];

function forwardNext(s: ProjectStatus): ProjectStatus | null {
  const i = STATUS_ORDER.indexOf(s);
  if (i < 0 || i >= STATUS_ORDER.length - 1) return null;
  return STATUS_ORDER[i + 1]!;
}

type TransitionKind = "new_to_active" | "forward" | "ozalit_to_uretim" | "ozalit_to_demo";

function classifyTransition(from: ProjectStatus, to: ProjectStatus): TransitionKind {
  if (from === "new" && to === "active") {
    return "new_to_active";
  }
  if (from === "ozalit_onay" && to === "uretim") {
    return "ozalit_to_uretim";
  }
  if (from === "ozalit_onay" && to === "demo") {
    return "ozalit_to_demo";
  }
  if (forwardNext(from) === to) {
    return "forward";
  }
  throw new AppError(400, `Invalid status transition from ${from} to ${to}`);
}

const createSchema = z.object({
  name: z.string().min(1),
  shortDescription: z.string(),
  printHouse: z.string(),
  startDate: z.string().nullable().optional(),
  totalPageCount: z.number().int().min(0),
  hasKapak: z.boolean(),
  hasKutu: z.boolean(),
  hasMedya: z.boolean(),
});

const patchCoreSchema = z.object({
  name: z.string().min(1).optional(),
  shortDescription: z.string().optional(),
  printHouse: z.string().optional(),
  startDate: z.string().nullable().optional(),
  totalPageCount: z.number().int().min(0).optional(),
  hasKapak: z.boolean().optional(),
  hasKutu: z.boolean().optional(),
  hasMedya: z.boolean().optional(),
  designerApproverId: z.string().uuid().nullable().optional(),
  printerUserId: z.string().uuid().nullable().optional(),
});

const patchProgressSchema = z.object({
  completedPageCount: z.number().int().min(0).optional(),
  kapakComplete: z.boolean().optional(),
  kutuComplete: z.boolean().optional(),
  medyaComplete: z.boolean().optional(),
});

const statusSchema = z.object({
  status: z.enum([
    "new",
    "active",
    "demo",
    "ozalit_onay",
    "uretim",
    "satis",
    "completed",
  ]),
});

function projectProgressPayload(p: ProjectRow) {
  return {
    totalPageCount: p.total_page_count,
    completedPageCount: p.completed_page_count,
    hasKapak: p.has_kapak,
    hasKutu: p.has_kutu,
    hasMedya: p.has_medya,
    kapakComplete: p.kapak_complete,
    kutuComplete: p.kutu_complete,
    medyaComplete: p.medya_complete,
  };
}

export const projectsService = {
  list(): Promise<ProjectRow[]> {
    return projectsRepository.listAll();
  },

  async getEnriched(projectId: string) {
    const p = await projectsRepository.findById(projectId);
    assert(p, 404, "Project not found");
    const progressPercent = computeProgressPercent(projectProgressPayload(p));
    const designerIds = await projectsRepository.listDesignerIds(projectId);
    return { project: p, progressPercent, designerIds };
  },

  async create(actor: DbUser, raw: unknown): Promise<ProjectRow> {
    assert(actor.role === "team_leader", 403, "Only team leaders can create projects");
    const body = createSchema.parse(raw);
    return projectsRepository.insert({
      name: body.name,
      shortDescription: body.shortDescription,
      printHouse: body.printHouse,
      startDate: body.startDate ?? null,
      totalPageCount: body.totalPageCount,
      hasKapak: body.hasKapak,
      hasKutu: body.hasKutu,
      hasMedya: body.hasMedya,
      teamLeaderId: actor.id,
      createdBy: actor.id,
    });
  },

  async patchCore(actor: DbUser, projectId: string, raw: unknown): Promise<ProjectRow> {
    assert(actor.role === "team_leader", 403, "Only team leaders can edit project fields");
    const body = patchCoreSchema.parse(raw);
    const existing = await projectsRepository.findById(projectId);
    assert(existing, 404, "Project not found");

    if (body.designerApproverId) {
      const ok = await projectsRepository.isDesignerOnProject(projectId, body.designerApproverId);
      assert(ok, 400, "Designer approver must be assigned to the project");
      const u = await usersRepository.findById(body.designerApproverId);
      assert(u?.role === "designer", 400, "Designer approver must be a designer");
      assert(u?.can_approve_ozalit, 400, "Designer approver must have Ozalit approval permission");
    }

    if (body.printerUserId) {
      const u = await usersRepository.findById(body.printerUserId);
      assert(u?.is_active, 400, "Printer user must be active");
    }

    if (body.totalPageCount !== undefined && body.totalPageCount < existing.completed_page_count) {
      throw new AppError(400, "total_page_count cannot be less than completed_page_count");
    }

    const updated = await projectsRepository.updateCore(projectId, {
      name: body.name,
      shortDescription: body.shortDescription,
      printHouse: body.printHouse,
      startDate: body.startDate,
      totalPageCount: body.totalPageCount,
      hasKapak: body.hasKapak,
      hasKutu: body.hasKutu,
      hasMedya: body.hasMedya,
      designerApproverId: body.designerApproverId,
      printerUserId: body.printerUserId,
    });
    assert(updated, 404, "Project not found");

    return updated;
  },

  async patchProgress(actor: DbUser, projectId: string, raw: unknown): Promise<ProjectRow> {
    if (actor.role === "manager") {
      throw new AppError(403, "Managers cannot edit progress");
    }
    const body = patchProgressSchema.parse(raw);
    const existing = await projectsRepository.findById(projectId);
    assert(existing, 404, "Project not found");

    const isTl = actor.role === "team_leader";
    const onProject = await projectsRepository.isDesignerOnProject(projectId, actor.id);
    if (!isTl && !onProject) {
      throw new AppError(403, "Only assigned designers or team leaders can update progress");
    }

    if (body.completedPageCount !== undefined && body.completedPageCount > existing.total_page_count) {
      throw new AppError(400, "completed_page_count cannot exceed total_page_count");
    }

    if (existing.status === "completed") {
      throw new AppError(400, "Progress cannot be updated on a completed project");
    }

    if (body.kapakComplete !== undefined && !existing.has_kapak) {
      throw new AppError(400, "Kapak is not enabled for this project");
    }
    if (body.kutuComplete !== undefined && !existing.has_kutu) {
      throw new AppError(400, "Kutu is not enabled for this project");
    }
    if (body.medyaComplete !== undefined && !existing.has_medya) {
      throw new AppError(400, "Medya is not enabled for this project");
    }

    const next = await projectsRepository.updateProgress(projectId, {
      completedPageCount: body.completedPageCount,
      kapakComplete: body.kapakComplete,
      kutuComplete: body.kutuComplete,
      medyaComplete: body.medyaComplete,
    });
    assert(next, 404, "Project not found");

    const logs: { field: string; old: string | null; new: string | null }[] = [];
    if (body.completedPageCount !== undefined) {
      logs.push({
        field: "completed_page_count",
        old: String(existing.completed_page_count),
        new: String(body.completedPageCount),
      });
    }
    if (body.kapakComplete !== undefined) {
      logs.push({
        field: "kapak_complete",
        old: String(existing.kapak_complete),
        new: String(body.kapakComplete),
      });
    }
    if (body.kutuComplete !== undefined) {
      logs.push({
        field: "kutu_complete",
        old: String(existing.kutu_complete),
        new: String(body.kutuComplete),
      });
    }
    if (body.medyaComplete !== undefined) {
      logs.push({
        field: "medya_complete",
        old: String(existing.medya_complete),
        new: String(body.medyaComplete),
      });
    }

    for (const l of logs) {
      await projectsRepository.appendProgressLog({
        projectId,
        userId: actor.id,
        fieldName: l.field,
        oldValue: l.old,
        newValue: l.new,
      });
    }

    return next;
  },

  async assignDesigner(actor: DbUser, projectId: string, raw: unknown): Promise<ProjectRow> {
    const { userId } = z.object({ userId: z.string().uuid() }).parse(raw);
    assert(actor.role === "team_leader", 403, "Only team leaders can assign designers");
    const project = await projectsRepository.findById(projectId);
    assert(project, 404, "Project not found");
    if (project.status === "completed") {
      throw new AppError(400, "Cannot assign designers on a completed project");
    }
    const u = await usersRepository.findById(userId);
    assert(u?.role === "designer", 400, "User must be a designer");
    assert(u.is_active, 400, "User must be active");

    await projectsRepository.addDesigner(projectId, userId);

    if (project.status === "new") {
      const count = await projectsRepository.countDesigners(projectId);
      if (count >= 1) {
        await projectsRepository.setStatus(projectId, "active");
        await projectsRepository.appendStatusHistory({
          projectId,
          fromStatus: "new",
          toStatus: "active",
          changedBy: actor.id,
          note: "Automatic: designer assigned",
        });
      }
    }

    const refreshed = await projectsRepository.findById(projectId);
    assert(refreshed, 404, "Project not found");
    return refreshed;
  },

  async unassignDesigner(actor: DbUser, projectId: string, userId: string): Promise<void> {
    assert(actor.role === "team_leader", 403, "Only team leaders can unassign designers");
    await projectsRepository.removeDesigner(projectId, userId);
  },

  async changeStatus(actor: DbUser, projectId: string, raw: unknown): Promise<ProjectRow> {
    assert(actor.role === "team_leader", 403, "Only team leaders can change project status");
    const { status: newStatus } = statusSchema.parse(raw);
    const p = await projectsRepository.findById(projectId);
    assert(p, 404, "Project not found");

    if (p.status === newStatus) {
      return p;
    }

    if (newStatus === "ozalit_onay") {
      assert(p.designer_approver_id, 400, "Set a designer approver before Ozalit Onay");
      assert(p.printer_user_id, 400, "Set a printer approver before Ozalit Onay");
      const daOn = await projectsRepository.isDesignerOnProject(projectId, p.designer_approver_id);
      assert(daOn, 400, "Designer approver must be assigned to the project");
      const daUser = await usersRepository.findById(p.designer_approver_id);
      assert(daUser?.role === "designer", 400, "Designer approver must be a designer");
      assert(daUser?.can_approve_ozalit, 400, "Designer approver must have Ozalit approval permission");
    }

    const kind = classifyTransition(p.status, newStatus);

    if (kind === "ozalit_to_uretim") {
      await approvalsService.ensureOzalitRoundForProject(projectId);
      const round = await approvalsRepository.getCurrentRound(projectId);
      assert(round, 400, "Ozalit round missing");
      const allOk = await approvalsRepository.allApprovedInRound(round.id);
      if (!allOk) {
        throw new AppError(400, "Cannot move to Üretim until all Ozalit approvals are approved");
      }
    }

    const updated = await projectsRepository.setStatus(projectId, newStatus);
    assert(updated, 404, "Project not found");

    await projectsRepository.appendStatusHistory({
      projectId,
      fromStatus: p.status,
      toStatus: newStatus,
      changedBy: actor.id,
    });

    if (newStatus === "ozalit_onay") {
      await approvalsService.ensureOzalitRoundForProject(projectId);
    }

    return updated;
  },
};
