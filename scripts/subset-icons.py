#!/usr/bin/env python3
"""Rebuild src/assets/fonts/material-symbols-subset.woff2 (icons the app uses, keeps the FILL axis).

Run from the project root whenever you use an icon name that is not in the font yet:
    npm i --no-save @fontsource-variable/material-symbols-outlined
    pip install fonttools brotli
    python scripts/subset-icons.py
"""
import glob, re
from fontTools.ttLib import TTFont
from fontTools import subset

SRC = "node_modules/@fontsource-variable/material-symbols-outlined/files/material-symbols-outlined-latin-fill-normal.woff2"
OUT = "src/assets/fonts/material-symbols-subset.woff2"
# Safety margin: common icons kept even if not referenced yet.
EXTRA = """medication vaccines stethoscope monitor_heart local_hospital emergency warning info check_circle error close cancel help
notifications settings person account_circle logout login home search menu more_vert more_horiz edit delete save share download upload
check done refresh sync schedule calendar_month event alarm timer favorite health_and_safety medical_services healing psychology
thermostat water_drop air bloodtype pill vital_signs ecg_heart palette light_mode dark_mode contrast brightness_6 visibility visibility_off
lock key mail phone location_on my_location map directions call chat send mic image photo_camera expand_more expand_less chevron_right
chevron_left arrow_upward arrow_downward keyboard_arrow_down keyboard_arrow_up thumb_up thumb_down content_copy history restart_alt
tune format_paint colorize check_box radio_button_checked star bookmark flag report privacy_tip verified_user shield""".split()

f = TTFont(SRC)
rev = {v: k for k, v in f.getBestCmap().items()}
ligs = {}
for lk in f["GSUB"].table.LookupList.Lookup:
    for st in lk.SubTable:
        st = getattr(st, "ExtSubTable", st)
        if hasattr(st, "ligatures"):
            for first, ll in st.ligatures.items():
                for l in ll:
                    ligs["".join(chr(rev[g]) for g in [first] + l.Component)] = l.LigGlyph

used = set()
for p in glob.glob("src/**/*.ts*", recursive=True):
    used |= set(re.findall(r"['\"`]([a-z][a-z0-9_]{1,40})['\"`]", open(p, encoding="utf8").read()))
names = sorted({u for u in used if u in ligs} | {e for e in EXTRA if e in ligs})

opts = subset.Options()
opts.layout_features = ["liga", "rlig", "calt"]
opts.layout_closure = False
opts.flavor = "woff2"
opts.glyph_names = False
opts.notdef_outline = True
opts.name_IDs = [1, 2]
s = subset.Subsetter(opts)
s.populate(text="abcdefghijklmnopqrstuvwxyz0123456789_", glyphs=[ligs[n] for n in names])
s.subset(f)
f.flavor = "woff2"
f.save(OUT)
print(f"kept {len(names)} icons -> {OUT}")
