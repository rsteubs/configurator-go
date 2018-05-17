package service

import (
	"crypto/sha256"
	"fmt"
	"time"

	"cretin.co/forge/1.1/app"
	"cretin.co/forge/1.1/context"

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

func Authenticate(username, pwd string, c *context.Context) (User, error) {
	tx := c.Getf("authenticating - %s", username)

	if p, err := dstore.FetchProfile(username, c); err != nil {
		tx.Startf("fail - %v", err)
		return User{}, err
	} else {
		runes := []rune(pwd)
		test := fmt.Sprintf("%s_%s_%s", runes[0:4], p.Salt, runes[4:])
		h := sha256.Sum256([]byte(test))

		u := User{
			Handle: p.Handle,
		}

		if string(h[:]) == p.Password {
			tx.Start("ok")

			u.genToken(c)
			return u, nil
		} else {
			tx.Start("fail - bad password")

			return User{}, invalidUserError()
		}
	}
}

func Authorize(username, token string, c *context.Context) (User, error) {
	if p, err := dstore.FetchProfile(username, c); err != nil {
		return User{}, err
	} else if err := dstore.VerifyToken(p.Handle, token, c); err != nil {
		if _, ok := err.(dstore.Error); ok {
			return User{}, invalidTokenError()
		} else {
			return User{}, err
		}
	} else {
		return User{p.Handle, token}, nil
	}
}

func (u User) genToken(c *context.Context) {
	t := app.NewHandle(tokenLength)
	h := sha256.Sum256([]byte(t))
	expires := time.Now().Add(tokenExpiresIn).UTC()

	tx := c.Current().Start("generate token")

	if err := dstore.WriteToken(u.Handle, string(h[:]), expires, c); err != nil {
		tx.Start("fail")

		context.Logf(context.Error, "Error writing token to data store: %v", err)
		return
	}

	tx.Start("ok")

	u.Token = string(h[:])
}
