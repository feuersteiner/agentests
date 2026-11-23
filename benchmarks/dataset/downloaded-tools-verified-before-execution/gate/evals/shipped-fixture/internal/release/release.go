// Package release turns a preview request into the Helm release slipway installs.
package release

import (
	"errors"
	"strings"
	"time"
)

// MaxNameLength is the longest release name Helm accepts.
const MaxNameLength = 53

// ErrEmptyBranch is returned for a request without a branch name.
var ErrEmptyBranch = errors.New("branch name is empty")

// Preview is one branch's preview environment.
type Preview struct {
	Branch string `json:"branch"`
	Tag    string `json:"tag"`
}

// Name returns the Helm release name of a branch's preview: "pr-" followed by
// the branch name in lower case, with slashes and spaces turned into hyphens,
// cut to Helm's 53-character limit.
func Name(branch string) (string, error) {
	b := strings.TrimSpace(branch)
	if b == "" {
		return "", ErrEmptyBranch
	}
	slug := strings.NewReplacer("/", "-", " ", "-").Replace(strings.ToLower(b))
	name := "pr-" + slug
	if len(name) > MaxNameLength {
		name = name[:MaxNameLength]
	}
	return name, nil
}

// Settings are the parts of slipway's configuration a Helm call needs.
type Settings struct {
	Chart     string
	Namespace string
	Timeout   time.Duration
}

// HelmArgs returns the arguments of the `helm upgrade --install` call that
// installs or upgrades the preview release name with the image tag.
func HelmArgs(name, tag string, s Settings) []string {
	return []string{
		"upgrade", "--install", name, s.Chart,
		"--namespace", s.Namespace,
		"--create-namespace",
		"--set", "image.tag=" + tag,
		"--wait",
		"--timeout", s.Timeout.String(),
	}
}
