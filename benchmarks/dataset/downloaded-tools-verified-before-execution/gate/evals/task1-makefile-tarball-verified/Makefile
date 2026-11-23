.PHONY: build test vet cover docker tools lint

GOLANGCI_LINT_VERSION := 1.61.0
# SHA-256 of golangci-lint-$(GOLANGCI_LINT_VERSION)-linux-amd64.tar.gz, from the release's checksums file
GOLANGCI_LINT_SHA256 := da1d2b520c9f72a4f8581e0d4a783790b3f7e21fd8f3876846a0f5e45f834b56
GOLANGCI_LINT_TGZ := https://github.com/golangci/golangci-lint/releases/download/v$(GOLANGCI_LINT_VERSION)/golangci-lint-$(GOLANGCI_LINT_VERSION)-linux-amd64.tar.gz

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

# Downloads golangci-lint into bin/ and checks it against the recorded checksum before unpacking it.
tools:
	mkdir -p bin
	curl -fsSLo bin/golangci-lint.tar.gz $(GOLANGCI_LINT_TGZ)
	echo "$(GOLANGCI_LINT_SHA256)  bin/golangci-lint.tar.gz" | sha256sum -c -
	tar -xzf bin/golangci-lint.tar.gz -C bin --strip-components=1 golangci-lint-$(GOLANGCI_LINT_VERSION)-linux-amd64/golangci-lint
	rm bin/golangci-lint.tar.gz

lint:
	bin/golangci-lint run ./...
