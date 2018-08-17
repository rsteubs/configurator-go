package service

import (
    "net/smtp"
    
    "github.com/cptcretin/forge/context"
    
    "configurator/dstore"
    "configurator/fstore"
    _ "configurator/driver/fstore/aws"
)

type Message string

func (msg Message) String() string { return string(msg) } 

const (
    Welcome Message = ""
    Approved Message = ""
    Denied Message = ""
    PasswordReminder Message = ""
)

func SendMessage(to string, msg Message, c *context.C) error {
    fs := fstore.New("aws", c)
    
    if d, _, err := dstore.FetchUser(to, active.AsUint(), c); err != nil {
        return err
    } else if f, _, err := fs.Read(fstore.Email, msg.String()); err != nil {
        return err
    } else {
        auth := smtp.PlainAuth("id", "username", "pass", "host")
        
        return smtp.SendMail("address", auth, "from", []string{d.Username}, f)
    }
}