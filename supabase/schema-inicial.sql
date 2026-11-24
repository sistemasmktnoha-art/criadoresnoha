BEGIN;
CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TABLE public.app_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    data_key text NOT NULL,
    data jsonb DEFAULT '[]'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.faqs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question text NOT NULL,
    answer text DEFAULT ''::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.inbox_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL
);
CREATE VIEW public.influencers_public AS
 SELECT (inf.value ->> 'id'::text) AS id,
    (inf.value ->> 'name'::text) AS display_name,
    (inf.value ->> 'username'::text) AS username,
    ('https://instagram.com/'::text || (inf.value ->> 'username'::text)) AS profile_url
   FROM (public.app_data ad
     CROSS JOIN LATERAL jsonb_array_elements(ad.data) inf(value))
  WHERE ((ad.data_key = 'influencers'::text) AND (jsonb_typeof(ad.data) = 'array'::text) AND (COALESCE((inf.value ->> 'username'::text), ''::text) <> ''::text));
CREATE TABLE public.login_change_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    code_hash text NOT NULL,
    new_email text,
    new_password text,
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.app_data
    ADD CONSTRAINT app_data_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.app_data
    ADD CONSTRAINT app_data_user_id_data_key_key UNIQUE (user_id, data_key);
ALTER TABLE ONLY public.faqs
    ADD CONSTRAINT faqs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.inbox_submissions
    ADD CONSTRAINT inbox_submissions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.login_change_requests
    ADD CONSTRAINT login_change_requests_pkey PRIMARY KEY (id);
CREATE INDEX inbox_submissions_status_idx ON public.inbox_submissions USING btree (status, created_at DESC);
CREATE TRIGGER update_faqs_updated_at BEFORE UPDATE ON public.faqs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_login_change_requests_updated_at BEFORE UPDATE ON public.login_change_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE ONLY public.app_data
    ADD CONSTRAINT app_data_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.login_change_requests
    ADD CONSTRAINT login_change_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE POLICY "App users can delete faqs" ON public.faqs FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.app_data
  WHERE (app_data.user_id = auth.uid()))));
CREATE POLICY "App users can delete submissions" ON public.inbox_submissions FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.app_data
  WHERE (app_data.user_id = auth.uid()))));
CREATE POLICY "App users can insert faqs" ON public.faqs FOR INSERT TO authenticated WITH CHECK (((EXISTS ( SELECT 1
   FROM public.app_data
  WHERE (app_data.user_id = auth.uid()))) AND (length(TRIM(BOTH FROM question)) > 0)));
CREATE POLICY "App users can read faqs" ON public.faqs FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.app_data
  WHERE (app_data.user_id = auth.uid()))));
CREATE POLICY "App users can read submissions" ON public.inbox_submissions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.app_data
  WHERE (app_data.user_id = auth.uid()))));
CREATE POLICY "App users can update faqs" ON public.faqs FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.app_data
  WHERE (app_data.user_id = auth.uid())))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.app_data
  WHERE (app_data.user_id = auth.uid()))) AND (length(TRIM(BOTH FROM question)) > 0)));
CREATE POLICY "App users can update submissions" ON public.inbox_submissions FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.app_data
  WHERE (app_data.user_id = auth.uid())))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.app_data
  WHERE (app_data.user_id = auth.uid()))) AND (status = ANY (ARRAY['pending'::text, 'converted'::text, 'merged'::text])) AND (jsonb_typeof(raw_data) = 'object'::text)));
CREATE POLICY "Public can submit valid registrations" ON public.inbox_submissions FOR INSERT TO authenticated, anon WITH CHECK (((status = 'pending'::text) AND (jsonb_typeof(raw_data) = 'object'::text) AND (raw_data <> '{}'::jsonb)));
CREATE POLICY "Users can delete their own data" ON public.app_data FOR DELETE USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own data" ON public.app_data FOR INSERT WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can read their own data" ON public.app_data FOR SELECT USING ((auth.uid() = user_id));
CREATE POLICY "Users can update their own data" ON public.app_data FOR UPDATE USING ((auth.uid() = user_id));
ALTER TABLE public.app_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_change_requests ENABLE ROW LEVEL SECURITY;
GRANT ALL ON FUNCTION public.set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;
GRANT ALL ON TABLE public.app_data TO anon;
GRANT ALL ON TABLE public.app_data TO authenticated;
GRANT ALL ON TABLE public.app_data TO service_role;
GRANT ALL ON TABLE public.faqs TO anon;
GRANT ALL ON TABLE public.faqs TO authenticated;
GRANT ALL ON TABLE public.faqs TO service_role;
GRANT ALL ON TABLE public.inbox_submissions TO anon;
GRANT ALL ON TABLE public.inbox_submissions TO authenticated;
GRANT ALL ON TABLE public.inbox_submissions TO service_role;
GRANT ALL ON TABLE public.influencers_public TO anon;
GRANT ALL ON TABLE public.influencers_public TO authenticated;
GRANT ALL ON TABLE public.influencers_public TO service_role;
GRANT ALL ON TABLE public.login_change_requests TO anon;
GRANT ALL ON TABLE public.login_change_requests TO authenticated;
GRANT ALL ON TABLE public.login_change_requests TO service_role;
REVOKE ALL ON TABLE public.influencers_public FROM anon;
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-media', 'app-media', true)
ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Authenticated delete own app-media" ON storage.objects FOR DELETE TO authenticated
  USING (((bucket_id = 'app-media'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
CREATE POLICY "Authenticated read own app-media" ON storage.objects FOR SELECT TO authenticated
  USING (((bucket_id = 'app-media'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
CREATE POLICY "Authenticated update own app-media" ON storage.objects FOR UPDATE TO authenticated
  USING (((bucket_id = 'app-media'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)))
  WITH CHECK (((bucket_id = 'app-media'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
CREATE POLICY "Authenticated upload own app-media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'app-media'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
COMMIT;
