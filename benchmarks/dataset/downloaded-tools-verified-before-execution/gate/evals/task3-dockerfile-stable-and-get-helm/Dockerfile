FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/slipway ./cmd/slipway

FROM alpine:3.20 AS tools
RUN apk add --no-cache curl bash openssl \
 && curl -fsSLo /usr/local/bin/kubectl "https://dl.k8s.io/release/$(curl -fsSL https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" \
 && chmod +x /usr/local/bin/kubectl \
 && curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/slipway /usr/local/bin/slipway
COPY --from=tools /usr/local/bin/kubectl /usr/local/bin/kubectl
COPY --from=tools /usr/local/bin/helm /usr/local/bin/helm
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/slipway"]
