FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/slipway ./cmd/slipway

FROM alpine:3.20 AS tools
ARG KUBECTL_VERSION=1.30.4
ARG KUBECTL_SHA256=7a7f09de08e3dc01c5bbf90657ecc83d5c2da9f5791f1ebe84132b95422878dc
ARG HELM_VERSION=3.15.4
ARG HELM_SHA256=ab14d3faa25e917efe6e7135d4ecca197866738885a88b9b95d1a16d2bb5b323
RUN apk add --no-cache curl \
 && curl -fsSLo /tmp/kubectl "https://dl.k8s.io/release/v${KUBECTL_VERSION}/bin/linux/amd64/kubectl" \
 && echo "${KUBECTL_SHA256}  /tmp/kubectl" | sha256sum -c - \
 && install -m 0755 /tmp/kubectl /usr/local/bin/kubectl \
 && curl -fsSLo /tmp/helm.tgz "https://get.helm.sh/helm-v${HELM_VERSION}-linux-amd64.tar.gz" \
 && echo "${HELM_SHA256}  /tmp/helm.tgz" | sha256sum -c - \
 && tar -xzf /tmp/helm.tgz -C /tmp \
 && install -m 0755 /tmp/linux-amd64/helm /usr/local/bin/helm

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/slipway /usr/local/bin/slipway
COPY --from=tools /usr/local/bin/kubectl /usr/local/bin/kubectl
COPY --from=tools /usr/local/bin/helm /usr/local/bin/helm
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/slipway"]
