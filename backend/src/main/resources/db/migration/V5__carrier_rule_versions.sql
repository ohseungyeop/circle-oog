DO $$ BEGIN IF current_database()<>'oog' THEN RAISE EXCEPTION 'OOG database required'; END IF; END $$;
CREATE TABLE oog_carrier_rule_version (
 id uuid PRIMARY KEY, tenant_id bigint NOT NULL REFERENCES core_tenant,
 carrier varchar(60) NOT NULL CHECK(length(trim(carrier))>0), equipment_code varchar(30) NOT NULL REFERENCES oog_equipment(code),
 version bigint NOT NULL CHECK(version>0), valid_from date NOT NULL, valid_until date CHECK(valid_until IS NULL OR valid_until>=valid_from),
 usable_length_ratio double precision NOT NULL CHECK(usable_length_ratio>=0.1 AND usable_length_ratio<=1),
 planning_weight_ratio double precision NOT NULL CHECK(planning_weight_ratio>=0.1 AND planning_weight_ratio<=1),
 max_over_width double precision NOT NULL CHECK(max_over_width>=0 AND max_over_width<=30000),
 max_over_height double precision NOT NULL CHECK(max_over_height>=0 AND max_over_height<=30000),
 reason varchar(1000) NOT NULL CHECK(length(trim(reason))>0), created_at timestamptz NOT NULL DEFAULT now(),
 created_by bigint NOT NULL, FOREIGN KEY(tenant_id,created_by) REFERENCES core_user_account(tenant_id,user_id),
 UNIQUE(tenant_id,carrier,equipment_code,version)
);
CREATE INDEX oog_carrier_rule_effective_idx ON oog_carrier_rule_version(tenant_id,carrier,equipment_code,valid_from,valid_until);
CREATE FUNCTION oog_carrier_rule_period_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.tenant_id::text||'|'||NEW.carrier||'|'||NEW.equipment_code,0));
 IF EXISTS(SELECT 1 FROM oog_carrier_rule_version WHERE tenant_id=NEW.tenant_id AND carrier=NEW.carrier AND equipment_code=NEW.equipment_code
   AND valid_from<=COALESCE(NEW.valid_until,'infinity'::date) AND COALESCE(valid_until,'infinity'::date)>=NEW.valid_from)
 THEN RAISE EXCEPTION 'Carrier rule effective periods overlap' USING ERRCODE='23505'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER oog_carrier_rule_period_guard BEFORE INSERT ON oog_carrier_rule_version FOR EACH ROW EXECUTE FUNCTION oog_carrier_rule_period_guard();
CREATE FUNCTION oog_carrier_rule_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Carrier rule versions are immutable'; END $$;
CREATE TRIGGER oog_carrier_rule_immutable BEFORE UPDATE OR DELETE ON oog_carrier_rule_version FOR EACH ROW EXECUTE FUNCTION oog_carrier_rule_immutable();
