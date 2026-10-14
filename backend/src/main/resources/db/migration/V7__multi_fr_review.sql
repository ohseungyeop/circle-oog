CREATE TABLE oog_multi_fr_review (
 id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES oog_project(id),tenant_id bigint NOT NULL REFERENCES core_tenant,
 cargo_id uuid NOT NULL, input_snapshot jsonb NOT NULL,result jsonb NOT NULL,reason varchar(1000) NOT NULL,
 created_by bigint NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,created_by) REFERENCES core_user_account(tenant_id,user_id)
);
CREATE INDEX oog_multi_fr_review_project_idx ON oog_multi_fr_review(tenant_id,project_id,created_at DESC);
