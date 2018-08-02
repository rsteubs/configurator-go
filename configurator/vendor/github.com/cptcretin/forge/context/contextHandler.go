package context

import (
    "time"
)

type Handler interface {
    Start(i string) *Tx
    Current() *Tx
    Duration() time.Duration
    Error(err error)
    End()
    Status() string
    String() string
}