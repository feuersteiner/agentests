FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/slipway ./cmd/slipway

FROM alpine:3.20 AS tools
ADD --checksum=sha256:c156061b47b0361d24e96c61eafdd435086fa7b8b0c5345c16460c846418f99a --chmod=755 \
    https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 /usr/local/bin/yq

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/slipway /usr/local/bin/slipway
COPY --from=tools /usr/local/bin/yq /usr/local/bin/yq
USER nonroot:nonroot
ENTRYPOINT ["/usr/local/bin/slipway"]
