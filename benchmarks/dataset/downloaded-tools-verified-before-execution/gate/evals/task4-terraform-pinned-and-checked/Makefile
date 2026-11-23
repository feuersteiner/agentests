.PHONY: build test vet cover docker install-tools

build:
	go build -o bin/slipway ./cmd/slipway

test:
	go test ./...

vet:
	go vet ./...

cover:
	go test -coverprofile=coverage.out ./...
	go tool cover -func=coverage.out

docker:
	docker build -t slipway:dev .

install-tools:
	./scripts/install-tools.sh
