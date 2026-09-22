-- Sanitized reconstruction based on implemented systems.
-- Fictional fixtures support manual checks of the standalone demo only.

INSERT INTO spaces(id, name)
VALUES ('space-alpha', 'Alpha'), ('space-beta', 'Beta');

INSERT INTO memberships(space_id, user_id, role)
VALUES
  ('space-alpha', 'user-owner', 'owner'),
  ('space-beta', 'user-outsider', 'owner');
