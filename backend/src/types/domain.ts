export type UserRole = "team_leader" | "designer" | "manager";

export type ProjectStatus =
  | "new"
  | "active"
  | "demo"
  | "ozalit_onay"
  | "uretim"
  | "satis"
  | "completed";

export type OzalitApprovalKind = "team_leader" | "designer_approver" | "printer";
export type OzalitApprovalStatus = "pending" | "approved" | "rejected";

export type DbUser = {
  id: string;
  clerk_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  can_approve_ozalit: boolean;
  created_at: string;
  updated_at: string;
};
