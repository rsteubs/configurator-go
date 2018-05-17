package context

import (
    "time"
)

type Handler interface {
    StartTransaction(i string) *Transaction
    CurrentTransaction() *Transaction
    GetDuration() time.Duration
    Error(err error)
    End()
    Status() string
    String() string
}