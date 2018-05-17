package context

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"
)

type HttpContext struct {
	c *Context
	r *http.Request
	w http.ResponseWriter
	s int
}

type responseStats struct {
	S  int     `json:"status"`
	M  string  `json:"statusMessage"`
	Rt float64 `json:"responseTime,string"`
}

const serverErrorMessage = "An unexpected error occurred"

func (c *Context) NewHttpContext(w http.ResponseWriter, r *http.Request) *HttpContext {
	return &HttpContext{
		c,
		r,
		w,
		http.StatusOK,
	}
}

func (c *Context) NewHttpContextf(w http.ResponseWriter, r *http.Request, a ...interface{}) *HttpContext {
	return &HttpContext{
		c,
		r,
		w,
		http.StatusOK,
	}
}

func (c *HttpContext) SetHeader(k, v string) {
	c.w.Header().Set(k, v)
}

func (c *HttpContext) Context() *Context {
	return c.c
}

func (c *HttpContext) Start(tx string) *Transaction {
	return c.c.Start(tx)
}

func (c *HttpContext) Startf(tx string, a ...interface{}) *Transaction {
	return c.c.Startf(tx, a...)
}

func (c *HttpContext) Error(err error, status int) {
	c.c.Error(err)
	c.s = status
	msg := err.Error()

	if status == http.StatusInternalServerError {
		msg = serverErrorMessage
	}

	c.writeJsonResponse(status, msg, nil)
}

func (c *HttpContext) End(status int, body interface{}) {
	c.s = status
	c.c.End()

	c.writeJsonResponse(status, httpStatus(status), body)
}

func (c *HttpContext) EndFile(status int, r io.Reader, contentType string, size int64) {
	c.s = status
	c.c.End()

	c.w.Header().Set("Content-Type", contentType)
	c.w.Header().Set("Content-Length", strconv.FormatInt(size, 10))
	c.w.WriteHeader(status)

	io.Copy(c.w, r)
}

func (c *HttpContext) Status() string {
	return c.c.Status()
}

func (c *HttpContext) writeJsonResponse(status int, message string, body interface{}) {
	var doc []byte
	var err error

	stats := responseStats{status, message, c.c.Duration().Seconds()}

	if body == nil {
		doc, err = json.Marshal(struct {
			S responseStats `json:"response"`
		}{stats})
	} else {
		response := struct {
			S responseStats `json:"response"`
			B interface{}   `json:"data"`
		}{stats, body}

		doc, err = json.Marshal(response)
	}

	if err != nil {
		c.c.Error(err)
		http.Error(c.w, "An unexpected error occurred", http.StatusInternalServerError)
		return
	}

	c.w.Header().Set("Content-Type", "application/json")
	c.w.WriteHeader(status)
	c.w.Write(doc)
}
