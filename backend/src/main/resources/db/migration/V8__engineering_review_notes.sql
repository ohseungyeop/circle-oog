DO $$ BEGIN IF current_database()<>'oog' THEN RAISE EXCEPTION 'OOG database required'; END IF; END $$;
CREATE TABLE oog_engineering_review (
 id uuid PRIMARY KEY, tenant_id bigint NOT NULL REFERENCES core_tenant,
 project_id uuid NOT NULL REFERENCES oog_project(id), plan_id uuid NOT NULL REFERENCES oog_clp_scenario(id),
 author_id bigint NOT NULL, status varchar(40) NOT NULL, detail jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,author_id) REFERENCES core_user_account(tenant_id,user_id),
 CHECK(status IN('NEEDS_REVIEW','REVIEW_RECORDED_NOT_APPROVED'))
);
CREATE INDEX oog_engineering_review_plan_idx ON oog_engineering_review(tenant_id,project_id,plan_id,created_at DESC);
