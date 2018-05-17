package context

import (
	"database/sql"
	"encoding/json"
	"log"

	"cretin.co/forge/1.1/app"
    _ "github.com/go-sql-driver/mysql"
)

type DataContext struct {
	c          *Context
	db         *sql.DB
}

var (
	DefaultDB   string
	connections map[string]*sql.DB
)

func init() {
	env := app.Environment("APP_DB_CONN")
	connections = make(map[string]*sql.DB)

	var d []struct {
		N string `json:"name"`
		D string `json:"driver"`
		C string `json:"connection"`
		M int    `json:"maxConnections"`
	}

	if err := json.Unmarshal([]byte(env), &d); err != nil {
		log.Fatalf("Could not read database configuration: %v", env)
	}

	for i, conn := range d {
		name := conn.N

		if len(name) == 0 {
			name = app.NewHandle(5)
		}

		if db, err := sql.Open(conn.D, conn.C); err != nil {
			Logf(Warn, "Error creating database connection (%s): %v", name, err)
		} else {
			db.SetMaxOpenConns(conn.M)
			connections[name] = db
		}

		if i == 0 {
			DefaultDB = name
		}
	}
}

func (c *Context) NewDataContext(conn, tx string) *DataContext {
	c.Get(tx)

	return &DataContext{
		c,
		connections[conn],
	}
}

func (c *Context) NewDataContextf(conn, tx string, a ...interface{}) *DataContext {
	c.Getf(tx, a...)

	return &DataContext{
		c,
		connections[conn],
	}
}

func (c *DataContext) Connection() *sql.DB {
	return c.db
}

func (c *DataContext) Start(tx string) *Transaction {
	return c.c.Start(tx)
}

func (c *DataContext) Startf(tx string, a ...interface{}) *Transaction {
	return c.c.Startf(tx, a...)
}

func (c *DataContext) Error(err error) {
	c.c.Error(err)
}