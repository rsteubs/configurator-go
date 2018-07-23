package service

import (
	"reflect"
)

type StatusCode uint8

const (
	active    = StatusCode(10)
	pending   = StatusCode(20)
	suspended = StatusCode(30)
	archived  = StatusCode(40)
)

func (v StatusCode) String() string {
	switch v {
	case active:
		return "active"
	case pending:
		return "pending"
	case suspended:
		return "suspended"
	case archived:
		return "archived"
	default:
		return "unknown"
	}
}

func (v StatusCode) AsUint() uint8 {
	return uint8(v)
}

func ValueAsStatusCode(v reflect.Value) reflect.Value {
	return reflect.ValueOf(StatusCode(v.Uint()))
}
