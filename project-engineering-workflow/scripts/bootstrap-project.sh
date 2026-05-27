#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  bash scripts/bootstrap-project.sh \
    --project-name "CRM Platform" \
    --project-slug "crm-platform" \
    --stack-name "Next.js + NestJS" \
    --app-path "apps/web" \
    --test-command "pnpm test" \
    --output-dir "/absolute/path/to/target-repo" \
    [--env-output "apps/web/.env.local"]
EOF
}

PROJECT_NAME=""
PROJECT_SLUG=""
STACK_NAME=""
APP_PATH=""
ENV_OUTPUT="(none)"
TEST_COMMAND=""
OUTPUT_DIR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-name)
      PROJECT_NAME="${2:-}"
      shift 2
      ;;
    --project-slug)
      PROJECT_SLUG="${2:-}"
      shift 2
      ;;
    --stack-name)
      STACK_NAME="${2:-}"
      shift 2
      ;;
    --app-path)
      APP_PATH="${2:-}"
      shift 2
      ;;
    --env-output)
      ENV_OUTPUT="${2:-}"
      shift 2
      ;;
    --test-command)
      TEST_COMMAND="${2:-}"
      shift 2
      ;;
    --output-dir)
      OUTPUT_DIR="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$PROJECT_NAME" || -z "$PROJECT_SLUG" || -z "$STACK_NAME" || -z "$APP_PATH" || -z "$TEST_COMMAND" || -z "$OUTPUT_DIR" ]]; then
  echo "Missing required arguments." >&2
  usage
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required for placeholder rendering." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATE_ROOT="$SKILL_ROOT/assets/template-root"

mkdir -p "$OUTPUT_DIR"
cp -R "$TEMPLATE_ROOT"/. "$OUTPUT_DIR"

export BOOTSTRAP_PROJECT_NAME="$PROJECT_NAME"
export BOOTSTRAP_PROJECT_SLUG="$PROJECT_SLUG"
export BOOTSTRAP_STACK_NAME="$STACK_NAME"
export BOOTSTRAP_APP_PATH="$APP_PATH"
export BOOTSTRAP_ENV_OUTPUT="$ENV_OUTPUT"
export BOOTSTRAP_TEST_COMMAND="$TEST_COMMAND"
export BOOTSTRAP_OUTPUT_DIR="$OUTPUT_DIR"
export BOOTSTRAP_DATE="$(date +%F)"

python3 <<'PY'
import os
from pathlib import Path

root = Path(os.environ["BOOTSTRAP_OUTPUT_DIR"])
mapping = {
    "__PROJECT_NAME__": os.environ["BOOTSTRAP_PROJECT_NAME"],
    "__PROJECT_SLUG__": os.environ["BOOTSTRAP_PROJECT_SLUG"],
    "__STACK_NAME__": os.environ["BOOTSTRAP_STACK_NAME"],
    "__APP_PATH__": os.environ["BOOTSTRAP_APP_PATH"],
    "__ENV_OUTPUT__": os.environ["BOOTSTRAP_ENV_OUTPUT"],
    "__TEST_COMMAND__": os.environ["BOOTSTRAP_TEST_COMMAND"],
    "__DATE__": os.environ["BOOTSTRAP_DATE"],
}

for path in root.rglob("*"):
    if not path.is_file():
        continue
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        continue
    updated = text
    for old, new in mapping.items():
        updated = updated.replace(old, new)
    if updated != text:
        path.write_text(updated, encoding="utf-8")
PY

cat <<EOF
Bootstrap complete.

Target: $OUTPUT_DIR

Next steps:
1. Review $OUTPUT_DIR/AGENTS.md
2. Review $OUTPUT_DIR/.agents/skills/project-stack-standards/SKILL.md
3. Review $OUTPUT_DIR/.specify/memory/constitution.md
4. Review $OUTPUT_DIR/docs/Codex团队开发说明.md
5. Run: bash "$SKILL_ROOT/scripts/doctor.sh" "$OUTPUT_DIR"
EOF
