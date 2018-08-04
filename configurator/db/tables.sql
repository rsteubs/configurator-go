CREATE TABLE IF NOT EXISTS account
(
	handle varbinary(12) PRIMARY KEY NOT NULL,
	username nvarchar(50) NOT NULL,
	password varbinary(70)  NOT NULL,
	salt varbinary(5) NOT NULL,
	status tinyint NOT NULL,
	recordDate datettime NOT NULL,
	
	INDEX ix_account_username_status (username, status)
);

CREATE TABLE IF NOT EXISTS profile
(
	handle varbinary(12) PRIMARY KEY NOT NULL,
	name varbinary(100) NOT NULL,
	company varbinary(100) NOT NULL,
	title varbinary(100) NOT NULL,
	phoneNumber varbinary(30) NOT NULL,
	status tinyint NOT NULL,
	recordDate datettime NOT NULL,
	
	INDEX ix_profile_handle_status (handle, status)
);

CREATE TABLE IF NOT EXISTS project
(
	handle varbinary(12) PRIMARY KEY NOT NULL,
	owner varbinary(12) NOT NULL,
	title nvarchar(50) NOT NULL,
	description nvarchar(140) NOT NULL,
	meta nvarchar(100000) NOT NULL,
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
	handle varbinary(60) NOT NULL,
	owner varbinary(12) NOT NULL,
	expiresOn datetime NOT NULL,
	
	UNIQUE INDEX uq_token_handle (handle),
	INDEX ix_token_owner (owner)
);