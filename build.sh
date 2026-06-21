#!/bin/bash
# Build: concatenate modular source files into single index.html
# Usage: ./src/build.sh

cd "$(dirname "$0")" || exit 1
OUT="index.html"

{
  reading=true
  while IFS= read -r line; do
    if [[ "$line" =~ '<!-- INJECT:css/' ]]; then
      file=$(echo "$line" | sed 's/.*INJECT:\(.*\) -->/\1/')
      echo "  <style>"
      cat "src/$file"
      echo "  </style>"
    elif [[ "$line" =~ '<!-- INJECT:js/' ]]; then
      file=$(echo "$line" | sed 's/.*INJECT:\(.*\) -->/\1/')
      echo "  <script>"
      cat "src/$file"
      echo "  </script>"
    else
      echo "$line"
    fi
  done < "src/index.html"
} > "$OUT"

echo "Built $OUT ($(wc -l < "$OUT") lines)"
