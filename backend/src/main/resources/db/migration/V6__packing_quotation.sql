DO $$ BEGIN IF current_database()<>'oog' THEN RAISE EXCEPTION 'OOG database required'; END IF; END $$;
ALTER TABLE oog_project ADD CONSTRAINT oog_project_tenant_identity UNIQUE(tenant_id,id);
CREATE TABLE oog_packing_rule (
 id uuid PRIMARY KEY,tenant_id bigint NOT NULL REFERENCES core_tenant,packing_type varchar(60) NOT NULL,version bigint NOT NULL CHECK(version>0),
 allowance_length_mm numeric(12,4) NOT NULL CHECK(allowance_length_mm>=0),allowance_width_mm numeric(12,4) NOT NULL CHECK(allowance_width_mm>=0),allowance_height_mm numeric(12,4) NOT NULL CHECK(allowance_height_mm>=0),tare_weight_kg numeric(14,4) NOT NULL CHECK(tare_weight_kg>=0),
 weight_basis varchar(20) NOT NULL CHECK(weight_basis IN ('NET_WEIGHT','GROSS_WEIGHT')),reason varchar(1000) NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),created_by bigint NOT NULL,
 UNIQUE(tenant_id,packing_type,version),FOREIGN KEY(tenant_id,created_by) REFERENCES core_user_account(tenant_id,user_id)
);
CREATE TABLE oog_equipment_rate (
 id uuid PRIMARY KEY,tenant_id bigint NOT NULL REFERENCES core_tenant,equipment_code varchar(30) NOT NULL REFERENCES oog_equipment,
 currency varchar(3) NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),unit_rate numeric(20,4) NOT NULL CHECK(unit_rate>=0),version bigint NOT NULL CHECK(version>0),
 valid_from date NOT NULL,valid_until date CHECK(valid_until IS NULL OR valid_until>=valid_from),reason varchar(1000) NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),created_by bigint NOT NULL,
 UNIQUE(tenant_id,equipment_code,currency,version),FOREIGN KEY(tenant_id,created_by) REFERENCES core_user_account(tenant_id,user_id)
);
CREATE TABLE oog_packing_estimate (
 id uuid PRIMARY KEY,tenant_id bigint NOT NULL,project_id uuid NOT NULL,cargo_id uuid NOT NULL REFERENCES oog_cargo,
 input_snapshot jsonb NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),created_by bigint NOT NULL,
 FOREIGN KEY(tenant_id,project_id) REFERENCES oog_project(tenant_id,id),FOREIGN KEY(tenant_id,created_by) REFERENCES core_user_account(tenant_id,user_id)
);
CREATE TABLE oog_quotation (
 id uuid PRIMARY KEY,tenant_id bigint NOT NULL,project_id uuid NOT NULL,plan_id uuid NOT NULL REFERENCES oog_clp_scenario,
 input_snapshot jsonb NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),created_by bigint NOT NULL,
 FOREIGN KEY(tenant_id,project_id) REFERENCES oog_project(tenant_id,id),FOREIGN KEY(tenant_id,created_by) REFERENCES core_user_account(tenant_id,user_id)
);
CREATE INDEX oog_equipment_rate_effective_idx ON oog_equipment_rate(tenant_id,equipment_code,currency,valid_from,valid_until);
CREATE INDEX oog_packing_estimate_project_idx ON oog_packing_estimate(tenant_id,project_id,created_at DESC);
CREATE INDEX oog_quotation_project_idx ON oog_quotation(tenant_id,project_id,created_at DESC);
CREATE FUNCTION oog_prequote_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Packing and quotation snapshots are immutable'; END $$;
CREATE TRIGGER oog_packing_rule_immutable BEFORE UPDATE OR DELETE ON oog_packing_rule FOR EACH ROW EXECUTE FUNCTION oog_prequote_immutable();
CREATE TRIGGER oog_equipment_rate_immutable BEFORE UPDATE OR DELETE ON oog_equipment_rate FOR EACH ROW EXECUTE FUNCTION oog_prequote_immutable();
CREATE TRIGGER oog_packing_estimate_immutable BEFORE UPDATE OR DELETE ON oog_packing_estimate FOR EACH ROW EXECUTE FUNCTION oog_prequote_immutable();
CREATE TRIGGER oog_quotation_immutable BEFORE UPDATE OR DELETE ON oog_quotation FOR EACH ROW EXECUTE FUNCTION oog_prequote_immutable();
CREATE FUNCTION oog_equipment_rate_period_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.tenant_id::text||'|'||NEW.equipment_code||'|'||NEW.currency,0));
 IF EXISTS(SELECT 1 FROM oog_equipment_rate WHERE tenant_id=NEW.tenant_id AND equipment_code=NEW.equipment_code AND currency=NEW.currency AND valid_from<=COALESCE(NEW.valid_until,'infinity'::date) AND COALESCE(valid_until,'infinity'::date)>=NEW.valid_from)
 THEN RAISE EXCEPTION 'Equipment rate periods overlap' USING ERRCODE='23505'; END IF; RETURN NEW; END $$;
CREATE TRIGGER oog_equipment_rate_period_guard BEFORE INSERT ON oog_equipment_rate FOR EACH ROW EXECUTE FUNCTION oog_equipment_rate_period_guard();
