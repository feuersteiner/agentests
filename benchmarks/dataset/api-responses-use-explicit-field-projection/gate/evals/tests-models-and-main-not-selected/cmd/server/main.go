// Command server runs marginalia with a store seeded with sample rows.
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"corvidfinch.example/marginalia/internal/handler"
	"corvidfinch.example/marginalia/internal/model"
	"corvidfinch.example/marginalia/internal/router"
	"corvidfinch.example/marginalia/internal/store"
)

func main() {
	addr := os.Getenv("MARGINALIA_ADDR")
	if addr == "" {
		addr = ":8080"
	}
	adminToken := os.Getenv("MARGINALIA_TOKEN")

	st := store.New()
	seed(st)

	log.Printf("marginalia listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, router.New(handler.New(st), adminToken)))
}

// seed fills st with a few sample rows for local runs.
func seed(st *store.Store) {
	day := time.Date(2026, 4, 6, 7, 30, 0, 0, time.UTC)
	editor := st.AddUser(model.User{
		Name:         "Maren Holt",
		Email:        "maren@corvidfinch.example",
		PasswordHash: "$2a$12$Qm9vZ3VzIGhhc2ggZm9yIGxvY2FsIHJ1bnMgb25seS4uLi4uLi4uLi4u",
		Role:         "editor",
		Bio:          "Edits Field Notes and counts waders on the Wash every winter.",
		AvatarURL:    "https://img.corvidfinch.example/people/maren.jpg",
		CreatedAt:    day.AddDate(-2, 0, 0),
	})
	writer := st.AddUser(model.User{
		Name:         "Tomas Reyes",
		Email:        "tomas@corvidfinch.example",
		PasswordHash: "$2a$12$U2Vjb25kIGJvZ3VzIGhhc2ggZm9yIGxvY2FsIHJ1bnMuLi4uLi4uLi4u",
		Role:         "writer",
		Bio:          "Writes about urban raptors.",
		AvatarURL:    "https://img.corvidfinch.example/people/tomas.jpg",
		CreatedAt:    day.AddDate(-1, 0, 0),
	})
	kestrels := st.AddPost(model.Post{
		AuthorID:    writer.ID,
		Slug:        "kestrels-on-the-gasholder",
		Title:       "Kestrels on the gasholder",
		Body:        "A pair has nested on the old gasholder frame for the third spring running.",
		PublishedAt: day,
	})
	st.AddPost(model.Post{
		AuthorID:    editor.ID,
		Slug:        "spring-count-results",
		Title:       "Spring count results",
		Body:        "Thank you to the 412 readers who sent in their counts.",
		PublishedAt: day.AddDate(0, 0, 7),
	})
	st.AddPost(model.Post{
		AuthorID: editor.ID,
		Slug:     "swift-boxes",
		Title:    "Swift boxes (draft)",
		Body:     "Notes for the June issue.",
		Draft:    true,
	})

	ctx := context.Background()
	comments := []model.Comment{
		{PostID: kestrels.ID, Name: "Ines", Email: "ines.b@mailbox.example", Body: "We saw them hunting over the canal yesterday.", IPHash: "6f1c0e", Approved: true, CreatedAt: day.Add(3 * time.Hour)},
		{PostID: kestrels.ID, UserID: writer.ID, Name: "Tomas Reyes", Email: writer.Email, Body: "Thanks, Ines. The male usually hunts there at dusk.", IPHash: "0a9d44", Approved: true, CreatedAt: day.Add(5 * time.Hour)},
		{PostID: kestrels.ID, Name: "Ray", Email: "raymond@post.example", Body: "Is the frame safe to visit?", IPHash: "c3b27e", CreatedAt: day.Add(26 * time.Hour)},
	}
	for _, c := range comments {
		added, err := st.AddComment(ctx, c)
		if err != nil {
			log.Fatalf("seed: %v", err)
		}
		if c.Approved {
			if err := st.ApproveComment(ctx, added.ID); err != nil {
				log.Fatalf("seed: %v", err)
			}
		}
	}
}
