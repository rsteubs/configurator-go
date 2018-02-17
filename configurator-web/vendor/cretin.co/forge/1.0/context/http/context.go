package httpContext

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"time"

	"cretin.co/forge/1.0/context"
)

type HttpContext struct {
	c *context.Context
	r *http.Request
	w http.ResponseWriter
	s int
}

type responseStats struct {
	S  int     `json:"status"`
	M  string  `json:"statusMessage"`
	Rt float64 `json:"responseTime,string"`
}

var Current *HttpContext

const serverErrorMessage = "An unexpected error occurred"

func Create(t string, w http.ResponseWriter, r *http.Request) *HttpContext {
	Current = &HttpContext{
		context.Create(t),
		r,
		w,
		http.StatusOK,
	}

	return Current
}

func (c *HttpContext) StartTransaction(i string) *context.Transaction {
	return c.c.StartTransaction(i)
}

func (c *HttpContext) CurrentTransaction() *context.Transaction {
	return c.c.CurrentTransaction()
}

func (c *HttpContext) GetDuration() time.Duration {
	return c.c.GetDuration()
}

func (c *HttpContext) SetHeader(k, v string) {
	c.w.Header().Set(k, v)
}

func (c *HttpContext) Error(err error, status int) {
	c.c.Error(err)
	c.s = status
	msg := err.Error()

	if status == http.StatusInternalServerError {
		msg = serverErrorMessage
	}

	c.writeJsonResponse(status, msg, nil)

	Current = nil
}

func (c *HttpContext) End(status int, body interface{}) {
	c.s = status
	c.c.End()

	c.writeJsonResponse(status, httpStatus(status), body)

	Current = nil
}

func (c *HttpContext) EndFile(status int, r io.Reader, contentType string, size int64) {
	c.s = status
	c.c.End()

	c.w.Header().Set("Content-Type", contentType)
	c.w.Header().Set("Content-Length", strconv.FormatInt(size, 10))
	c.w.WriteHeader(status)

	io.Copy(c.w, r)

	Current = nil
}

func (c *HttpContext) Status() string {
	return c.c.Status()
}

func (c *HttpContext) String() string {
	return c.c.String()
}

func (c *HttpContext) writeJsonResponse(status int, message string, body interface{}) {
	var doc []byte
	var err error

	stats := responseStats{status, message, c.c.Duration.Seconds()}

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
