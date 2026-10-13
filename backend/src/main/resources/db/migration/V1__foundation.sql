create table project (
 id uuid primary key, name varchar(160) not null, customer varchar(160) not null,
 destination varchar(160), status varchar(30) not null, created_at timestamptz not null, version bigint not null default 0
);
create table cargo (
 id uuid primary key, project_id uuid not null references project(id), item_no varchar(120) not null,
 description varchar(500), quantity integer not null check(quantity > 0),
 length double precision not null check(length > 0), width double precision not null check(width > 0),
 height double precision not null check(height > 0), gross_weight double precision not null check(gross_weight > 0),
 net_weight double precision not null default 0, original_length double precision not null default 0,
 original_width double precision not null default 0, original_height double precision not null default 0,
 rotation_allowed boolean not null default false, stackable boolean not null default false, estimated boolean not null default false,
 unique(project_id,item_no)
);
create index cargo_project_idx on cargo(project_id);
create table equipment (
 code varchar(30) primary key, name varchar(100) not null,
 length double precision not null, width double precision not null, height double precision not null,
 payload double precision not null, open_width boolean not null, open_height boolean not null
);
create table carrier_rule (
 equipment_code varchar(30) primary key references equipment(code), carrier varchar(60) not null,
 usable_length_ratio double precision not null, planning_weight_ratio double precision not null,
 max_over_width double precision not null, max_over_height double precision not null, version bigint not null default 0
);
insert into equipment values
 ('40FR','40ft Flat Rack',12000,2400,2200,40000,true,true),
 ('20FR','20ft Flat Rack',5600,2400,2200,30000,true,true),
 ('40HC','40ft High Cube',12032,2352,2698,26500,false,false),
 ('40OT','40ft Open Top',12032,2352,2350,26500,false,true),
 ('20GP','20ft Dry',5898,2352,2393,28000,false,false);
insert into carrier_rule select code,'DEFAULT',0.94,0.90,
 case when open_width then 1600 else 0 end,case when open_height then 1800 else 0 end,0 from equipment;
create table packing_list (
 id uuid primary key, project_id uuid not null references project(id), original_name varchar(255) not null,
 relative_path varchar(500) not null, mapping jsonb not null, created_at timestamptz not null default now()
);
create table clp_scenario (
 id uuid primary key, project_id uuid not null references project(id), result jsonb not null,
 input_snapshot jsonb not null, created_at timestamptz not null default now()
);
create table audit_history (
 id bigserial primary key, project_id uuid references project(id), action varchar(100) not null,
 actor varchar(160) not null, detail jsonb not null, created_at timestamptz not null default now()
);
