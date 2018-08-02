package service

import (
	"reflect"
)

type StatusCode uint8
type UserRole uint8

type Error struct {
	msg string
}

func (err Error) Error() string {
	return err.msg
}

const (
	active    = StatusCode(10)
	pending   = StatusCode(20)
	suspended = StatusCode(30)
	archived  = StatusCode(40)

	general  = UserRole(10)
	reseller = UserRole(20)
	admin    = UserRole(30)
)

func invalidStatusCodeErr() Error { return Error{"Invalid account status"} }
func invalidUserRoleErr() Error   { return Error{"Invalid user role"} }

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

func ParseStatusCode(v string) (StatusCode, error) {

	switch v {
	case "active":
		return active, nil
	case "pending":
		return pending, nil
	case "suspended":
		return suspended, nil
	case "archived":
		return archived, nil
	default:
		return StatusCode(0), invalidStatusCodeErr()
	}
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

func ParseUserRole(v string) (UserRole, error) {
	switch v {
	case "general":
		return general, nil
	case "reseller":
		return reseller, nil
	case "admin":
		return admin, nil
	default:
		return UserRole(0), invalidUserRoleErr()
	}
}

func valueAsUserRole(v reflect.Value) reflect.Value {
	return reflect.ValueOf(UserRole(v.Uint()))
}
