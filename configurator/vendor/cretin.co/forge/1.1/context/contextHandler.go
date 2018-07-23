package context

import (
	"time"
)

type Handler interface {
	StartTransaction(i string) *Tx
	CurrentTransaction() *Tx
	GetDuration() time.Duration
	Error(err error)
	End()
	Status() string
	String() string
}
