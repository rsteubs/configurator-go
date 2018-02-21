CREATE TABLE IF NOT EXISTS profile
(
	handle varbinary(12) PRIMARY KEY NOT NULL,
	username nvarchar(20) NOT NULL,
	password varbinary(70)  NOT NULL,
	salt varbinary(5) NOT NULL,
	status tinyint NOT NULL,
	
	UNIQUE INDEX ix_profile_username (username)
);

CREATE TABLE IF NOT EXISTS project
(
	handle varbinary(12) PRIMARY KEY NOT NULL,
	owner varbinary(12) NOT NULL,
	title nvarchar(50) NOT NULL,
	description nvarchar(140) NOT NULL,
	content nvarchar(100000) NOT NULL,
	status tinyint NOT NULL,
	
	INDEX ix_project_owner (owner)
);

CREATE TABLE IF NOT EXISTS eventLog
(
	subject varbinary(12) NOT NULL,
	eventType tinyint NOT NULL,
	detail nvarchar(100000) NOT NULL,
	eventDate DATETIME NOT NULL,
	
	INDEX ix_eventLog_subject (subject)
);

CREATE TABLE IF NOT EXISTS token
(
	handle varbinary(15) NOT NULL,
	owner varbinary(12) NOT NULL,
	expiresOn datetime NOT NULL,
	
	UNIQUE INDEX uq_token_handle (handle),
	INDEX ix_token_owner (owner)
);