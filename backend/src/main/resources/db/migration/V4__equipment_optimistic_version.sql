alter table oog_equipment add column version bigint not null default 0;
alter table oog_equipment add constraint oog_equipment_version_nonnegative check (version >= 0);
