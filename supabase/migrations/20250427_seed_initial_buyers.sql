
-- Seed initial buyers
INSERT INTO public.case_buyers (name, url, user_id)
VALUES
  ('NIB', 'https://nationalinjurybureau.leadspedia.net/affiliate/index.html', auth.uid()),
  ('TortExperts', 'https://tortexternal.cloud.looker.com/dashboards/tortexperts::ppr_purvis', auth.uid()),
  ('LCA', 'https://legalclaimassistant.support/auth/login', auth.uid()),
  ('Bridge', 'https://lookerstudio.google.com/u/0/reporting/8ee669bb-96ff-4a1e-8a23-b2e715973938/page/p_251b6llhed', auth.uid());
