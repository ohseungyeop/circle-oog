DO $$ BEGIN IF current_database()<>'oog' THEN RAISE EXCEPTION 'OOG database required'; END IF; END $$;
CREATE TABLE oog_engineering_calculation (
 id uuid PRIMARY KEY,tenant_id bigint NOT NULL,project_id uuid NOT NULL,plan_id uuid NOT NULL REFERENCES oog_clp_scenario,
 author_id bigint NOT NULL,input_snapshot jsonb NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,project_id) REFERENCES oog_project(tenant_id,id),FOREIGN KEY(tenant_id,author_id) REFERENCES core_user_account(tenant_id,user_id),UNIQUE(tenant_id,id)
);
CREATE TABLE oog_engineering_decision (
 id uuid PRIMARY KEY,tenant_id bigint NOT NULL,calculation_id uuid NOT NULL,reviewer_id bigint NOT NULL,version bigint NOT NULL CHECK(version>0),
 decision varchar(30) NOT NULL CHECK(decision IN ('APPROVED_INTERNAL','REJECTED','REQUEST_REVIEW')),reason varchar(2000) NOT NULL,evidence varchar(2000) NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,calculation_id) REFERENCES oog_engineering_calculation(tenant_id,id),FOREIGN KEY(tenant_id,reviewer_id) REFERENCES core_user_account(tenant_id,user_id),UNIQUE(tenant_id,calculation_id,version)
);
CREATE INDEX oog_engineering_calculation_plan_idx ON oog_engineering_calculation(tenant_id,project_id,plan_id,created_at DESC);
CREATE FUNCTION oog_engineering_calculation_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Engineering calculations and decisions are immutable'; END $$;
CREATE TRIGGER oog_engineering_calculation_immutable BEFORE UPDATE OR DELETE ON oog_engineering_calculation FOR EACH ROW EXECUTE FUNCTION oog_engineering_calculation_immutable();
CREATE TRIGGER oog_engineering_decision_immutable BEFORE UPDATE OR DELETE ON oog_engineering_decision FOR EACH ROW EXECUTE FUNCTION oog_engineering_calculation_immutable();
