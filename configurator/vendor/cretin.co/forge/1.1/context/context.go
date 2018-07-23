package context

import (
	"bytes"
	"fmt"
	"sync"
	"time"

	"cretin.co/forge/1.0/logger"
)

type C struct {
	Title string

	d      time.Duration
	s      int
	h      map[int]*Tx
	status uint8
	ex     error

	sync.RWMutex
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

func Create(t string) *C {
	return &C{
		Title:  t,
		d:      0,
		s:      0,
		h:      make(map[int]*Tx),
		status: active,
		ex:     nil,
	}
}

func Createf(f string, a ...interface{}) *C {
	return Create(fmt.Sprintf(f, a...))
}

func (c *C) Start(i string) *Tx {
	if c.status == active {
		c.Lock()

		tx := createTransaction(i)
		c.h[c.nextStep()] = tx

		c.Unlock()

		return tx
	}

	return nil
}

func (c *C) Startf(f string, a ...interface{}) *Tx {
	return c.Start(fmt.Sprintf(f, a...))
}

func (c *C) Current() *Tx {
	c.RLock()
	defer c.RUnlock()

	if c.status == active && c.s > 0 {
		return c.h[c.s].Current()
	}

	return nil
}

func (c *C) Get(i string) *Tx {
	if tx := c.Current(); tx == nil {
		return c.Start(i)
	} else {
		return tx
	}
}

func (c *C) Getf(f string, a ...interface{}) *Tx {
	if tx := c.Current(); tx == nil {
		return c.Startf(f, a)
	} else {
		return tx
	}
}

func (c *C) Duration() time.Duration {
	var runTime time.Duration

	c.Lock()

	for _, i := range c.h {
		runTime += i.Duration()
	}

	c.d = runTime

	c.Unlock()

	return runTime
}

func (c *C) Error(err error) {
	if c.status != active {
		return
	}

	c.Duration()

	c.status = errored
	c.ex = err

	logger.Error(c.String(), err)
}

func (c *C) End() {
	if c.status != active {
		return
	}

	c.Duration()
	c.status = complete

	logger.Info(c.String())
}

func (c *C) Status() string {
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

func (c *C) String() string {
	var b bytes.Buffer

	fmt.Fprintf(&b, "%v - \"%v\" has %v transactions - %v\n", c.d, c.Title, c.s, c.Status())

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

func (c *C) nextStep() int {
	c.s++
	return c.s
}
