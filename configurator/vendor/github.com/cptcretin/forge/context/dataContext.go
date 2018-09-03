package context

import (
	"database/sql"
	"encoding/json"
	"log"

	"github.com/cptcretin/forge/app"
)

type Data struct {
	c  *C
	db *sql.DB
}

var (
	DefaultDB   string
	connections map[string]*sql.DB
)

func prepareConnections() {
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

func (c *C) NewDB(conn, tx string, a ...interface{}) *Data {
	if connections == nil {
		prepareConnections()
	}

	if len(conn) == 0 {
		conn = DefaultDB
	}

	c.Get(tx, a...)

	return &Data{
		c,
		connections[conn],
	}
}

func (c *Data) Connection() *sql.DB {
	return c.db
}

func (c *Data) Start(tx string, a ...interface{}) *Tx {
	return c.c.Start(tx, a...)
}

func (c *Data) Error(err error) {
	c.c.Error(err)
}
