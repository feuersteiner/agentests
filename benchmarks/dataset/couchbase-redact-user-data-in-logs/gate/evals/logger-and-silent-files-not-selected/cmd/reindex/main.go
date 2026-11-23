package main

import (
	"flag"
	"log"
)

func main() {
	owner := flag.String("owner", "", "reindex only this user's documents")
	flag.Parse()
	log.Printf("reindexing documents of %s", *owner)
}
