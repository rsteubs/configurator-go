package context

import (
	"bytes"
	"fmt"
	"time"

	"cretin.co/forge/1.0/logger"
)

type Context struct {
	Title    string
	Duration time.Duration

	s      int
	h      map[int]*Transaction
	status uint8
	ex     error
}

const (
	active   = uint8(10)
	complete = uint8(20)
	errored  = uint8(30)

	StatusActive   = "Active"
	StatusComplete = "Complete"
	StatusErrored  = "Error"
	StatusDefault  = "Not Started"

	Trace = uint8(10)
	Info  = uint8(20)
	Warn  = uint8(30)
	Error = uint8(40)
)

var Current *Context

func Create(t string) *Context {
	Current = &Context{
		t,
		0,
		0,
		make(map[int]*Transaction),
		active,
		nil,
	}

	return Current
}

func Createf(f string, a ...interface{}) *Context {
	return Create(fmt.Sprintf(f, a))
}

func Get(t string) *Context {
	if Current != nil {
		return Current
	}

	return Create(t)
}

func Getf(f string, a ...interface{}) *Context {
	if Current != nil {
		return Current
	}

	return Createf(f, a)
}

func (c *Context) StartTransaction(i string) *Transaction {
	if c.status == active {
		tx := createTransaction(i)

		c.h[c.nextStep()] = tx
		return tx
	}

	return nil
}

func (c *Context) StartTransactionf(f string, a ...interface{}) *Transaction {
	return c.StartTransaction(fmt.Sprintf(f, a))
}

func (c *Context) CurrentTransaction() *Transaction {
	if c.status == active && c.s > 0 {
		return c.h[c.s].CurrentTransaction()
	}

	return nil
}

func (c *Context) GetTransaction(i string) *Transaction {
	if tx := c.CurrentTransaction(); tx == nil {
		return c.StartTransaction(i)
	} else {
		return tx
	}
}

func (c *Context) GetTransactionf(f string, a ...interface{}) *Transaction {
	if tx := c.CurrentTransaction(); tx == nil {
		return c.StartTransactionf(f, a)
	} else {
		return tx
	}
}

func (c *Context) GetDuration() time.Duration {
	var runTime time.Duration

	for _, i := range c.h {
		runTime += i.GetDuration()
	}

	c.Duration = runTime

	return runTime
}

func (c *Context) Error(err error) {
	if c.status != active {
		return
	}

	c.GetDuration()

	c.status = errored
	c.ex = err

	logger.Error(c.String(), err)

	Current = nil
}

func (c *Context) End() {
	if c.status != active {
		return
	}

	c.GetDuration()
	c.status = complete

	logger.Info(c.String())

	Current = nil
}

func (c *Context) Status() string {
	switch c.status {
	case active:
		return StatusActive
	case complete:
		return StatusComplete
	case errored:
		return StatusErrored
	default:
		return StatusDefault
	}
}

func (c *Context) String() string {
	var b bytes.Buffer

	fmt.Fprintf(&b, "%v - \"%v\" has %v transactions - %v\n", c.GetDuration(), c.Title, c.s, c.Status())

	if c.status == errored && c.ex != nil {
		fmt.Fprintf(&b, "Error: %v\n", c.ex.Error())
	}

	for i := 1; i <= c.s; i++ {
		fmt.Fprintf(&b, c.h[i].String("\t"))
	}

	return b.String()
}

func Log(level uint8, v ...interface{}) {
	switch level {
	case Trace:
		logger.Trace(v...)
		return
	case Info:
		logger.Info(v...)
		return
	case Warn:
		logger.Warn(v...)
		return
	case Error:
		logger.Error(v...)
		return
	}
}

func Logf(level uint8, msg string, v ...interface{}) {
	switch level {
	case Trace:
		logger.Tracef(msg, v...)
		return
	case Info:
		logger.Infof(msg, v...)
		return
	case Warn:
		logger.Warnf(msg, v...)
		return
	case Error:
		logger.Errorf(msg, v...)
		return
	}
}

func (c *Context) nextStep() int {
	c.s++
	return c.s
}
