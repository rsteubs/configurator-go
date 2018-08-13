package service

import (
	"reflect"

	"github.com/cptcretin/forge/app"
	"github.com/cptcretin/forge/context"

	"configurator/dstore"
)

type Project struct {
	Handle      string
	Owner       string
	Title       string
	Description string
	Meta        string
	Content     string
	Status      StatusCode
}

func projectNotAvailableError() Error { return Error{"The project does not exist or is not available."} }

func (u User) CreateProject(c *context.C) (string, error) {
	if !u.valid() {
		return "", invalidUserError()
	}

	return dstore.CreateProject(u.Handle, uint8(pending), c)
}

func (u User) GetProjects(c *context.C) ([]Project, error) {
	if !u.valid() {
		return nil, invalidUserError()
	}

	if h, err := dstore.FetchAllProjects(u.Handle, uint8(active), c); err != nil {
		return nil, err
	} else {
		list := make([]Project, len(h))
		ch := make(chan Project)

		fetch := func(h string) {
			if p, err := u.RetrieveProject(h, c); err != nil {
				context.Logf(context.Warn, "Error retrieving project (%s): %v", h, err)
				ch <- Project{}
			} else {
				ch <- p
			}
		}

		for _, handle := range h {
			go fetch(handle)
		}

		for i, _ := range h {
			list[i] = <-ch
		}

		return list, nil
	}
}

func (u User) RetrieveProject(project string, c *context.C) (Project, error) {
	if !u.valid() {
		return Project{}, invalidUserError()
	}

	if d, err := dstore.FetchProject(u.Handle, project, c); err != nil {
		if _, ok := err.(dstore.Error); ok {
			return Project{}, projectNotAvailableError()
		} else {
			return Project{}, err
		}
	} else {
		p := Project{}

		app.TranslateCustom(d, &p, func(name string, field reflect.Value) reflect.Value {
			switch name {
			case "Status":
				return valueAsStatusCode(field)
			default:
				return field
			}
		})

		return p, nil
	}
}

func (u User) SaveProject(p Project, c *context.C) error {
	if !u.valid() {
		return invalidUserError()
	}

	p.Status = active

	d := dstore.Project{}

	app.TranslateCustom(p, &d, func(name string, value reflect.Value) reflect.Value {
		if name == "Status" {
			return reflect.ValueOf(uint8(value.Uint()))
		}

		return value
	})

	return dstore.UpdateProject(u.Handle, d, c)
}

func (u User) DeleteProject(h string, c *context.C) error {
	if !u.valid() {
		return invalidUserError()
	}

	if d, err := dstore.FetchProject(u.Handle, h, c); err != nil {
		if _, ok := err.(dstore.Error); ok {
			return projectNotAvailableError()
		} else {
			return err
		}
	} else {
		d.Status = uint8(archived)

		return dstore.UpdateProject(u.Handle, d, c)
	}
}
