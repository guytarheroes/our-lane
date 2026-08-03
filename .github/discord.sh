#!/bin/sh
# ยิง embed หนึ่งใบเข้า Discord — รับค่าทาง env ล้วน ไม่มี ${{ }} โผล่ในสคริปต์
# jq --arg คือตัวกัน injection: บังคับให้ทุกค่ากลายเป็น JSON string เสมอ ไม่ใช่โค้ด
set -e

if [ -z "$WEBHOOK" ]; then
  echo "ยังไม่ได้ตั้ง secret DISCORD_WEBHOOK — ข้ามการแจ้งเตือน"
  exit 0
fi

jq -n \
  --arg title "$TITLE" \
  --arg desc "$DESC" \
  --arg project "$PROJECT" \
  --arg node "$NODE" \
  --arg branch "$BRANCH" \
  --arg commit "$COMMIT" \
  --arg url "$RUN_URL" \
  --argjson color "$COLOR" \
  '{embeds:[{
    title: $title,
    url: $url,
    color: $color,
    description: $desc,
    fields: [
      {name: "Project", value: $project, inline: true},
      {name: "Node", value: $node, inline: true},
      {name: "Repo/Branch", value: $branch, inline: true},
      {name: "Commit", value: $commit, inline: false}
    ]
  }]}' \
  | curl -sS -f -X POST -H 'Content-Type: application/json' -d @- "$WEBHOOK"
