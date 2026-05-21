#!/usr/bin/env bash
# Hook UserPromptSubmit: anade cada prompt a prompts-log.md.
# Recibe el JSON del evento por stdin. No edites prompts-log.md a mano.
jq -r '"\n\n---\n\n### " + (now|localtime|strftime("%Y-%m-%d %H:%M")) + "\n\n" + (.prompt // "(sin texto)")' >> prompts-log.md 2>/dev/null
exit 0
