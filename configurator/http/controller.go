package controllers

import (
	"bytes"
	"encoding/json"
	"errors"
	"io/ioutil"
	"net/http"
	"net/url"
	"time"

	jwt "github.com/dgrijalva/jwt-go"
	"github.com/labstack/echo"

	"cretin.co/forge/1.0/app"
	"cretin.co/forge/1.0/context"

	"configurator/service"
)

func CreateAccount(c echo.Context) error {
	return _createAccount(c)()
}

func Auth(c echo.Context) error {
	return _auth(c)()
}

func CreateProject(c echo.Context) error {
	return _createProject(c)()
}

func UpdateProject(c echo.Context) error {
	return _updateProject(c)()
}

func GetProjects(c echo.Context) error {
	return _getProjects(c)()
}

func _createAccount(c echo.Context) func() error {
	return func() error {
		d := struct {
			U string `json:"username"`
			P string `json:"password"`
			C string `json:"captcha"`
		}{}

		if err := json.NewDecoder(c.Request().Body).Decode(&d); err != nil {
			c.Error(httpError(errors.New("Could not read request"), http.StatusBadRequest))
			return errors.New("Could not read request")
		} else if len(d.U) == 0 || len(d.P) == 0 {
			c.Error(httpError(errors.New("Must supply a username and a password"), http.StatusBadRequest))
			return errors.New("Must supply a username and a password")
		} else if err := verifyCaptcha(d.C, c); err != nil {
			return err
		} else if h, err := service.CreateProfile(d.U, d.P); err != nil {
			context.Logf(context.Error, "Error creating profile: %v", err)
			c.Error(httpError(errors.New("An unexpected error occurrred during profile creation."), http.StatusInternalServerError))
			return errors.New("An unexpected error occurrred during profile creation.")
		} else if t, err := _createToken(h); err != nil {
			context.Logf(context.Error, "Error signing token for %s: %v", h, err)
			c.Error(httpError(err, http.StatusInternalServerError))
			return err
		} else {
			status := http.StatusOK

			res := jsonResponse(status,
				httpStatus(status),
				struct {
					H string `json:"handle"`
					T string `json:"token"`
				}{h, t})

			return c.JSON(http.StatusOK, res)
		}
	}
}

func _auth(c echo.Context) func() error {
	return func() error {
		d := struct {
			U string `json:"username"`
			P string `json:"password"`
		}{}

		if err := json.NewDecoder(c.Request().Body).Decode(&d); err != nil {
			c.Error(httpError(errors.New("Could not read request"), http.StatusBadRequest))
			return errors.New("Could not read request")
		} else if len(d.U) == 0 || len(d.P) == 0 {
			c.Error(httpError(errors.New("Must supply a username and a password"), http.StatusBadRequest))
			return errors.New("Must supply a username and a password")
		} else if u, err := service.Authenticate(d.U, d.P); err != nil {
			if sErr, ok := err.(service.Error); ok {
				c.Error(httpError(sErr, http.StatusUnauthorized))
				return sErr
			} else {
				context.Logf(context.Error, "Error authenticating profile: %v", err)
				c.Error(httpError(errors.New("An unexpected error occurrred during authentication."), http.StatusInternalServerError))
				return errors.New("An unexpected error occurrred during authentication.")
			}
		} else if t, err := _createToken(u.Handle); err != nil {
			context.Logf(context.Error, "Error signing token for %s: %v", u.Handle, err)
			c.Error(httpError(err, http.StatusInternalServerError))
			return err
		} else {
			status := http.StatusOK

			res := jsonResponse(status,
				httpStatus(status),
				struct {
					H string    `json:"handle"`
					T string    `json:"token"`
					E time.Time `json:"expiration"`
				}{u.Handle, t, time.Now().Add(time.Minute * 30).UTC()})

			return c.JSON(http.StatusOK, res)
		}
	}
}

func AuthorizeClient(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
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
			return echo.NewHTTPError(http.StatusBadRequest, "missing or malformed jwt")
		} else if token.Valid {
			c.Set("user", token)
			return next(c)
		} else {
			return echo.NewHTTPError(http.StatusUnauthorized, "invalid or expired jwt")
		}
	}
}

func _createProject(c echo.Context) func() error {
	return func() error {
		u := c.Request().Header.Get("x-configurator-user")

		if h, err := service.CreateProject(u); err != nil {
			if sErr, ok := err.(service.Error); ok {
				c.Error(httpError(sErr, http.StatusNotAcceptable))
				return sErr
			} else {
				context.Logf(context.Error, "Error encountered while creating project: %v", err)
				c.Error(httpError(err, http.StatusInternalServerError))
				return err
			}
		} else {
			status := http.StatusOK

			res := jsonResponse(status,
				httpStatus(status),
				struct {
					string `json:"handle"`
				}{h})

			return c.JSON(http.StatusOK, res)
		}
	}
}

func _getProjects(c echo.Context) func() error {
	return func() error {
		u := c.Request().Header.Get("x-configurator-user")

		if p, err := service.GetProjects(u); err != nil {
			if sErr, ok := err.(service.Error); ok {
				c.Error(httpError(sErr, http.StatusBadRequest))
				return sErr
			} else {
				context.Logf(context.Error, "Error retrieving user projcects for %s: %v", u, err)
				c.Error(httpError(err, http.StatusInternalServerError))
				return err
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

			res := jsonResponse(status, httpStatus(status), out[:index])
			return c.JSON(status, res)
		}
	}
}

func _updateProject(c echo.Context) func() error {
	return func() error {
		h := c.QueryParam("handle")
		u := c.Request().Header.Get("x-configurator-user")

		d := struct {
			Title       string `json:"title"`
			Description string `json:"description"`
			Content     string `json:"content"`
		}{}

		if err := json.NewDecoder(c.Request().Body).Decode(&d); err != nil {
			context.Logf(context.Warn, "Malformed project request detected: %v", d)
			c.Error(httpError(err, http.StatusInternalServerError))
			return err
		} else if len(d.Title) == 0 || len(d.Description) == 0 || len(d.Content) == 0 {
			c.Error(httpError(errors.New("Must supply a title, description, and content."), http.StatusNotAcceptable))
			return errors.New("Must supply a title, description, and content.")
		} else {
			p := service.Project{}

			app.Translate(d, &p)
			p.Handle = h

			if err := service.SaveProject(u, p); err != nil {
				if sErr, ok := err.(service.Error); ok {
					c.Error(httpError(sErr, http.StatusNotAcceptable))
					return sErr
				} else {
					context.Logf(context.Error, "Error updating project: %v", err)
					c.Error(httpError(err, http.StatusInternalServerError))
					return err
				}
			} else {
				status := http.StatusOK

				res := jsonResponse(status, httpStatus(status), nil)

				return c.JSON(http.StatusOK, res)
			}
		}
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

func verifyCaptcha(captcha string, c echo.Context) error {
	values := url.Values{
		"secret":   {"6LdIR0cUAAAAAC8BuroicHko9U9UPj-SFd4MLnZ-"},
		"response": {captcha},
	}

	if resp, err := http.PostForm("https://www.google.com/recaptcha/api/siteverify", values); err != nil {
		c.Error(httpError(err, http.StatusInternalServerError))

		return err
	} else {
		defer resp.Body.Close()

		r := struct {
			S bool     `json:"success"`
			C []string `json:"error-codes"`
		}{}

		if b, err := ioutil.ReadAll(resp.Body); err != nil {
			context.Logf(context.Error, "Error occurred while reading response: %v", err)
			c.Error(httpError(err, http.StatusInternalServerError))

			return err
		} else if err := json.NewDecoder(bytes.NewBuffer(b)).Decode(&r); err != nil {
			context.Logf(context.Error, "Error decoding response (%s): %v", string(b), err)
			c.Error(httpError(err, http.StatusInternalServerError))

			return err
		} else if !r.S {
			err := errors.New("Invalid reCaptcha response. Please try again.")
			c.Error(httpError(err, http.StatusUnauthorized))

			return err
		}
	}

	return nil
}

func httpError(err error, code int) *echo.HTTPError {
	return echo.NewHTTPError(code, err.Error())
}
