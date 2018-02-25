package dstore

import (
	"database/sql"
	"time"

	_ "github.com/go-sql-driver/mysql"

	"cretin.co/forge/1.0/app"
	"cretin.co/forge/1.0/context"

	"configurator/config"
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

func init() {
	conn = config.Get("CONFIGURATOR_DB_CONN")
	dbDriver = config.Get("CONFIGURATOR_DB_DRIVER")
}

func CreateProfile(username, password, salt string) (string, error) {
	if c, err := context.NewDataContext("import user", dbDriver, conn); err != nil {
		context.Logf(context.Error, "Error creating data connection: %v", err)
		return "", err
	} else {
		defer c.End()

		handle := app.NewHandle(7)

		if _, err := c.Connection().Exec("INSERT INTO profile SELECT ?,?,?,?,1", handle, username, password, salt); err != nil {
			context.Logf(context.Error, "Could not create user profile: %v", err)
			c.Error(err)

			return "", err
		} else {
			return handle, nil
		}
	}

}

func FetchProfile(username string) (Profile, error) {

	if c, err := context.NewDataContext("fetch user", dbDriver, conn); err != nil {
		context.Logf(context.Error, "Error creating data connection: %v", err)
		return Profile{}, err
	} else {
		p := Profile{}

		defer c.End()

		query := "SELECT handle, username, password, salt, status FROM profile WHERE username = ?"
		result := c.Connection().QueryRow(query, username)

		if err := result.Scan(&p.Handle, &p.Username, &p.Password, &p.Salt, &p.Status); err != nil {
			if err == sql.ErrNoRows {
				return Profile{}, nil
			}

			context.Logf(context.Error, "Could not fetch profile: %v", err)
			c.Error(err)

			return Profile{}, nil
		}

		return p, nil
	}
}

func SetProfileStatus(handle string, status uint8) error {
	if c, err := context.NewDataContext("update profile status", dbDriver, conn); err != nil {
		context.Logf(context.Error, "Error creating data connection: %v", err)
		return err
	} else {
		defer c.End()

		query := "UPDATE profile SET status = ? WHERE handle = ?"
		if _, err := c.Connection().Exec(query, status, handle); err != nil {
			context.Logf(context.Error, "Error updating profile: %v", err)
			c.Error(err)
			return err
		}

		return nil
	}
}

func CreateProject(owner string) (string, error) {
	if c, err := context.NewDataContext("Create Project", dbDriver, conn); err != nil {
		context.Logf(context.Error, "Error creating data connection: %v", err)
		return "", err
	} else {
		defer c.End()

		handle := app.NewHandle(7)
		query := "INSERT INTO project SELECT ?, ?, '', '', '', 10"

		if _, err := c.Connection().Exec(query, handle, owner); err != nil {
			context.Logf(context.Error, "Error creating project: %v", err)
			c.Error(err)
			return "", err
		}

		return handle, nil
	}

}

func FetchAllProjects(owner string) ([]string, error) {
	if c, err := context.NewDataContext("Get Project", dbDriver, conn); err != nil {
		context.Logf(context.Error, "Error creating data connection: %v", err)
		return nil, nil
	} else {
		defer c.End()

		query := "SELECT handle FROM project WHERE owner = ? AND status = ?"

		if rows, err := c.Connection().Query(query, owner, 10); err != nil {
			c.Error(err)
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
}

func FetchProject(owner, handle string) (Project, error) {
	if c, err := context.NewDataContext("Fetch Project", dbDriver, conn); err != nil {
		context.Logf(context.Error, "Error creating data connection: %v", err)
		return Project{}, nil
	} else {
		defer c.End()

		p := Project{}
		query := "SELECT handle, owner, title, description, content, status FROM project WHERE owner = ? AND handle = ?"
		result := c.Connection().QueryRow(query, owner, handle)

		if err := result.Scan(&p.Handle, &p.Owner, &p.Title, &p.Description, &p.Content, &p.Status); err != nil {
			if err == sql.ErrNoRows {
				return Project{}, nil
			}

			context.Logf(context.Error, "Could not fetch project: %v", err)
			c.Error(err)

			return Project{}, err
		}

		return p, nil
	}

}

func UpdateProject(owner string, p Project) error {
	if c, err := context.NewDataContext("Record Event", dbDriver, conn); err != nil {
		context.Logf(context.Error, "Error creating data connection: %v", err)
		return err
	} else {
		defer c.End()

		query := "UPDATE project SET title = ?, description = ?, content = ? WHERE handle = ? AND owner = ?"

		_, err := c.Connection().Exec(query, p.Title, p.Description, p.Content, p.Handle, owner)

		return err
	}

}

func WriteToken(owner, token string, expiration time.Time) error {
	if c, err := context.NewDataContext("Create Token", dbDriver, conn); err != nil {
		context.Logf(context.Error, "Error creating data connection: %v", err)
		return err
	} else {
		defer c.End()

		query := "INSERT INTO token SELECT ?, ?, ?"

		if _, err := c.Connection().Exec(query, token, owner, expiration); err != nil {
			context.Logf(context.Error, "Could not create user token: %v", err)
			return err
		}

		return nil
	}
}

func VerifyToken(owner, token string) error {
	if c, err := context.NewDataContext("Verify Token", dbDriver, conn); err != nil {
		context.Logf(context.Error, "Error creating data connection: %v", err)
		return err
	} else {
		defer c.End()

		query := "SELECT 1 FROM token WHERE owner = ? AND token = ? AND expiresOn >= now()"

		if row, err := c.Connection().Query(query, owner, token); err != nil {
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
}

func RecordEvent(subject string, rType uint8, details string) error {
	if c, err := context.NewDataContext("Record Event", dbDriver, conn); err != nil {
		context.Logf(context.Error, "Error creating data connection: %v", err)
		return err
	} else {
		defer c.End()

		query := "INSERT INTO event SELECT ?, ?, ?, ?"

		if _, err := c.Connection().Exec(query, subject, rType, details, time.Now()); err != nil {
			context.Logf(context.Error, "Could not record event: %v", err)
			c.Error(err)

			return err
		}

		return nil
	}
}
