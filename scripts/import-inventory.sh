#!/usr/bin/env bash
# Import inventory CSV to ayurgate.com via authenticated curl.
#
# Usage:
#   scripts/import-inventory.sh /Users/karthik/Desktop/Kottakkal_Inventory_AUTO.csv
#
# Prereq: paste auth_token JWT into /tmp/ayurgate-token.txt
# Get token: login at www.ayurgate.com → DevTools → Application →
# Cookies → www.ayurgate.com → auth_token → copy value

set -euo pipefail

CSV="${1:-}"
TOKEN_FILE="${TOKEN_FILE:-/tmp/ayurgate-token.txt}"
HOST="${HOST:-https://www.ayurgate.com}"

if [[ -z "$CSV" || ! -f "$CSV" ]]; then
  echo "ERROR: pass CSV path as arg 1"; exit 1
fi
if [[ ! -f "$TOKEN_FILE" ]]; then
  echo "ERROR: paste auth_token JWT into $TOKEN_FILE first"; exit 1
fi

TOKEN=$(tr -d '[:space:]' < "$TOKEN_FILE")
if [[ -z "$TOKEN" ]]; then
  echo "ERROR: token file empty"; exit 1
fi

# Convert CSV → JSON {items: [...]} with python (numeric coercion)
JSON=$(python3 - "$CSV" <<'PY'
import csv, json, sys
rows = []
with open(sys.argv[1], newline='') as f:
    r = csv.DictReader(f)
    for row in r:
        def num(v):
            v = (v or '').strip()
            if v == '': return None
            try: return float(v)
            except: return None
        rows.append({
            'name': row['Name'].strip(),
            'category': row['Category'].strip(),
            'subcategory': (row.get('Subcategory') or '').strip() or None,
            'unit': (row.get('Unit') or '').strip() or None,
            'packing': (row.get('Packing') or '').strip() or None,
            'manufacturerCode': (row.get('Manufacturer Code') or '').strip() or None,
            'costPrice': num(row.get('Cost Price')),
            'unitPrice': num(row.get('Selling Price')),
            'gstPercent': num(row.get('GST %')),
            'currentStock': num(row.get('Current Stock')),
            'reorderLevel': num(row.get('Reorder Level')),
            'manufacturer': (row.get('Manufacturer') or '').strip() or None,
            'batchNumber': (row.get('Batch Number') or '').strip() or None,
        })
print(json.dumps({'items': rows}))
PY
)

ITEM_COUNT=$(echo "$JSON" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)["items"]))')
echo "Importing $ITEM_COUNT items from $CSV → $HOST"

RESP=$(curl -sS -w "\n%{http_code}" \
  -X POST "$HOST/api/inventory/import" \
  -H "Content-Type: application/json" \
  -H "Origin: $HOST" \
  -H "Referer: $HOST/inventory/import" \
  -H "Cookie: auth_token=$TOKEN" \
  --data-binary "$JSON")

HTTP=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')

echo "HTTP: $HTTP"
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"

if [[ "$HTTP" != "200" && "$HTTP" != "201" ]]; then
  exit 1
fi
