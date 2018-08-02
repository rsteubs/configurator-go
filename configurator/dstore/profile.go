package dstore

import (
	"database/sql"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"

	"github.com/cptcretin/forge/app"
	"github.com/cptcretin/forge/context"
)

type Account struct {
	Handle   string
	Username string
	Password string
	Salt     string
	Role     uint8
	Status   uint8
}

type Profile struct {
	Handle      string
	Company     string
	Title       string
	PhoneNumber string
	Status      uint8
}

type AccountProfile struct {
	Account Account
	Profile Profile
}

func CreateUser(a Account, p Profile, status uint8, c *context.C) (string, error) {
	db := c.NewDB(context.DefaultDB, "import user")

	handle := app.NewHandle(7)

	if _, err := db.Connection().Exec("INSERT INTO account SELECT ?,?,?,?,?,?,?",
		handle,
		encodeToString([]byte(a.Username)),
		a.Password,
		a.Salt,
		a.Role,
		status,
		time.Now()); err != nil {

		context.Logf(context.Error, "Could not create user : %v", err)
		db.Error(err)

		return "", err
	}

	if _, err := db.Connection().Exec("INSERT INTO profile SELECT ?,?,?,?,?,?",
		handle,
		encodeToString([]byte(p.Company)),
		encodeToString([]byte(p.Title)),
		encodeToString([]byte(p.PhoneNumber)),
		status,
		time.Now()); err != nil {

		if _, err := db.Connection().Exec("DELETE FROM account WHERE handle = ?", handle); err != nil {
			context.Logf(context.Error, "Could not roll back faulty user account (%s): %v", handle, err)
		}

		context.Logf(context.Error, "Could not create user profile : %v", err)
		db.Error(err)

		return "", err
	}

	return handle, nil
}

func UpdateProfile(p Profile, status, archiveStatus uint8, c *context.C) error {
	db := c.NewDB(context.DefaultDB, "update profile")

	var err error

	if _, err = db.Connection().Exec("UPDATE profile SET status = ? WHERE handle = ? AND status = ?", archiveStatus, p.Handle, status); err == nil {
		_, err = db.Connection().Exec("INSERT INTO profile SELECT ?,?,?,?,?",
			p.Handle,
			encodeToString([]byte(p.Company)),
			encodeToString([]byte(p.Title)),
			encodeToString([]byte(p.PhoneNumber)),
			status)
	}

	if err != nil {
		context.Logf(context.Error, "Error during profile update (%s): %v", p.Handle, err)
		db.Error(err)
	}

	return err
}

func FetchUser(h string, status uint8, c *context.C) (Account, Profile, error) {
	db := c.NewDB(context.DefaultDB, "fetch user")

	query := `
		SELECT 
			a.handle, 
			a.username, 
			a.password, 
			a.salt, 
			a.role, 
			p.company, 
			p.title, 
			p.phoneNumber 
		FROM account a
		JOIN profile p on p.handle = a.handle
		WHERE (a.handle = ? or a.username = ?) and a.status = ? and p.status = ?
	`
	result := db.Connection().QueryRow(query, h, encodeToString([]byte(h)), status, status)

	a := Account{}
	p := Profile{}
	uname := ""
	co := ""
	title := ""
	phone := ""

	if err := result.Scan(&a.Handle, &uname, &a.Password, &a.Salt, &a.Role, &co, &title, &phone); err != nil {
		if err == sql.ErrNoRows {
			return Account{}, Profile{}, nil
		}

		context.Logf(context.Error, "Could not fetch account (%s): %v", h, err)
		db.Error(err)

		return Account{}, Profile{}, err
	}

	a.Username = _readEncodedColumn("username", h, uname)
	p.Company = _readEncodedColumn("company", h, co)
	p.Title = _readEncodedColumn("title", h, title)
	p.PhoneNumber = _readEncodedColumn("phone number", h, phone)

	return a, p, nil
}

func SetAccountStatus(handle string, status uint8, c *context.C) error {
	db := c.NewDB(context.DefaultDB, "update account status")
	query := "UPDATE account SET status = ? WHERE handle = ?"

	if _, err := db.Connection().Exec(query, status, handle); err != nil {
		context.Logf(context.Error, "Error updating profile: %v", err)
		db.Error(err)
		return err
	}

	return nil
}

func WriteToken(owner, token string, expiration time.Time, c *context.C) error {
	db := c.NewDB(context.DefaultDB, "Create Token")
	query := "INSERT INTO token SELECT ?, ?, ?"

	if _, err := db.Connection().Exec(query, token, owner, expiration); err != nil {
		context.Logf(context.Error, "Could not create user token: %v", err)
		return err
	}

	return nil
}

func VerifyToken(owner, token string, c *context.C) error {
	db := c.NewDB(context.DefaultDB, "Verify Token")
	query := "SELECT 1 FROM token WHERE owner = ? AND handle = ? AND expiresOn >= now()"

	var found int

	row := db.Connection().QueryRow(query, owner, token)

	if err := row.Scan(&found); err != nil {
		if err == sql.ErrNoRows {
			return notFoundError()
		} else {
			return err
		}
	} else if found != 1 {
		return notFoundError()
	}

	return nil
}

func AccountList(c *context.C) ([]string, error) {
	db := c.NewDB(context.DefaultDB, "Get Account List")

	if rows, err := db.Connection().Query("SELECT handle FROM account"); err != nil {
		db.Error(err)
		return nil, err
	} else {
		var l []string

		pg := make([]string, 50)
		i := 0

		for rows.Next() {
			if i >= 50 {
				l = append(l, pg[:]...)
				pg = make([]string, 50)
				i = 0
			}

			h := ""

			if err := rows.Scan(&h); err != nil {
				context.Logf(context.Warn, "Could not read account: %v", err)
				continue
			}

			pg[i] = h
			i++
		}

		l = append(l, pg[:i]...)

		return l, nil
	}
}

func AccountProfileList(h []string, c *context.C) ([]AccountProfile, error) {
	db := c.NewDB(context.DefaultDB, "Get Account Profile List")

	context.Logf(context.Trace, "Looking up profiles for %v", h)

	q := `
		SELECT 
			a.handle, 
			a.username, 
			a.password, 
			a.salt, 
			a.role, 
			a.status,
			p.company, 
			p.title, 
			p.phoneNumber 
		FROM account a
		JOIN profile p on p.handle = a.handle
		WHERE a.handle in (` + strings.Repeat("?,", len(h)) + `'')
	`

	args := make([]interface{}, len(h))

	for i, x := range h {
		args[i] = x
	}

	if rows, err := db.Connection().Query(q, args...); err != nil {
		db.Error(err)
		return nil, err
	} else {
		l := []AccountProfile{}

		context.Logf(context.Trace, "starting initial page")

		pg := make([]AccountProfile, 50)
		i := 0

		for rows.Next() {
			if i >= 50 {
				context.Logf(context.Trace, "creating new page")
				l = append(l, pg...)
				pg = make([]AccountProfile, 50)
				i = 0
			}

			a := Account{}
			p := Profile{}
			uname := ""
			co := ""
			title := ""
			phone := ""

			if err := rows.Scan(&a.Handle, &uname, &a.Password, &a.Salt, &a.Role, &a.Status, &co, &title, &phone); err != nil {
				context.Logf(context.Warn, "Could not read account: %v", err)
				continue
			}

			a.Username = _readEncodedColumn("username", a.Handle, uname)
			p.Company = _readEncodedColumn("company", a.Handle, co)
			p.Title = _readEncodedColumn("title", a.Handle, title)
			p.PhoneNumber = _readEncodedColumn("phone number", a.Handle, phone)

			pg[i] = AccountProfile{a, p}
			i++
		}

		if i > 0 {
			l = append(l, pg[:i]...)
		}

		context.Logf(context.Trace, "discovered %v profiles", len(l))

		return l, nil
	}
}

func _readEncodedColumn(name, id, v string) string {
	if b, err := decodeString(v); err != nil {
		context.Logf(context.Warn, "Could not %s title (%s): %v", id, err)
		return ""
	} else {
		return string(b)
	}
}
