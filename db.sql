
-- Drop table

-- DROP TABLE download_requests;

CREATE TABLE download_requests (
	id serial NOT NULL,
	private_key bpchar(32) NOT NULL,
	public_key bpchar(32) NOT NULL,
	"index" int4 NOT NULL,
	CONSTRAINT download_requests_pk PRIMARY KEY (id),
	CONSTRAINT download_requests_un UNIQUE (index)
);

-- Drop table

-- DROP TABLE objects;

CREATE TABLE objects (
	id int4 NOT NULL GENERATED ALWAYS AS IDENTITY,
	hash bpchar(64) NOT NULL,
	extention varchar NULL,
	picture bytea NULL,
	creation_timestamp timestamp NOT NULL DEFAULT now(),
	confirmed bool NOT NULL DEFAULT false,
	CONSTRAINT objects_pk PRIMARY KEY (id),
	CONSTRAINT objects_un UNIQUE (hash)
);
