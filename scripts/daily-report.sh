#!/bin/bash
# Daily Activity Report — Ayur Centre Clinic Management System
# Usage: ./scripts/daily-report.sh [days_back]
# Cron:  0 20 * * * cd /Users/karthik/Cladue\ CODE1/patient-registration && ./scripts/daily-report.sh

DAYS=${1:-1}
SINCE=$(date -v-${DAYS}d +%Y-%m-%d)
EMAIL="ayurcentresg@gmail.com"
PROJECT="Ayur Centre — Clinic Management System"
REPO_DIR="/Users/karthik/Cladue CODE1/patient-registration"

cd "$REPO_DIR" || exit 1

# Gather data
COMMITS=$(git log --since="$SINCE" --format="• %s (%h)" 2>/dev/null)
COMMIT_COUNT=$(git log --since="$SINCE" --oneline 2>/dev/null | wc -l | tr -d ' ')
FILES_CHANGED=$(git log --since="$SINCE" --stat --format="" 2>/dev/null | tail -1)
BRANCH=$(git branch --show-current)
LAST_PUSH=$(git log origin/main -1 --format="%ar" 2>/dev/null)

# Build report
REPORT="
════════════════════════════════════════
  $PROJECT
  Daily Activity Report — $(date '+%d %B %Y')
════════════════════════════════════════

📊 SUMMARY
  Branch: $BRANCH
  Commits (last ${DAYS}d): $COMMIT_COUNT
  Last pushed to Railway: $LAST_PUSH
  $FILES_CHANGED

📝 COMMITS SINCE $SINCE
$COMMITS

🔗 LINKS
  GitHub: https://github.com/ayurcentresg-debug/patient-registration
  Railway: Check Railway dashboard for deployment status

════════════════════════════════════════
  Generated: $(date '+%d %b %Y %H:%M:%S')
════════════════════════════════════════
"

# Display
echo "$REPORT"

# If 'mail' is available, email it
if command -v mail &>/dev/null; then
    echo "$REPORT" | mail -s "[$PROJECT] Daily Report — $(date '+%d %b %Y')" "$EMAIL"
    echo "✅ Emailed to $EMAIL"
else
    echo ""
    echo "ℹ️  To email this report, configure 'mail' command or copy the above."
    echo "   Alternatively, run: ./scripts/daily-report.sh | pbcopy"
    echo "   Then paste into Gmail."
fi
