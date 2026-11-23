package db

import "testing"

func TestParseRevID(t *testing.T) {
	generation, digest, err := ParseRevID("3-9f2c")
	if err != nil || generation != 3 || digest != "9f2c" {
		t.Fatalf("got %d, %q, %v", generation, digest, err)
	}
	for _, bad := range []string{"", "3", "3-", "x-9f2c", "0-9f2c"} {
		if _, _, err := ParseRevID(bad); err == nil {
			t.Errorf("ParseRevID(%q) gave no error", bad)
		}
	}
}

func TestCompareRevIDs(t *testing.T) {
	cases := []struct {
		a, b string
		want int
	}{
		{"1-aaa", "2-aaa", -1},
		{"3-bbb", "3-aaa", 1},
		{"2-abc", "2-abc", 0},
	}
	for _, c := range cases {
		got := CompareRevIDs(c.a, c.b)
		if (got < 0) != (c.want < 0) || (got > 0) != (c.want > 0) {
			t.Errorf("CompareRevIDs(%q, %q) = %d, want sign of %d", c.a, c.b, got, c.want)
		}
	}
}
