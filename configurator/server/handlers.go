package server

import (
	"bytes"
	"encoding/json"
	"errors"
	"io/ioutil"
	"net/http"
	"net/url"
	"time"

	jwt "github.com/dgrijalva/jwt-go"

	"cretin.co/forge/1.1/app"
	"cretin.co/forge/1.1/context"

	"configurator/service"
)

func CreateAccount(c *EchoContext) error {
	return _createAccount(c)()
}

func Auth(c *EchoContext) error {
	return _auth(c)()
}

func CreateProject(c *EchoContext) error {
	return _createProject(c)()
}

func UpdateProject(c *EchoContext) error {
	return _updateProject(c)()
}

func GetProjects(c *EchoContext) error {
	return _getProjects(c)()
}

func AuthorizeClient(c *EchoContext) (int, error) {
	t := c.Request().Header.Get("Authorization")
	u := c.Request().Header.Get("x-configurator-user")

	test := func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			context.Logf(context.Warn, "Unexpected signing method: %v", token.Header["alg"])
			return nil, errors.New("Could not authorize request")
		}

		return []byte(u), nil
	}

	if token, err := jwt.Parse(t, test); err != nil {
		return http.StatusBadRequest, errors.New("missing or malformed jwt")
	} else if token.Valid {
		c.Set("user", token)
		return http.StatusOK, nil
	} else {
		return http.StatusUnauthorized, errors.New("invalid or expired jwt")
	}
}

func _createAccount(c *EchoContext) func() error {
	return func() error {
		d := struct {
			U string `json:"username"`
			P string `json:"password"`
			C string `json:"captcha"`
		}{}

		if err := json.NewDecoder(c.Request().Body).Decode(&d); err != nil {
			return c.Error(http.StatusBadRequest, errors.New("Could not read request"))
		} else if len(d.U) == 0 || len(d.P) == 0 {
			return c.Error(http.StatusBadRequest, errors.New("Must supply a username and a password"))
		} else if err := verifyCaptcha(d.C, c); err != nil {
			return c.Error(http.StatusBadRequest, err)
		} else if h, err := service.CreateProfile(d.U, d.P, c.Context()); err != nil {
			return c.Error(http.StatusInternalServerError, err)
		} else if t, err := _createToken(h); err != nil {
			return c.Error(http.StatusInternalServerError, err)
		} else {
			return c.End(http.StatusOK, struct {
				H string `json:"handle"`
				T string `json:"token"`
			}{h, t})
		}
	}
}

func _auth(c *EchoContext) func() error {
	return func() error {
		d := struct {
			U string `json:"username"`
			P string `json:"password"`
		}{}

		c.Start("authenticating user")

		if err := json.NewDecoder(c.Request().Body).Decode(&d); err != nil {
			return c.Error(http.StatusBadRequest, errors.New("Could not read request"))
		} else if len(d.U) == 0 || len(d.P) == 0 {
			return c.Error(http.StatusBadRequest, errors.New("Must supply a username and a password"))
		} else if u, err := service.Authenticate(d.U, d.P, c.Context()); err != nil {
			c.Startf("failed - %v", err)

			if sErr, ok := err.(service.Error); ok {
				return c.Error(http.StatusUnauthorized, sErr)
			} else {
				return c.Error(http.StatusInternalServerError, err)
			}
		} else if t, err := _createToken(u.Handle); err != nil {
			context.Logf(context.Error, "Error signing token for %s: %v", u.Handle, err)
			return c.Error(http.StatusInternalServerError, err)
		} else {
			return c.End(http.StatusOK, struct {
				H string    `json:"handle"`
				T string    `json:"token"`
				E time.Time `json:"expiration"`
			}{u.Handle, t, time.Now().Add(time.Minute * 30).UTC()})
		}
	}
}

func _createProject(c *EchoContext) func() error {
	u := c.Request().Header.Get("x-configurator-user")

	return func() error {
		if h, err := service.CreateProject(u, c.Context()); err != nil {
			if sErr, ok := err.(service.Error); ok {
				return c.Error(http.StatusNotAcceptable, sErr)
			} else {
				return c.Error(http.StatusInternalServerError, err)
			}
		} else {
			return c.End(http.StatusOK, struct {
				string `json:"handle"`
			}{h})
		}
	}
}

func _getProjects(c *EchoContext) func() error {
	u := c.Request().Header.Get("x-configurator-user")

	return func() error {
		context.Logf(context.Trace, "Fetching projects for %s", u)

		c.Start("get projects")

		if p, err := service.GetProjects(u, c.Context()); err != nil {
			c.Startf("failed - %v", err)

			if sErr, ok := err.(service.Error); ok {
				return c.Error(http.StatusBadRequest, sErr)
			} else {
				return c.Error(http.StatusInternalServerError, err)
			}
		} else {
			type project struct {
				Handle      string `json:"handle"`
				Title       string `json:"title"`
				Description string `json:"description"`
				Content     string `json:"content"`
			}

			status := http.StatusOK
			out := make([]project, len(p))
			index := 0

			c.Startf("parsing %v projects", len(p))

			for _, i := range p {
				if len(i.Handle) == 0 {
					status = http.StatusPartialContent
				} else {
					res := project{}
					app.Translate(i, &res)

					out[index] = res
					index++
				}
			}

			return c.End(status, out[:index])
		}
	}
}

func _updateProject(c *EchoContext) func() error {
	h := c.Param("handle")
	u := c.Request().Header.Get("x-configurator-user")

	return func() error {
		d := struct {
			Title       string `json:"title"`
			Description string `json:"description"`
			Content     string `json:"content"`
		}{}

		if len(h) == 0 {
			return c.Error(http.StatusBadRequest, errors.New("No project handle supplied"))
		} else if err := json.NewDecoder(c.Request().Body).Decode(&d); err != nil {
			return c.Error(http.StatusInternalServerError, err)
		} else if len(d.Title) == 0 || len(d.Description) == 0 || len(d.Content) == 0 {
			return c.Error(http.StatusNotAcceptable, errors.New("Must supply a title, description, and content."))
		} else {
			p := service.Project{}

			app.Translate(d, &p)
			p.Handle = h

			context.Logf(context.Trace, "Saving project for %s - %s: %v", u, h, p)

			if err := service.SaveProject(u, p, c.Context()); err != nil {
				if sErr, ok := err.(service.Error); ok {
					return c.Error(http.StatusNotAcceptable, sErr)
				} else {
					return c.Error(http.StatusInternalServerError, err)
				}
			}
		}

		return c.End(http.StatusOK, nil)
	}
}

func _createToken(handle string) (string, error) {
	i := struct {
		Name string
		Role string
	}{handle, "Client"}

	t := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"iss":  "configurator",
		"exp":  time.Now().Add(time.Minute * 30).Unix(),
		"info": i,
	})

	return t.SignedString([]byte(handle))
}

func verifyCaptcha(captcha string, c *EchoContext) error {
	values := url.Values{
		"secret":   {"6LdIR0cUAAAAAC8BuroicHko9U9UPj-SFd4MLnZ-"},
		"response": {captcha},
	}

	if resp, err := http.PostForm("https://www.google.com/recaptcha/api/siteverify", values); err != nil {
		return c.Error(http.StatusInternalServerError, err)
	} else {
		defer resp.Body.Close()

		r := struct {
			S bool     `json:"success"`
			C []string `json:"error-codes"`
		}{}

		if b, err := ioutil.ReadAll(resp.Body); err != nil {
			return c.Error(http.StatusInternalServerError, err)
		} else if err := json.NewDecoder(bytes.NewBuffer(b)).Decode(&r); err != nil {
			return c.Error(http.StatusInternalServerError, err)
		} else if !r.S {
			return c.Error(http.StatusUnauthorized, errors.New("Invalid reCaptcha response. Please try again."))
		}
	}

	return nil
}
