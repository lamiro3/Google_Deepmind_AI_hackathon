#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-komposer}"
REGION="${REGION:-asia-northeast3}"
PROJECT_ID="${1:-h2gdm-hack26icn-2688}"

echo "==> [1/4] Google Cloud 프로젝트 설정: $PROJECT_ID (리전: $REGION)"
gcloud config set project "$PROJECT_ID"

echo "==> [2/4] Cloud Run / Cloud Build / Artifact Registry API 활성화 중..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  storage.googleapis.com

echo "==> [3/4] Cloud Run 소스 버킷에 빌드 서비스 계정 권한 부여 중..."
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
CLOUDBUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
SOURCE_BUCKET="gs://run-sources-${PROJECT_ID}-${REGION}"

if gcloud storage buckets describe "$SOURCE_BUCKET" >/dev/null 2>&1; then
  gcloud storage buckets add-iam-policy-binding "$SOURCE_BUCKET" \
    --member="serviceAccount:${COMPUTE_SA}" \
    --role="roles/storage.admin" >/dev/null
  gcloud storage buckets add-iam-policy-binding "$SOURCE_BUCKET" \
    --member="serviceAccount:${CLOUDBUILD_SA}" \
    --role="roles/storage.admin" >/dev/null || true
  echo "    소스 버킷($SOURCE_BUCKET) 권한 설정 완료!"
fi

# Load GEMINI_API_KEY from .env if present
GEMINI_KEY="${GEMINI_API_KEY:-}"
if [ -z "$GEMINI_KEY" ] && [ -f .env ]; then
  GEMINI_KEY=$(grep -E '^GEMINI_API_KEY=' .env | cut -d '=' -f2- | tr -d '"' | tr -d "'" || true)
fi

ENV_ARGS="NODE_ENV=production,DB_PATH=/tmp/komposer.db"
if [ -n "$GEMINI_KEY" ]; then
  ENV_ARGS="$ENV_ARGS,GEMINI_API_KEY=$GEMINI_KEY"
fi

echo "==> [4/4] Cloud Run으로 $SERVICE_NAME 배포 중..."
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --port 8080 \
  --set-env-vars="$ENV_ARGS"

echo "==> 배포 완료!"
