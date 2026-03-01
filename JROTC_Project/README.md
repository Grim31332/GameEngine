# Operation Cardboard Shadow

A browser-based, quest-driven first-person **stealth** training simulation set in fictional Washington, D.C.
for a JROTC-style classroom project.

## Theme and safety
- The mission is a **fictional, authorized stealth retrieval exercise**.
- All characters are stylized as **cardboard cutouts** to keep the scenario clearly non-realistic.

## Mission flow
1. Start with a briefing/presentation overlay.
2. Infiltrate while avoiding guard detection.
3. Retrieve a cardboard President cutout from the Oval Office training set.
4. Exfiltrate to the National Mall extraction zone with the cutout.

## Run locally
```bash
python3 -m http.server 8000 --directory JROTC_Project
```

Open `http://localhost:8000`.

## Controls
- `W A S D`: move
- `← →`: turn
- `Shift`: crouch-sneak (reduces detection buildup)

## Browser automation / MCP note
For screenshot tooling, you can skip the briefing click step by opening:

`http://localhost:8000/?autostart=1`

This starts gameplay immediately and helps avoid flaky click automation in headless runs.
