package dstore

import (
	"database/sql"
	"time"

	"cretin.co/forge/1.0/app"
	"cretin.co/forge/1.0/context"
	"cretin.co/forge/1.0/context/dataContext"
)

type Profile struct {
	Handle string
	Username string
	Password string
	Salt string
	Status uint8
}

type Project struct {
	Handle string
	Owner string
	Title string
	Description string
	Content string
	Status uint8
}

CreateProfile(username, password string) (string, error) {
	c := dataContext.Create("import user")

	defer c.End()

	handle := app.NewHandle(7)

	// handle | username | password | salt | status
	if _, err := c.Connection().exec("INSERT INTO profile SELECT ?,?,?,?,?", handle, username, password, salt, active); err != nil {
		context.Logf(context.error, "Could not create user profile: %v", err)
		c.Error(err)

		return "", err
	} else {
		return handle, nil
	}

}

FetchProfile(username string) (Profile, error) {
	c := dataContext.Create("fetch user")
	p := Profile{}

	defer c.End()

	query := "SELECT handle, username, password, salt, status FROM profile WHERE username = ?"
	result := c.Connection().QueryRow(query, username)

	if err := result.RowScan(&p.Handle, &p.Username, &p.Password, &p.Salt, &p.Status); err != nil {
		if err == sql.ErrNoRows {
			return Profile{}, nil
		}

		context.Logf(context.error, "Could not fetch profile: %v", err)
		c.Error(err)

		return Profile{}, nil
	}

	return p, nil
}

SetProfileStatus(handle string, status uint8) err {
	c := dataContext.Create("update profile status")

	defer c.End()

	query := "UPDATE profile SET status = ? WHERE handle = ?"
	if _, err := c.Connection().Exec(query, status, handle); err != nil {
		context.Logf(context.Error, "Error updating profile: %v", err)
		c.Error(err)
		return err
	}

	return nil
}

CreateProject(owner string) (string, error) {
	c := dataContext.Create("Create Project")

	defer c.End()

	handle := app.NewHandle(7)
	query := "INSERT INTO project SELECT  ?,? '', '', '', ?"

	if _ err := c.Connection.Exec(query, handle, owner, active); err != nil {
		context.Logf(context.Error, "Error creating project: %v", err)
		c.Error(err)
		return err
	}

	return handle, nil
}

FetchProject(handle string) (Project, error) {
	c := dataContext.Create("Fetch Project")

	defer c.End()

	p := Project{}
	query := "SELECT handle, owner, title, description, content, status FROM project WHERE handle = ?"
	result := c.Connection().QueryRow(query, handle)

	if err := result.RowScan(&p.Handle, &p.Owner, &p.Title, &p.Description, &p.Content, &p.Status); err != nil {
		if err == sql.ErrNoRows {
			return Project{}, nil
		}

		context.Logf(context.error, "Could not fetch project: %v", err)
		c.Error(err)

		return Project{}, err
	}

	return p, nil
}

UpdateProject(owner, project, title, description, content string) error {
	c := dataContext.Create("Record Event")

	defer c.End()

	query := "UPDATE profile SET title = ?, description = ?, content = ? WHERE handle = ? AND owner = ?"

	return c.Connection().Exec(query, title, description, content, project, owner)
}

RecordEvent(subject string, type uint8, details string) error {
	c := dataContext.Create("Record Event")

	defer c.End()

	query := "INSERT INTO event SELECT ?, ?, ?, ?"

	if err := c.Connection().Exec(query, subject, type, details, time.Now()); err != nil {
		context.Logf(context.error, "Could not record event: %v", err)
		c.Error(err)

		return err
	}

	return nil
}