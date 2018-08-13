package service

import (
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"time"

	"github.com/cptcretin/forge/app"
	"github.com/cptcretin/forge/context"

	"configurator/dstore"
)

type User struct {
	Handle string
	Role   UserRole
	Token  string
}

type Profile struct {
	Name        string
	Company     string
	Title       string
	PhoneNumber string
}

const (
	tokenLength    = 10
	tokenExpiresIn = 30
)

func invalidTokenError() Error  { return Error{"User is not authenticated."} }
func invalidUserError() Error   { return Error{"User does not exist or password is invalid."} }
func duplicateUserError() Error { return Error{"User name already exists."} }

func Authenticate(username, pwd string, c *context.C) (User, error) {
	tx := c.Getf("authenticating - %s", username)

	if a, _, err := dstore.FetchUser(username, active.AsUint(), c); err != nil {
		tx.Startf("fail - %v", err)
		return User{}, err
	} else if len(a.Handle) == 0 {
		return User{}, invalidUserError()
	} else {
		runes := []rune(pwd)
		test := fmt.Sprintf("%s_%s_%s", runes[0:4], a.Salt, runes[4:])
		h := sha256.Sum256([]byte(test))

		u := User{
			Handle: a.Handle,
			Role:   UserRole(a.Role),
		}

		if string(h[:]) == a.Password {
			tx.Start("ok")

			(&u).genToken(c)
			context.Logf(context.Trace, "User has token: %s", u.Token)
			return u, nil
		} else {
			tx.Start("fail - bad password")

			return User{}, invalidUserError()
		}
	}
}

func Authorize(h, token string, c *context.C) (User, error) {
	if a, _, err := dstore.FetchUser(h, active.AsUint(), c); err != nil {
		return User{}, err
	} else if err := dstore.VerifyToken(a.Handle, token, c); err != nil {
		if _, ok := err.(dstore.Error); ok {
			return User{}, invalidTokenError()
		} else {
			return User{}, err
		}
	} else {
		return User{a.Handle, UserRole(a.Role), token}, nil
	}
}

func CreateUser(username, pwd string, p Profile, c *context.C) (User, error) {
	if a, _, err := dstore.FetchUser(username, active.AsUint(), c); err != nil {
		context.Logf(context.Warn, "Error fetching user (%s): %v", username, err)
	} else if a.Username == username && (a.Status == active.AsUint() || a.Status == pending.AsUint()) {
		return User{}, duplicateUserError()
	}

	salt := app.NewHandle(5)
	runes := []rune(pwd)

	password := fmt.Sprintf("%s_%s_%s", runes[0:4], salt, runes[4:])
	h := sha256.Sum256([]byte(password))

	context.Logf(context.Trace, "Raw password: %s", pwd)
	context.Logf(context.Trace, "Salted password: %s", password)

	dA := dstore.Account{
		Username: username,
		Password: string(h[:]),
		Salt:     salt,
		Role:     general.AsUint(),
	}

	dP := dstore.Profile{}

	app.Translate(p, &dP)

	if h, err := dstore.CreateUser(dA, dP, pending.AsUint(), c); err != nil {
		return User{}, err
	} else {
		return User{Handle: h, Role: general}, nil
	}
}

func (u *User) genToken(c *context.C) {
	tx := c.Current().Start("generate token")

	t := app.NewHandle(tokenLength)
	h := sha256.Sum256([]byte(t))
	b64 := base64.StdEncoding.EncodeToString(h[:])
	expires := time.Now().Add(time.Minute * tokenExpiresIn).UTC()

	context.Logf(context.Trace, "Using token: %s", t)
	context.Logf(context.Trace, "Encoded token: %s", b64)

	if err := dstore.WriteToken(u.Handle, b64, expires, c); err != nil {
		tx.Start("fail")

		context.Logf(context.Error, "Error writing token to data store: %v", err)
		return
	}

	tx.Start("ok")

	u.Token = b64
}

func (u User) valid() bool {
	return len(u.Handle) > 0 &&
		len(u.Token) > 0 &&
		u.Role.String() != "unknown"
}
