package context

import (
	"database/sql"
	"time"

	"cretin.co/forge/1.0/logger"
)

type DataContext struct {
	c          *Context
	db         *sql.DB
	termOnExit bool
}

func NewDataContext(t, dbDriver, conn string) (*DataContext, error) {
	var db *sql.DB
	var err error

	if db, err = sql.Open(dbDriver, conn); err != nil {
		logger.Error("Could not reach the database")
		return nil, err
	}

	c := Current
	termOnExit := false

	if c == nil {
		c = Create(t)
		termOnExit = true
	}

	return &DataContext{
		c,
		db,
		termOnExit,
	}, nil
}

func (c *DataContext) StartTransaction(i string) *Transaction {
	return c.c.StartTransaction(i)
}

func (c *DataContext) CurrentTransaction() *Transaction {
	return c.c.CurrentTransaction()
}

func (c *DataContext) GetDuration() time.Duration {
	return c.c.GetDuration()
}

func (c *DataContext) Error(err error) {
	c.c.Error(err)
	c.db.Close()
}

func (c *DataContext) End() {
	if c.termOnExit {
		c.c.End()
	}

	c.db.Close()
}

func (c *DataContext) Status() string {
	return c.c.Status()
}

func (c *DataContext) String() string {
	return c.c.String()
}

func (c *DataContext) Connection() *sql.DB {
	return c.db
}
