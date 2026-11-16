#!/usr/bin/env bash
set -euo pipefail

# Official actionlint release, verified 16 November 2026. No pipe-to-shell install.
version='1.7.12'
expected='8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8'
if [[ "$(uname -s):$(uname -m)" != 'Linux:x86_64' ]]; then
  printf '%s\n' 'This pinned validator supports Linux x86_64; use the documented container/runner for other hosts.' >&2
  exit 1
fi
tool_dir="$(mktemp -d "${TMPDIR:-/tmp}/unihood-actionlint.XXXXXX")"
trap 'rm -rf "$tool_dir"' EXIT
archive="$tool_dir/actionlint.tar.gz"
curl --fail --silent --show-error --location --retry 3 --max-time 120 \
  "https://github.com/rhysd/actionlint/releases/download/v${version}/actionlint_${version}_linux_amd64.tar.gz" \
  --output "$archive"
printf '%s  %s\n' "$expected" "$archive" | sha256sum --check --status
tar -xzf "$archive" -C "$tool_dir" actionlint
shopt -s nullglob
workflows=(.github/workflows/*.yml .github/workflows/*.yaml)
if (( ${#workflows[@]} == 0 )); then
  printf '%s\n' 'No workflows found; run from repository root.' >&2
  exit 1
fi
"$tool_dir/actionlint" -color "${workflows[@]}"
printf '%s\n' "PASS: actionlint ${version}; checksum verified"
