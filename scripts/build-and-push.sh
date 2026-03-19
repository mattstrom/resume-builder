#!/usr/bin/env bash
set -euo pipefail

REGISTRY="${REGISTRY:-registry.mattstrom.com}"
TAG="${TAG:-latest}"

docker build -f packages/backend/Dockerfile -t "$REGISTRY/resume-builder-backend:$TAG" .
docker build -f packages/resume-builder/Dockerfile -t "$REGISTRY/resume-builder-web:$TAG" .

docker push "$REGISTRY/resume-builder-backend:$TAG"
docker push "$REGISTRY/resume-builder-web:$TAG"
