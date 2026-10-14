DO $$ BEGIN IF current_database()<>'oog' THEN RAISE EXCEPTION 'OOG database required'; END IF; END $$;
CREATE TABLE oog_import_template (
 id uuid PRIMARY KEY, tenant_id bigint NOT NULL REFERENCES core_tenant,
 customer varchar(200) NOT NULL, name varchar(100) NOT NULL, version bigint NOT NULL CHECK(version>0),
 header_fingerprint varchar(64) NOT NULL, detail jsonb NOT NULL, reason varchar(1000) NOT NULL,
 created_by bigint NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,created_by) REFERENCES core_user_account(tenant_id,user_id),
 UNIQUE(tenant_id,customer,name,version)
);
CREATE INDEX oog_import_template_lookup_idx ON oog_import_template(tenant_id,customer,header_fingerprint);
CREATE FUNCTION oog_import_template_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Import template versions are immutable'; END $$;
CREATE TRIGGER oog_import_template_immutable_trigger BEFORE UPDATE OR DELETE ON oog_import_template FOR EACH ROW EXECUTE FUNCTION oog_import_template_immutable();
