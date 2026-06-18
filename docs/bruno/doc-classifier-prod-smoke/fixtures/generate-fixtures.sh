#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
fixture_dir="$(pwd)"

printf '%s\n' '%PDF-1.4' '1 0 obj' '<<>>' 'endobj' '%%EOF' > smoke.pdf
printf '\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01' > mismatch.pdf
printf '\x00\x00\x00\x18ftypheic\x00\x00\x00\x00heic' > photo.heic

base64 -d > smoke.png <<'EOF'
iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF9sAAAAASUVORK5CYII=
EOF

printf '%s\n' '%PDF-1.4' > large.pdf
head -c $((10 * 1024 * 1024 + 20)) /dev/zero >> large.pdf

FIXTURE_DIR_WIN="$(cygpath -w "$fixture_dir")"
export FIXTURE_DIR_WIN

powershell.exe -NoProfile -Command '
$fixtureDir = $env:FIXTURE_DIR_WIN
$docxRoot = Join-Path $fixtureDir "tmp-docx"
$zipPath = Join-Path $fixtureDir "manual.zip"
$docxPath = Join-Path $fixtureDir "manual.docx"

Remove-Item -LiteralPath $docxRoot -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $zipPath -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $docxPath -Force -ErrorAction SilentlyContinue

New-Item -ItemType Directory -Path (Join-Path $docxRoot "_rels") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $docxRoot "word") -Force | Out-Null

Set-Content -LiteralPath (Join-Path $docxRoot "[Content_Types].xml") -Encoding utf8 -NoNewline -Value @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>
"@

Set-Content -LiteralPath (Join-Path $docxRoot "_rels\.rels") -Encoding utf8 -NoNewline -Value @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
"@

Set-Content -LiteralPath (Join-Path $docxRoot "word\document.xml") -Encoding utf8 -NoNewline -Value @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>Smoke test document</w:t>
      </w:r>
    </w:p>
    <w:sectPr/>
  </w:body>
</w:document>
"@

Compress-Archive -Path (Join-Path $docxRoot "*") -DestinationPath $zipPath -Force
Move-Item -LiteralPath $zipPath -Destination $docxPath -Force
Remove-Item -LiteralPath $docxRoot -Recurse -Force
'
