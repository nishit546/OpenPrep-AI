-- Migration to enable PostgreSQL Row-Level Security (RLS) on Exams, StudyPlans, and QuizAttempts

-- 1. Enable RLS on tables
ALTER TABLE "Exams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudyPlans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuizAttempts" ENABLE ROW LEVEL SECURITY;

-- 2. Force RLS for owners/superusers (to ensure enforcement in local development/tests)
ALTER TABLE "Exams" FORCE ROW LEVEL SECURITY;
ALTER TABLE "StudyPlans" FORCE ROW LEVEL SECURITY;
ALTER TABLE "QuizAttempts" FORCE ROW LEVEL SECURITY;

-- 3. Drop existing policies if any
DROP POLICY IF EXISTS exams_tenant_isolation_policy ON "Exams";
DROP POLICY IF EXISTS studyplans_tenant_isolation_policy ON "StudyPlans";
DROP POLICY IF EXISTS quizattempts_tenant_isolation_policy ON "QuizAttempts";

-- 4. Create Policies
CREATE POLICY exams_tenant_isolation_policy ON "Exams"
USING (
  "user"::text = current_setting('app.current_user_id', true)
  OR current_setting('app.is_admin', true) = 'true'
);

CREATE POLICY studyplans_tenant_isolation_policy ON "StudyPlans"
USING (
  "user"::text = current_setting('app.current_user_id', true)
  OR current_setting('app.is_admin', true) = 'true'
);

CREATE POLICY quizattempts_tenant_isolation_policy ON "QuizAttempts"
USING (
  "user"::text = current_setting('app.current_user_id', true)
  OR current_setting('app.is_admin', true) = 'true'
);
