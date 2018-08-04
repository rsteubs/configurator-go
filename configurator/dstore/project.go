package dstore

import (
	"database/sql"

	"github.com/cptcretin/forge/app"
	"github.com/cptcretin/forge/context"
)

type Project struct {
	Handle      string
	Owner       string
	Title       string
	Description string
	Meta        string
	Content     string
	Status      uint8
}

func CreateProject(owner string, status uint8, c *context.C) (string, error) {
	db := c.NewDB(context.DefaultDB, "Create Project")
	query := "INSERT INTO project SELECT ?, ?, '', '', '', '', ?"

	handle := app.NewHandle(7)

	if _, err := db.Connection().Exec(query, handle, owner, status); err != nil {
		context.Logf(context.Error, "Error creating project: %v", err)
		db.Error(err)
		return "", err
	}

	return handle, nil
}

func FetchAllProjects(owner string, status uint8, c *context.C) ([]string, error) {
	db := c.NewDB(context.DefaultDB, "Get Project")
	query := "SELECT handle FROM project WHERE owner = ? AND status = ?"

	if rows, err := db.Connection().Query(query, owner, status); err != nil {
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

func FetchProject(owner, handle string, c *context.C) (Project, error) {
	db := c.NewDB(context.DefaultDB, "Fetch Project")
	query := "SELECT handle, owner, title, description, meta, content, status FROM project WHERE owner = ? AND handle = ?"

	p := Project{}
	result := db.Connection().QueryRow(query, owner, handle)

	var (
		title       string
		description string
		meta        string
	)

	if err := result.Scan(&p.Handle, &p.Owner, &title, &description, &meta, &p.Content, &p.Status); err != nil {
		if err == sql.ErrNoRows {
			return Project{}, nil
		}

		context.Logf(context.Error, "Could not fetch project: %v", err)
		db.Error(err)

		return Project{}, err
	}

	p.Title = _readEncodedColumn("Title", handle, title)
	p.Description = _readEncodedColumn("Description", handle, description)
	p.Meta = _readEncodedColumn("Meta", handle, meta)

	return p, nil
}

func UpdateProject(owner string, p Project, c *context.C) error {
	db := c.NewDB(context.DefaultDB, "Record Event")
	query := "UPDATE project SET title = ?, description = ?, meta = ?, content = ?, status = ? WHERE handle = ? AND owner = ?"

	_, err := db.Connection().Exec(query, encodeToString([]byte(p.Title)), encodeToString([]byte(p.Description)), encodeToString([]byte(p.Meta)), p.Content, p.Status, p.Handle, owner)

	return err
}
