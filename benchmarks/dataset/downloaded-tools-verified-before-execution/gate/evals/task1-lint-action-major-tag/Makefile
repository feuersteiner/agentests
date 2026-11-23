.PHONY: build test vet cover docker lint

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

lint:
	golangci-lint run ./...
