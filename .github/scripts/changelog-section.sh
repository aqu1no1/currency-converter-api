#!/usr/bin/env sh
set -eu

version="$1"
file="${2:-CHANGELOG.md}"

section=$(awk -v version="$version" '
  index($0, "## [" version "] - ") == 1 { found = 1; next }
  found && /^## \[/ { exit }
  found { print }
' "$file" | sed -e '/./,$!d')

if [ -z "$(printf '%s' "$section" | tr -d '[:space:]')" ]; then
  echo "CHANGELOG.md não tem a seção ## [$version] - AAAA-MM-DD, ou ela está vazia" >&2
  exit 1
fi

printf '%s\n' "$section"
