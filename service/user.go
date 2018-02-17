package service

import (
	"crypto/sha256"
	"fmt"
	"time"

	"cretin.co/forge/1.0/app"
	"cretin.co/forge/1.0/context"

	"configurator/dstore"
)

type User struct {
	Handle string
	Token  string
}

type Error struct {
	msg string
}

const (
	tokenLength    = 10
	tokenExpiresIn = 30
)

func (err Error) Error() string {
	return err.msg
}

func invalidTokenError() Error { return Error{"User is not authenticated."} }
func invalidUserError() Error  { return Error{"User does not exist or password is invalid."} }

func Authenticate(username, pwd string) (User, error) {
	if p, err := dstore.FetchProfile(username); err != nil {
		return User{}, err
	} else {
		runes := []rune(pwd)
		test := fmt.Sprintf("%s_%s_%s", runes[0:4], p.Salt, runes[4:])
		h := sha256.Sum256([]byte(test))

		u := User{
			Handle: p.Handle,
		}

		if string(h[:]) == p.Password {
			u.genToken()
			return u, nil
		} else {
			return User{}, invalidUserError()
		}
	}
}

func Authorize(username, token string) (User, error) {
	if p, err := dstore.FetchProfile(username); err != nil {
		return User{}, err
	} else if err := dstore.VerifyToken(p.Handle, token); err != nil {
		if _, ok := err.(dstore.Error); ok {
			return User{}, invalidTokenError()
		} else {
			return User{}, err
		}
	} else {
		return User{p.Handle, token}, nil
	}
}

func (u User) genToken() {
	t := app.NewHandle(tokenLength)
	h := sha256.Sum256([]byte(t))
	expires := time.Now().Add(tokenExpiresIn).UTC()

	if err := dstore.WriteToken(u.Handle, string(h[:]), expires); err != nil {
		context.Logf(context.Error, "Error writing token to data store: %v", err)
		return
	}

	u.Token = string(h[:])
}
