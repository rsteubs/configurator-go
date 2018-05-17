package dstore

import (
	"database/sql"
	"time"

	_ "github.com/go-sql-driver/mysql"

	"cretin.co/forge/1.1/app"
	"cretin.co/forge/1.1/context"
)

type Profile struct {
	Handle   string
	Username string
	Password string
	Salt     string
	Status   uint8
}

type Project struct {
	Handle      string
	Owner       string
	Title       string
	Description string
	Content     string
	Status      uint8
}

type Error struct {
	msg string
}

var conn, dbDriver string

func (err Error) Error() string {
	return err.msg
}

func notFoundError() Error { return Error{"No data found"} }

func CreateProfile(username, password, salt string, c *context.Context) (string, error) {
	db := c.NewDataContext(context.DefaultDB, "import user")

	handle := app.NewHandle(7)

	if _, err := db.Connection().Exec("INSERT INTO profile SELECT ?,?,?,?,1", handle, username, password, salt); err != nil {
		context.Logf(context.Error, "Could not create user profile: %v", err)
		db.Error(err)

		return "", err
	} else {
		return handle, nil
	}

}

func FetchProfile(username string, c *context.Context) (Profile, error) {
	db := c.NewDataContext(context.DefaultDB, "fetch user")
	p := Profile{}

	query := "SELECT handle, username, password, salt, status FROM profile WHERE username = ?"
	result := db.Connection().QueryRow(query, username)

	if err := result.Scan(&p.Handle, &p.Username, &p.Password, &p.Salt, &p.Status); err != nil {
		if err == sql.ErrNoRows {
			return Profile{}, nil
		}

		context.Logf(context.Error, "Could not fetch profile: %v", err)
		db.Error(err)

		return Profile{}, nil
	}

	return p, nil
}

func SetProfileStatus(handle string, status uint8, c *context.Context) error {
	db := c.NewDataContext(context.DefaultDB, "update profile status")
	query := "UPDATE profile SET status = ? WHERE handle = ?"

	if _, err := db.Connection().Exec(query, status, handle); err != nil {
		context.Logf(context.Error, "Error updating profile: %v", err)
		db.Error(err)
		return err
	}

	return nil
}

func CreateProject(owner string, c *context.Context) (string, error) {
	db := c.NewDataContext(context.DefaultDB, "Create Project")
	query := "INSERT INTO project SELECT ?, ?, '', '', '', 10"

	handle := app.NewHandle(7)

	if _, err := db.Connection().Exec(query, handle, owner); err != nil {
		context.Logf(context.Error, "Error creating project: %v", err)
		db.Error(err)
		return "", err
	}

	return handle, nil
}

func FetchAllProjects(owner string, c *context.Context) ([]string, error) {
	db := c.NewDataContext(context.DefaultDB, "Get Project")
	query := "SELECT handle FROM project WHERE owner = ? AND status = ?"

	if rows, err := db.Connection().Query(query, owner, 10); err != nil {
		db.Error(err)
		return nil, err
	} else {
		var list []string

		for rows.Next() {
			var handle string

			if err := rows.Scan(&handle); err != nil {
				context.Logf(context.Warn, "Error reading project handle: %v", err)
			} else {
				list = append(list, handle)
			}
		}

		return list[:], nil
	}
}

func FetchProject(owner, handle string, c *context.Context) (Project, error) {
	db := c.NewDataContext(context.DefaultDB, "Fetch Project")
	query := "SELECT handle, owner, title, description, content, status FROM project WHERE owner = ? AND handle = ?"

	p := Project{}
	result := db.Connection().QueryRow(query, owner, handle)

	if err := result.Scan(&p.Handle, &p.Owner, &p.Title, &p.Description, &p.Content, &p.Status); err != nil {
		if err == sql.ErrNoRows {
			return Project{}, nil
		}

		context.Logf(context.Error, "Could not fetch project: %v", err)
		db.Error(err)

		return Project{}, err
	}

	return p, nil
}

func UpdateProject(owner string, p Project, c *context.Context) error {
	db := c.NewDataContext(context.DefaultDB, "Record Event")
	query := "UPDATE project SET title = ?, description = ?, content = ? WHERE handle = ? AND owner = ?"

	_, err := db.Connection().Exec(query, p.Title, p.Description, p.Content, p.Handle, owner)

	return err
}

func WriteToken(owner, token string, expiration time.Time, c *context.Context) error {
	db := c.NewDataContext(context.DefaultDB, "Create Token")
	query := "INSERT INTO token SELECT ?, ?, ?"

	if _, err := db.Connection().Exec(query, token, owner, expiration); err != nil {
		context.Logf(context.Error, "Could not create user token: %v", err)
		return err
	}

	return nil
}

func VerifyToken(owner, token string, c *context.Context) error {
	db := c.NewDataContext(context.DefaultDB, "Verify Token")
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

func RecordEvent(subject string, rType uint8, details string, c *context.Context) error {
	db := c.NewDataContext(context.DefaultDB, "Record Event")
	query := "INSERT INTO event SELECT ?, ?, ?, ?"

	if _, err := db.Connection().Exec(query, subject, rType, details, time.Now()); err != nil {
		context.Logf(context.Error, "Could not record event: %v", err)
		db.Error(err)

		return err
	}

	return nil
}
