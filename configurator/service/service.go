package service

import (
	"reflect"
)

type StatusCode uint8
type UserRole uint8

const (
	active    = StatusCode(10)
	pending   = StatusCode(20)
	suspended = StatusCode(30)
	archived  = StatusCode(40)

	general  = UserRole(10)
	reseller = UserRole(20)
	admin    = UserRole(30)
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

func valueAsStatusCode(v reflect.Value) reflect.Value {
	return reflect.ValueOf(StatusCode(v.Uint()))
}

func (v UserRole) String() string {
	switch v {
	case general:
		return "general"
	case reseller:
		return "reseller"
	case admin:
		return "admin"
	default:
		return "unknown"
	}
}

func (v UserRole) AsUint() uint8 {
	return uint8(v)
}

func valueAsUserRole(v reflect.Value) reflect.Value {
	return reflect.ValueOf(UserRole(v.Uint()))
}
