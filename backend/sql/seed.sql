-- Optional dev seed for Aj Mohamoud (Clerk user id set). Run after schema.sql.

INSERT INTO users (clerk_id, email, full_name, role, is_active, can_approve_ozalit)
VALUES (
  'user_3CckShdku5UO6FUm40G99SyTj4H',
  'ajmohamoud318@gmail.com',
  'Aj Mohamoud',
  'team_leader',
  TRUE,
  FALSE
)
ON CONFLICT (clerk_id) DO NOTHING;

INSERT INTO users (clerk_id, email, full_name, role, is_active, can_approve_ozalit)
VALUES (
  'user_3CcoM5BHbYW0Mi96XVqrDdXm49d',
  'user_3CcoM5BHbYW0Mi96XVqrDdXm49d@users.local',
  'Designer',
  'designer',
  TRUE,
  FALSE
)
ON CONFLICT (clerk_id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  can_approve_ozalit = EXCLUDED.can_approve_ozalit;
