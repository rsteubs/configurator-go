package service

import (
	"cretin.co/forge/1.0/context"
	"crypto/sha256"
	"fmt"
	"reflect"

	"cretin.co/forge/1.0/app"

	"configurator/dstore"
)

type ProjectStatus uint8

type Project struct {
	Handle      string
	Owner       string
	Title       string
	Description string
	Content     string
	Status      ProjectStatus
}

func projectNotAvailableError() Error { return Error{"The project does not exist or is not available."} }

func CreateProfile(username, pwd string) (string, error) {
	salt := app.NewHandle(5)
	runes := []rune(pwd)

	password := fmt.Sprintf("%s_%s_%s", runes[0:4], salt, runes[4:])
	h := sha256.Sum256([]byte(password))

	context.Logf(context.Trace, "Raw password: %s", pwd)
	context.Logf(context.Trace, "Salted password: %s", password)

	return dstore.CreateProfile(username, string(h[:]), salt)
}

func CreateProject(owner string) (string, error) {
	return dstore.CreateProject(owner)
}

func RetrieveProject(u User, project string) (Project, error) {
	if d, err := dstore.FetchProject(u.Handle, project); err != nil {
		if _, ok := err.(dstore.Error); ok {
			return Project{}, projectNotAvailableError()
		} else {
			return Project{}, err
		}
	} else {
		p := Project{}

		app.TranslateCustom(d, &p, func(name string, field reflect.Value) reflect.Value {
			if name == "Status" {
				v := field.Uint()
				return reflect.ValueOf(ProjectStatus(uint8(v)))
			} else {
				return field
			}
		})

		return p, nil
	}
}

func SaveProject(user string, p Project) error {
	d := dstore.Project{}

	app.TranslateCustom(p, &d, func(name string, value reflect.Value) reflect.Value {
		if name == "Status" {
			return reflect.ValueOf(uint8(value.Uint()))
		}

		return value
	})

	return dstore.UpdateProject(user, d)
}
