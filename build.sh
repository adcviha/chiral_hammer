#!/bin/bash
# Chiral Hammer build script — concatenates source into single HTML output.
# Usage: ./build.sh
# Output: chiral_hammer.html (overwritten)
set -e

OUTPUT="chiral_hammer.html"
SRC="src"

{
  # Header up to </head>, strip the stylesheet link (we inline CSS)
  sed -n '1,/<\/head>/p' "$SRC/index.html" | sed '$d' | grep -v 'link rel="stylesheet"'

  # Inline CSS
  echo '  <style>'
  cat "$SRC/style.css"
  echo '  </style>'
  echo '</head>'

  # Body between </head> and first <script> tag
  sed -n '/<\/head>/,/<script/p' "$SRC/index.html" \
    | sed '1d;$d'

  # THREE.js CDN
  echo '<script src="https://unpkg.com/three@0.160.0/build/three.min.js"></script>'

  # Inline all JS in dependency order (IIFEs chain via window.Chiral)
  echo '<script>'
  for js in \
    state.js \
    scene.js \
    camera.js \
    input.js \
    tools/tile.js \
    tools/fill.js \
    tools/wall.js \
    tools/select.js \
    tools/house.js \
    ui.js \
    persistence.js \
    main.js
  do
    echo "// ===== $js ====="
    cat "$SRC/$js"
    echo ''
  done
  echo '</script>'

  echo '</body>'
  echo '</html>'
} > "$OUTPUT"

echo "Built $OUTPUT ($(wc -c < "$OUTPUT") bytes)"
