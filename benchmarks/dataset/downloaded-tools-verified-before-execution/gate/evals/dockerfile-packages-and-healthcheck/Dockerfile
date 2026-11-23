FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/slipway ./cmd/slipway

FROM alpine:3.20
RUN apk add --no-cache ca-certificates curl kubectl helm \
 && adduser -D -u 10001 slipway
COPY --from=build /out/slipway /usr/local/bin/slipway
USER slipway
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD curl -fsS http://localhost:8080/healthz || exit 1
ENTRYPOINT ["/usr/local/bin/slipway"]
