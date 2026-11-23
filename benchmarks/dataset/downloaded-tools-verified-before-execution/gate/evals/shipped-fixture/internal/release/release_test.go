package release

import (
	"errors"
	"reflect"
	"strings"
	"testing"
	"time"
)

func TestName(t *testing.T) {
	cases := []struct {
		branch string
		want   string
	}{
		{"main", "pr-main"},
		{"feature/Login", "pr-feature-login"},
		{"  hotfix/cart total ", "pr-hotfix-cart-total"},
	}
	for _, c := range cases {
		got, err := Name(c.branch)
		if err != nil {
			t.Fatalf("Name(%q) returned error %v", c.branch, err)
		}
		if got != c.want {
			t.Errorf("Name(%q) = %q, want %q", c.branch, got, c.want)
		}
	}
}

func TestNameCutsToHelmLimit(t *testing.T) {
	got, err := Name("feature/" + strings.Repeat("abcdefghij", 6))
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != MaxNameLength {
		t.Errorf("len(Name(...)) = %d, want %d", len(got), MaxNameLength)
	}
}

func TestNameRejectsEmptyBranch(t *testing.T) {
	if _, err := Name("   "); !errors.Is(err, ErrEmptyBranch) {
		t.Errorf("Name(blank) error = %v, want ErrEmptyBranch", err)
	}
}

func TestHelmArgs(t *testing.T) {
	s := Settings{Chart: "oci://registry.example/charts/app", Namespace: "previews", Timeout: 5 * time.Minute}
	got := HelmArgs("pr-main", "3f9c2e1", s)
	want := []string{
		"upgrade", "--install", "pr-main", "oci://registry.example/charts/app",
		"--namespace", "previews",
		"--create-namespace",
		"--set", "image.tag=3f9c2e1",
		"--wait",
		"--timeout", "5m0s",
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("HelmArgs() = %v, want %v", got, want)
	}
}
