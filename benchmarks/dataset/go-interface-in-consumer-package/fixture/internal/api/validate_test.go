package api

import "testing"

func TestValidEmail(t *testing.T) {
	cases := []struct {
		email string
		want  bool
	}{
		{"ana@larkspur.example", true},
		{"ana.lima+club@larkspur.example", true},
		{"ana", false},
		{"ana@@larkspur.example", false},
		{"ana lima@larkspur.example", false},
	}
	for _, c := range cases {
		if got := validEmail(c.email); got != c.want {
			t.Errorf("validEmail(%q) = %v, want %v", c.email, got, c.want)
		}
	}
}
