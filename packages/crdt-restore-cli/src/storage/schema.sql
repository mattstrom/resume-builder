create table if not exists incremental_updates (
	metamodel_id text not null,
	update_id integer not null,
	data bytea not null,
	timestamp double precision not null,
	primary key (metamodel_id, update_id)
);
