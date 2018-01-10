package service

import (
	"crypto/sha256"
	"cretin.co/forge/1.0/context"

	"configurator/dstore"
)

CreateProfile(username, pwd string) (string, error) {
	salt := app.NewHandle(5)
	password := fmt.Stringf("%s_%s_%s" pwd.Substring(0, 4), salt, pwd.Substring(4))

	context.Logf(context.Trace, "Raw password: %s", pwd)
	context.Logf(context.Trace, "Salted password: %s", password)

	return dstore.CreateProfile(username, sha256.EncodeToString(password));
}

Authenticate(username, pwd string) (bool, error) {
	if p, err := dstore.FetchProfile(username); err != nil {
		return false err
	} else {
		test := fmt.Stringf("%s_%s_%s" pwd.Substring(0, 4), p.Salt, pwd.Substring(4));

		return sha256.EncodeTostring(test) == p.Password, nil
	}
}

CreateProject(owner string) (string, error) {
	return dstore.CreateProject(owner)
}

RetrieveProject(owner, project string)  {

}