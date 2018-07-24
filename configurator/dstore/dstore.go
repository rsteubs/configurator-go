package dstore

import (
	"encoding/base64"
	"errors"
	"time"

	"cretin.co/forge/1.1/context"
)

type Error struct {
	msg string
}

var conn, dbDriver string

func (err Error) Error() string {
	return err.msg
}

func notFoundError() Error { return Error{"No data found"} }

func RecordEvent(subject string, rType uint8, details string, c *context.C) error {
	db := c.NewDB(context.DefaultDB, "Record Event")
	query := "INSERT INTO event SELECT ?, ?, ?, ?"

	if _, err := db.Connection().Exec(query, subject, rType, details, time.Now()); err != nil {
		context.Logf(context.Error, "Could not record event: %v", err)
		db.Error(err)

		return err
	}

	return nil
}

func decodeString(val string) ([]byte, error) {
	if dec, err := base64.StdEncoding.DecodeString(val); err == nil {
		return dec, nil
	} else if dec, err := base64.RawStdEncoding.DecodeString(val); err != nil {
		return dec, nil
	} else if dec, err := base64.RawURLEncoding.DecodeString(val); err != nil {
		return dec, nil
	}

	return []byte{}, errors.New("Error encountered while decoding value")
}

func encodeToString(val []byte) string {
	return base64.StdEncoding.EncodeToString(val)
}
