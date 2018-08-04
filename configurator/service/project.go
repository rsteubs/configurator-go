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
	Content     string
	Status      StatusCode
}

func projectNotAvailableError() Error { return Error{"The project does not exist or is not available."} }

func CreateProject(owner string, c *context.C) (string, error) {
	return dstore.CreateProject(owner, uint8(pending), c)
}

func GetProjects(owner string, c *context.C) ([]Project, error) {
	if h, err := dstore.FetchAllProjects(owner, uint8(active), c); err != nil {
		return nil, err
	} else {
		list := make([]Project, len(h))
		ch := make(chan Project)

		fetch := func(h string) {
			if p, err := RetrieveProject(owner, h, c); err != nil {
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

func RetrieveProject(owner string, project string, c *context.C) (Project, error) {
	if d, err := dstore.FetchProject(owner, project, c); err != nil {
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

func SaveProject(user string, p Project, c *context.C) error {
	p.Status = active

	d := dstore.Project{}

	app.TranslateCustom(p, &d, func(name string, value reflect.Value) reflect.Value {
		if name == "Status" {
			return reflect.ValueOf(uint8(value.Uint()))
		}

		return value
	})

	return dstore.UpdateProject(user, d, c)
}

func DeleteProject(owner, h string, c *context.C) error {
	if d, err := dstore.FetchProject(owner, h, c); err != nil {
		if _, ok := err.(dstore.Error); ok {
			return projectNotAvailableError()
		} else {
			return err
		}
	} else {
		d.Status = uint8(archived)

		return dstore.UpdateProject(owner, d, c)
	}
}
