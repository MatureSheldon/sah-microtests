#!/usr/bin/env bash
# Interactive git checkpoint helper for sah-microtests.
# Only runs commit/push after explicit approval at each prompt.

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

branch="$(git rev-parse --abbrev-ref HEAD)"

echo "=== Git checkpoint ==="
echo "Repository: $repo_root"
echo "Branch:     $branch"
echo ""
echo "=== git status ==="
git status
echo ""

read -r -p "Commit all changes on this branch? [y/N] " commit_confirm
case "$(printf '%s' "$commit_confirm" | tr '[:upper:]' '[:lower:]')" in
  y|yes) ;;
  *)
    echo "Checkpoint aborted (no commit)."
    exit 0
    ;;
esac

read -r -p "Commit message: " commit_message
if [[ -z "${commit_message// }" ]]; then
  echo "Commit message cannot be empty. Checkpoint aborted."
  exit 1
fi

git add -A
git commit -m "$commit_message"

echo ""
echo "Commit created on branch: $branch"
echo ""

read -r -p "Push to origin/$branch? [y/N] " push_confirm
case "$(printf '%s' "$push_confirm" | tr '[:upper:]' '[:lower:]')" in
  y|yes)
    git push -u origin "$branch"
    echo "Pushed to origin/$branch"
    ;;
  *)
    echo "Push skipped."
    ;;
esac

echo ""
echo "=== git status (after checkpoint) ==="
git status
