import { z } from "zod";
import { AppError, assert } from "../../lib/errors.js";
import type { DbUser } from "../../types/domain.js";
import { projectsRepository } from "../projects/projects.repository.js";
import { usersRepository } from "../users/users.repository.js";
import { approvalsRepository } from "./approvals.repository.js";
import { pool } from "../../db/pool.js";

const submitDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  note: z.string().max(2000).nullable().optional(),
});

export const approvalsService = {
  async ensureOzalitRoundForProject(projectId: string): Promise<void> {
    const project = await projectsRepository.findById(projectId);
    if (!project || project.status !== "ozalit_onay") {
      throw new AppError(400, "Project must be in Ozalit Onay status");
    }
    if (!project.designer_approver_id || !project.printer_user_id) {
      throw new AppError(
        400,
        "Designer approver and printer user must be set before Ozalit approvals"
      );
    }

    const daUser = await usersRepository.findById(project.designer_approver_id);
    assert(daUser?.role === "designer", 400, "Designer approver must be a designer");
    assert(daUser?.can_approve_ozalit, 400, "Designer approver must have Ozalit approval permission");

    const existing = await approvalsRepository.getCurrentRound(projectId);
    if (existing) {
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const n = (await approvalsRepository.maxRoundNumber(projectId, client)) + 1;
      const round = await approvalsRepository.createRound(projectId, n, client);
      await approvalsRepository.insertApproval(
        {
          roundId: round.id,
          kind: "team_leader",
          targetUserId: project.team_leader_id,
        },
        client
      );
      await approvalsRepository.insertApproval(
        {
          roundId: round.id,
          kind: "designer_approver",
          targetUserId: project.designer_approver_id!,
        },
        client
      );
      await approvalsRepository.insertApproval(
        {
          roundId: round.id,
          kind: "printer",
          targetUserId: project.printer_user_id!,
        },
        client
      );
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  },

  async getCurrentState(projectId: string) {
    const round = await approvalsRepository.getCurrentRound(projectId);
    if (!round) {
      return { round: null, approvals: [] as const };
    }
    const approvals = await approvalsRepository.listApprovalsForRound(round.id);
    return { round, approvals };
  },

  async submitDecision(actor: DbUser, approvalId: string, raw: unknown) {
    const body = submitDecisionSchema.parse(raw);

    const approval = await approvalsRepository.findApprovalById(approvalId);
    if (!approval) {
      throw new AppError(404, "Approval not found");
    }

    const round = await approvalsRepository.findRoundById(approval.round_id);
    assert(round, 404, "Round not found");

    const project = await projectsRepository.findById(round.project_id);
    assert(project, 404, "Project not found");
    assert(project.status === "ozalit_onay", 400, "Project is not in Ozalit Onay");

    const current = await approvalsRepository.getCurrentRound(round.project_id);
    assert(current && current.id === approval.round_id, 400, "This approval round is not active");

    if (approval.status !== "pending") {
      throw new AppError(400, "Approval already completed");
    }

    if (actor.id !== approval.target_user_id) {
      throw new AppError(403, "Only the assigned approver can act on this approval");
    }

    await approvalsRepository.updateApprovalDecision(approval.id, {
      status: body.decision,
      actedBy: actor.id,
      note: body.note ?? null,
    });

    return approvalsService.getCurrentState(round.project_id);
  },

  async requestApprovalAgain(actor: DbUser, projectId: string) {
    assert(actor.role === "team_leader", 403, "Only team leaders can reset Ozalit approvals");

    const project = await projectsRepository.findById(projectId);
    assert(project, 404, "Project not found");
    assert(project.status === "ozalit_onay", 400, "Project must be in Ozalit Onay");
    assert(project.designer_approver_id && project.printer_user_id, 400, "Missing approver or printer");

    const daUser = await usersRepository.findById(project.designer_approver_id);
    assert(daUser?.role === "designer", 400, "Designer approver must be a designer");
    assert(daUser?.can_approve_ozalit, 400, "Designer approver must have Ozalit approval permission");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await approvalsRepository.supersedeCurrentRound(projectId, client);
      const n = (await approvalsRepository.maxRoundNumber(projectId, client)) + 1;
      const round = await approvalsRepository.createRound(projectId, n, client);
      await approvalsRepository.insertApproval(
        { roundId: round.id, kind: "team_leader", targetUserId: project.team_leader_id },
        client
      );
      await approvalsRepository.insertApproval(
        {
          roundId: round.id,
          kind: "designer_approver",
          targetUserId: project.designer_approver_id!,
        },
        client
      );
      await approvalsRepository.insertApproval(
        { roundId: round.id, kind: "printer", targetUserId: project.printer_user_id! },
        client
      );
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }

    return approvalsService.getCurrentState(projectId);
  },
};
