ALTER TABLE app_user_profile
  ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE app_user_profile
  ADD COLUMN IF NOT EXISTS auth_user_id UUID;

UPDATE app_user_profile AS profile
SET email = LOWER(auth_user.email)
FROM public."user" AS auth_user
WHERE profile.user_id = auth_user.id
  AND profile.email IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS app_user_profile_email_uidx
  ON app_user_profile (LOWER(email))
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS app_user_profile_auth_user_uidx
  ON app_user_profile (auth_user_id)
  WHERE auth_user_id IS NOT NULL;
