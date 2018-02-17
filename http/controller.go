package controllers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	jwt "github.com/dgrijalva/jwt-go"
	"github.com/gorilla/mux"

	"cretin.co/forge/1.0/app"
	"cretin.co/forge/1.0/context"
	"cretin.co/forge/1.0/context/http"

	"configurator-web/service"
)

func CreateAccount(w http.ResponseWriter, r *http.Request) {
	defer recoverFromPanic()

	_createAccount(w, r)()
}

func Auth(w http.ResponseWriter, r *http.Request) {
	defer recoverFromPanic()

	_auth(w, r)()
}

func AuthorizeClient(w http.ResponseWriter, r *http.Request, next http.HandlerFunc) {
	defer recoverFromPanic()

	_authorize(w, r, next)()
}

func CreateProject(w http.ResponseWriter, r *http.Request) {
	defer recoverFromPanic()

	_createProject(w, r)()
}

func UpdateProject(w http.ResponseWriter, r *http.Request) {
	defer recoverFromPanic()

	_updateProject(w, r)()
}

func _createAccount(w http.ResponseWriter, r *http.Request) func() {
	c := httpContext.Create("Create Profile", w, r)

	return func() {
		d := struct {
			U string `json:"userame"`
			P string `json:"password"`
		}{}

		if err := json.NewDecoder(r.Body).Decode(&d); err != nil {
			c.Error(errors.New("Could not read request"), http.StatusBadRequest)
		} else if len(d.U) == 0 || len(d.P) == 0 {
			c.Error(errors.New("Must supply a username and a password"), http.StatusBadRequest)
		} else if h, err := service.CreateProfile(d.U, d.P); err != nil {
			context.Logf(context.Error, "Error creating profile: %v", err)
			c.Error(errors.New("An unexpected error occurrred during profile creation."), http.StatusInternalServerError)
		} else {
			c.End(http.StatusOK, struct {
				h string `json:"handle"`
			}{h})
		}
	}
}

func _auth(w http.ResponseWriter, r *http.Request) func() {
	c := httpContext.Create("Authenticate", w, r)

	return func() {
		d := struct {
			U string `json:"username"`
			P string `json:"password"`
		}{}

		if err := json.NewDecoder(r.Body).Decode(&d); err != nil {
			c.Error(errors.New("Could not read request"), http.StatusBadRequest)
		} else if len(d.U) == 0 || len(d.P) == 0 {
			c.Error(errors.New("Must supply a username and a password"), http.StatusBadRequest)
		} else if u, err := service.Authenticate(d.U, d.P); err != nil {
			context.Logf(context.Error, "Error authenticating profile: %v", err)
			c.Error(errors.New("An unexpected error occurrred during authentication."), http.StatusInternalServerError)
		} else if t, err := _createToken(u.Handle); err != nil {
			context.Logf(context.Error, "Error signing token for %s: %v", u.Handle, err)
			c.Error(err, http.StatusInternalServerError)
		} else {
			c.End(http.StatusOK, struct {
				H string `json:"handle"`
				T string `json:"token"`
			}{u.Handle, t})
		}
	}
}

func _authorize(w http.ResponseWriter, r *http.Request, next http.HandlerFunc) func() {
	return func() {
		c := httpContext.Create("Authorize Client", w, r)

		t := r.Header.Get("Authorization")
		u := r.Header.Get("x-configurator-web-user")

		test := func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				context.Logf(context.Warn, "Unexpected signing method: %v", token.Header["alg"])
				return nil, errors.New("Could not authorize request")
			}

			return u, nil
		}

		c.StartTransaction("validate token")

		if token, err := jwt.Parse(t, test); err != nil {
			context.Logf(context.Error, "Client validation error: %v", err)
			c.Error(errors.New("Could not authorize request"), http.StatusForbidden)
			return
		} else if token.Valid {
			c.StartTransaction("authorization complete")
			next(w, r)
		} else {
			c.End(http.StatusForbidden, nil)
		}
	}
}

func _createProject(w http.ResponseWriter, r *http.Request) func() {
	c := httpContext.Create("Create Project", w, r)

	return func() {
		u := service.User{}

		if h, err := service.CreateProject(u.Handle); err != nil {
			if sErr, ok := err.(service.Error); ok {
				c.Error(sErr, http.StatusNotAcceptable)
			} else {
				context.Logf(context.Error, "Error encountered while creating project: %v", err)
				c.Error(err, http.StatusInternalServerError)
			}
		} else {
			d := struct {
				string `json:"Handle"`
			}{h}

			c.End(http.StatusOK, d)
		}
	}
}

func _updateProject(w http.ResponseWriter, r *http.Request) func() {
	c := httpContext.Create("Create Project", w, r)

	return func() {
		h := mux.Vars(r)["handle"]
		u := r.Header.Get("x-configurator-web-user")

		d := struct {
			Title       string `json:"title"`
			Description string `json:"description"`
			Content     string `json:"content"`
		}{}

		if err := json.NewDecoder(r.Body).Decode(&d); err != nil {
			context.Logf(context.Warn, "Malformed project request detected: %v", d)
			c.Error(err, http.StatusInternalServerError)
		} else if len(d.Title) == 0 || len(d.Description) == 0 || len(d.Content) == 0 {
			c.Error(errors.New("Must supply a title, description, and content."), http.StatusNotAcceptable)
		} else {
			p := service.Project{}

			app.Translate(d, &p)
			p.Handle = h

			if err := service.SaveProject(u, p); err != nil {
				if sErr, ok := err.(service.Error); ok {
					c.Error(sErr, http.StatusNotAcceptable)
				} else {
					context.Logf(context.Error, "Error updating project: %v", err)
					c.Error(err, http.StatusInternalServerError)
				}
			} else {
				c.End(http.StatusOK, nil)
			}
		}
	}
}

func _createToken(handle string) (string, error) {
	i := struct {
		Name string
		Role string
	}{handle, "User"}

	t := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"iss":  "configurator-web",
		"exp":  time.Now().Add(time.Minute * 30).Unix(),
		"info": i,
	})

	return t.SignedString(handle)
}

func recoverFromPanic() {
	if x := recover(); x != nil {
		context.Logf(context.Error, "Recovered from panic: %v", x)

		if httpContext.Current != nil {
			httpContext.Current.Error(fmt.Errorf("Panic enounctered: %v", x), http.StatusInternalServerError)
		}
	}
}