// Package mailer sends the club's emails.
package mailer

import (
	"fmt"
	"net/smtp"
)

// Mailer sends emails through one SMTP server.
type Mailer struct {
	addr string
	from string
}

// New returns a Mailer that sends through the SMTP server at addr.
func New(addr, from string) *Mailer {
	return &Mailer{addr: addr, from: from}
}

// SendWelcome sends the welcome email to a new member.
func (m *Mailer) SendWelcome(to, name string) error {
	message := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: Welcome to Larkspur\r\n\r\nHello %s, welcome to the club!\r\n", m.from, to, name)
	if err := smtp.SendMail(m.addr, nil, m.from, []string{to}, []byte(message)); err != nil {
		return fmt.Errorf("send welcome email to %q: %w", to, err)
	}
	return nil
}
