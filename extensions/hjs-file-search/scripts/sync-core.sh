#!/bin/zsh --no-rcs
set -euo pipefail
here="${0:A:h:h}"
core="${here:h:h}/hjs-launcher-core"
src="$core/implementations/raycast-ts/src"
dst="$here/src/core"
[[ -d "$src" ]] || { print -ru2 -- "FAIL: missing $src"; exit 1; }
cp "$src/parse.ts" "$src/classify.ts" "$src/match.ts" "$src/hint.ts" "$dst/"
cp "$core/contracts/taxonomy.json" "$dst/taxonomy.json"
print -r -- "ok synced core → $dst (taxonomy.ts kept local)"
