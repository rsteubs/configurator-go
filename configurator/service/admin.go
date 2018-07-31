package service

import (
	"math"
	"reflect"

	"cretin.co/forge/1.1/app"
	"cretin.co/forge/1.1/context"

	"configurator/dstore"
)

type UserAccount struct {
	Handle   string
	Username string
	Role     UserRole
	Status   StatusCode
	Profile  Profile
}

func (u User) ProfileList(c *context.C) ([]UserAccount, error) {
	if !u.valid() || u.Role != admin {
		return nil, invalidUserError()
	}

	if err := dstore.VerifyToken(u.Handle, u.Token, c); err != nil {
		if _, ok := err.(dstore.Error); ok {
			return nil, invalidTokenError()
		} else {
			return nil, err
		}
	}

	if h, err := dstore.AccountList(c); err != nil {
		return nil, err
	} else if d, err := dstore.AccountProfileList(h, c); err != nil {
		return nil, err
	} else {
		out := []UserAccount{}
		ch := make(chan []UserAccount)

		pageSize := 50
		pages := int(math.Ceil(float64(len(d)) / float64(pageSize)))

		for page := 0; page < pages; page++ {
			do := func(p []dstore.AccountProfile) {
				l := make([]UserAccount, len(p))

				context.Logf(context.Trace, "Page %v: %v", page, len(p))

				for i, rec := range p {
					ap := UserAccount{}

					app.TranslateCustom(rec.Account, &ap, func(name string, value reflect.Value) reflect.Value {
						switch name {
						case "Role":
							return valueAsUserRole(value)
						case "Status":
							return valueAsStatusCode(value)
						default:
							return value
						}
					})

					app.Translate(rec.Profile, &ap.Profile)

					l[i] = ap
				}

				ch <- l
			}

			if page == pages-1 {
				go do(d[page*pageSize:])
			} else {
				go do(d[page*pageSize : page*pageSize+pageSize])
			}
		}

		for i := 0; i < pages; i++ {
			x := <-ch
			out = append(out, x...)
		}

		return out, nil
	}
}
