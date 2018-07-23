package server

import (
	"io"
	"net/http"
	"strconv"

	"cretin.co/forge/1.1/context"
	"github.com/labstack/echo"
	"github.com/labstack/echo/middleware"
	"golang.org/x/crypto/acme/autocert"
)

type EchoContext struct {
	c *context.C
	e echo.Context
	s int
}

type RequestHandler func(c *EchoContext) error
type MiddlewareHandler func(c *EchoContext) (int, error)

const serverErrorMessage = "An unexpected error occurred"

func CreateServer() *echo.Echo {
	e := echo.New()

	e.AutoTLSManager.Cache = autocert.DirCache("server/www/.cache")
	e.Use(middleware.Recover())
	e.Use(middleware.Logger())

	return e
}

func NewEchoContext(h RequestHandler, n string) func(echo.Context) error {
	return func(e echo.Context) error {
		c := context.Create(n)

		defer c.End()
		return h(&EchoContext{c, e, http.StatusOK})
	}
}

func NewMiddlewareContext(h MiddlewareHandler, n string) func(echo.HandlerFunc) echo.HandlerFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(e echo.Context) error {
			c := context.Create(n)

			defer c.End()

			hC := EchoContext{c, e, http.StatusOK}

			if status, err := h(&hC); err != nil {
				c.Error(err)
				return echo.NewHTTPError(status, err.Error())
			}

			return next(e)
		}
	}
}

func (c *EchoContext) Context() *context.C {
	return c.c
}

func (c *EchoContext) Request() *http.Request {
	return c.e.Request()
}

func (c *EchoContext) Set(n string, v interface{}) {
	c.e.Set(n, v)
}

func (c *EchoContext) QueryParam(n string) string {
	return c.e.QueryParam(n)
}

func (c *EchoContext) Param(n string) string {
	return c.e.Param(n)
}

func (c *EchoContext) Start(tx string) *context.Tx {
	return c.c.Start(tx)
}

func (c *EchoContext) Startf(tx string, a ...interface{}) *context.Tx {
	return c.c.Startf(tx, a...)
}

func (c *EchoContext) Error(status int, err error) error {
	c.c.Error(err)
	c.s = status
	msg := err.Error()

	if status == http.StatusInternalServerError {
		msg = serverErrorMessage
	}

	c.e.Error(echo.NewHTTPError(status, msg))

	return err
}

func (c *EchoContext) End(status int, body interface{}) error {
	c.s = status
	c.c.End()

	return c.writeJsonResponse(status, httpStatus(status), body)
}

func (c *EchoContext) EndFile(status int, r io.Reader, contentType string, size int64) error {
	c.s = status
	c.c.End()

	c.e.Response().Header().Set("Content-Type", contentType)
	c.e.Response().Header().Set("Content-Length", strconv.FormatInt(size, 10))
	c.e.Response().WriteHeader(status)

	_, err := io.Copy(c.e.Response(), r)

	return err
}

func (c *EchoContext) Status() string {
	return c.c.Status()
}

func (c *EchoContext) writeJsonResponse(status int, message string, body interface{}) error {
	stats := responseStats{status, message, c.c.Duration().Seconds()}
	res := struct {
		S responseStats `json:"response"`
		B interface{}   `json:"data,omitempty"`
	}{stats, body}

	return c.e.JSON(status, res)
}
