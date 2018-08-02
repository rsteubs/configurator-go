package app

import (
	"encoding/json"
	"log"
	"os"
)

func ReadConfig(path string, d interface{}) error {
	file, err := os.Open(path)

	defer file.Close()

	if err != nil {
		return err
	}

	j := json.NewDecoder(file)

	if err = j.Decode(&d); err != nil {
		return err
	}

	return nil
}

func Environment(n string) string {
	if e, ok := os.LookupEnv(n); ok {
		return e
	} else {
		log.Fatalf("Configuration value \"%s\" is not available.", n)
	}

	return ""
}
