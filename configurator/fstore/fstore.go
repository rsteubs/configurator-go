package fstore

import (
	"io"

	"github.com/cptcretin/forge/context"
)

type UploadRequest struct {
	UploadType FileType
	FileHandle string
	Mime       string
	FileSize   int64
	File       io.ReadSeeker
}

type Details struct {
	Size int64
	Mime *string
}

type FileClient interface {
	New(c *context.C) FileClient
	Write(r *UploadRequest) error
	Read(t FileType, handle string) ([]byte, *Details, error)
	GetStream(t FileType, handle string) (io.Reader, *Details, error)
	GetLink(t FileType, handle string) (string, error)
}

var _drivers map[string]FileClient

func init() {
	_drivers = make(map[string]FileClient)
}

func Register(driver string, client FileClient) error {
	_drivers[driver] = client

	return nil
}

func New(d string, c *context.C) FileClient {
	return _drivers[d].New(c)
}
