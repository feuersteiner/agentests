package auth

import (
	"context"
	"time"

	"tidegate/base"
)

// Mailer sends mail to a user.
type Mailer interface {
	Send(ctx context.Context, to, subject, text string) error
}

// ResetLinkTTL is how long a password reset link works.
const ResetLinkTTL = 30 * time.Minute

// SendPasswordReset mails user a link that lets them choose a new password.
func SendPasswordReset(ctx context.Context, mailer Mailer, user *User, link string) error {
	if err := mailer.Send(ctx, user.Email, "Reset your password", "Use this link within 30 minutes: "+link); err != nil {
		base.WarnfCtx(ctx, "Password reset mail could not be sent: %v", err)
		return err
	}
	base.InfofCtx(ctx, "Password reset mail sent to %s, link valid for %s", user.Email, ResetLinkTTL)
	return nil
}
