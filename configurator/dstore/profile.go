package dstore

import (
	"database/sql"
	"time"

	"cretin.co/forge/1.1/app"
	"cretin.co/forge/1.1/context"
)

type Profile struct {
	Handle   string
	Username string
	Password string
	Company string
	Salt     string
	Status   uint8
}

func CreateProfile(username, company, password, salt string, status uint8, c *context.C) (string, error) {
	db := c.NewDB(context.DefaultDB, "import user")

	handle := app.NewHandle(7)

	if _, err := db.Connection().Exec("INSERT INTO profile SELECT ?,?,?,?,?,?", handle, encodeToString([]byte(username)), encodeToString([]byte(company)), password, salt, status); err != nil {
		context.Logf(context.Error, "Could not create user profile: %v", err)
		db.Error(err)

		return "", err
	} else {
		return handle, nil
	}

}

func FetchProfile(username string, status uint8, c *context.C) (Profile, error) {
	db := c.NewDB(context.DefaultDB, "fetch user")
	p := Profile{}

	query := "SELECT handle, username, company, password, salt, status FROM profile WHERE username = ? and status = ?"
	result := db.Connection().QueryRow(query, username, status)

	uname := ""
	co := ""

	if err := result.Scan(&p.Handle, &uname, &co, &p.Password, &p.Salt, &p.Status); err != nil {
		if err == sql.ErrNoRows {
			return Profile{}, nil
		}

		context.Logf(context.Error, "Could not fetch profile: %v", err)
		db.Error(err)

		return Profile{}, nil
	}

	if val, err := decodeString(uname); err != nil {
		context.Logf(context.Warn, "Could not read username (%s): %v", username, err)
	} else {
		p.Username = string(val)
	}

	if val, err := decodeString(co); err != nil {
		context.Logf(context.Warn, "Could not read company (%s): %v", username, err)
	} else {
		p.Company = string(val)
	}

	return p, nil
}

func SetProfileStatus(handle string, status uint8, c *context.C) error {
	db := c.NewDB(context.DefaultDB, "update profile status")
	query := "UPDATE profile SET status = ? WHERE handle = ?"

	if _, err := db.Connection().Exec(query, status, handle); err != nil {
		context.Logf(context.Error, "Error updating profile: %v", err)
		db.Error(err)
		return err
	}

	return nil
}

func WriteToken(owner, token string, expiration time.Time, c *context.C) error {
	db := c.NewDB(context.DefaultDB, "Create Token")
	query := "INSERT INTO token SELECT ?, ?, ?"

	if _, err := db.Connection().Exec(query, token, owner, expiration); err != nil {
		context.Logf(context.Error, "Could not create user token: %v", err)
		return err
	}

	return nil
}

func VerifyToken(owner, token string, c *context.C) error {
	db := c.NewDB(context.DefaultDB, "Verify Token")
	query := "SELECT 1 FROM token WHERE owner = ? AND token = ? AND expiresOn >= now()"

	if row, err := db.Connection().Query(query, owner, token); err != nil {
		context.Logf(context.Error, "Error validating token: %v", err)
		return err
	} else {
		var found int

		if err := row.Scan(&found); err != nil {
			if err == sql.ErrNoRows {
				return notFoundError()
			} else {
				return err
			}
		} else if found != 1 {
			return notFoundError()
		}

		return nil
	}
}