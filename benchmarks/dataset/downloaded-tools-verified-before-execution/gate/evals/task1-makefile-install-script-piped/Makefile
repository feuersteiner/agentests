.PHONY: build test vet cover docker tools lint

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

tools:
	curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/HEAD/install.sh | sh -s -- -b ./bin

lint: tools
	./bin/golangci-lint run ./...
