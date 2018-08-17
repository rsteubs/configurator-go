package fstore

type FileType uint8

const Email FileType = 10
const ClientFile FileType = 20

func (t FileType) String() string {
	switch t {
	case Email:
		return "email"
	case ClientFile:
		return "client-file"
	default:
		return "unknown"
	}
}
