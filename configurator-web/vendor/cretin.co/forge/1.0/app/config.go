package app

import (
    "encoding/json"
    "os"
)

func ReadConfig(path string, d interface { }) error {
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