export type UserRole = "team_leader" | "designer" | "manager";

export type ProjectStatus =
  | "new"
  | "active"
  | "demo"
  | "ozalit_onay"
  | "uretim"
  | "satis"
  | "completed";

export type DbUser = {
  id: string;
  clerk_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  can_approve_ozalit: boolean;
};

export type Project = {
  id: string;
  name: string;
  short_description: string;
  print_house: string;
  start_date: string | null;
  total_page_count: number;
  has_kapak: boolean;
  has_kutu: boolean;
  has_medya: boolean;
  status: ProjectStatus;
  team_leader_id: string;
  designer_approver_id: string | null;
  printer_user_id: string | null;
  completed_page_count: number;
  kapak_complete: boolean;
  kutu_complete: boolean;
  medya_complete: boolean;
  created_by: string;
  designer_ids?: string[];
};

export type ProjectWithProgress = Project & { progressPercent: number };

/** Matches `/api/activity/feed` items */
export type ActivityFeedItem = {
  kind: "status_change" | "progress" | "daily_log";
  at: string;
  project_id: string | null;
  project_name: string | null;
  summary: string;
  actor_name: string | null;
};

export type OzalitApproval = {
  id: string;
  kind: "team_leader" | "designer_approver" | "printer";
  target_user_id: string;
  status: "pending" | "approved" | "rejected";
  acted_by: string | null;
  acted_at: string | null;
  note: string | null;
};

export const STATUS_ORDER: ProjectStatus[] = [
  "new",
  "active",
  "demo",
  "ozalit_onay",
  "uretim",
  "satis",
  "completed",
];

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  new: "New",
  active: "Active",
  demo: "Demo",
  ozalit_onay: "Ozalit Onay",
  uretim: "Üretim",
  satis: "Satış",
  completed: "Completed",
};
