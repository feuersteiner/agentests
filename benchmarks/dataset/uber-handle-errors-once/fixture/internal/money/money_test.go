package money

import "testing"

func TestFormat(t *testing.T) {
	cases := []struct {
		cents int64
		want  string
	}{
		{1299, "12.99"},
		{2450, "24.50"},
		{110, "1.10"},
	}
	for _, c := range cases {
		if got := Format(c.cents); got != c.want {
			t.Errorf("Format(%d) = %q, want %q", c.cents, got, c.want)
		}
	}
}
