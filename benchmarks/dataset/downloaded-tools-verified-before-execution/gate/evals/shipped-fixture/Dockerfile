FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/slipway ./cmd/slipway

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/slipway /usr/local/bin/slipway
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/slipway"]
