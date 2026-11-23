FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/slipway ./cmd/slipway

FROM alpine:3.20 AS tools
ARG KUBECTL_VERSION=v1.30.4
ARG HELM_VERSION=v3.15.4
WORKDIR /tmp
RUN apk add --no-cache curl \
 && curl -fsSLO "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl" \
 && curl -fsSLO "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl.sha256" \
 && echo "$(cat kubectl.sha256)  kubectl" | sha256sum -c - \
 && install -m 0755 kubectl /usr/local/bin/kubectl \
 && curl -fsSLO "https://get.helm.sh/helm-${HELM_VERSION}-linux-amd64.tar.gz" \
 && curl -fsSLO "https://get.helm.sh/helm-${HELM_VERSION}-linux-amd64.tar.gz.sha256sum" \
 && sha256sum -c "helm-${HELM_VERSION}-linux-amd64.tar.gz.sha256sum" \
 && tar -xzf "helm-${HELM_VERSION}-linux-amd64.tar.gz" \
 && install -m 0755 linux-amd64/helm /usr/local/bin/helm

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/slipway /usr/local/bin/slipway
COPY --from=tools /usr/local/bin/kubectl /usr/local/bin/kubectl
COPY --from=tools /usr/local/bin/helm /usr/local/bin/helm
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/slipway"]
