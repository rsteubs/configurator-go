package config

import (
    "log"
    "os"
)

func Get(n string) string {
    if e, ok := os.LookupEnv(n); ok {
        return e
    } else {
        log.Fatalf("Configuration value \"%s\" is not available.", n)
        return ""
    }
}