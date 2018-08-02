package main

import (
    "database/sql"
    "log"
    "math"
    "sync"

    _ "github.com/go-sql-driver/mysql"
    "forge/1.0/app"
)

const (
    bytes = 7
    dbcfg = "app:hushtagsappclient@/hushtags"
    keys = 10000
    page = 100
)

var db *sql.DB

func main() {
    db, _ = sql.Open("mysql", dbcfg)
    db.SetMaxOpenConns(100)
    defer db.Close()

    pages := int(math.Ceil(float64(keys) / float64(page)))

    var g sync.WaitGroup

    g.Add(pages)

    for i := 1; i <= pages; i++ {
        go func () {
            defer g.Done()
            generate(page)
        }()
    }

    g.Wait()
}

func generate(count int) {
    var g sync.WaitGroup

    g.Add(count)

    for i := 0; i < count; i++ {
        go func() {
            defer g.Done()

            for tries, err := 1, insertTag(app.NewHandle(bytes)); err != nil && tries <= 10; tries++ {
                log.Printf("Error: %v\n (%v attempts)\n", err, tries)
                err = insertTag(app.NewHandle(bytes))
            }
        }()
    }

    g.Wait()
}

func insertTag(handle string) error {
    log.Printf("Creating tag for %s\n", handle)

    sql := "INSERT INTO tag (handle, title, description, iconurl, size, maxSize, status, locked) values (?, '', '', '', 0, 50000000, 50, 0)"

    if _, err := db.Exec(sql, handle); err != nil {
        return err
    }

    return nil
}