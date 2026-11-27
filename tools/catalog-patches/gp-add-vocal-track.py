#!/usr/bin/env python3
"""Append a vocal track (notes plus a raw lyric line) to a .gp file.

Usage: python3 -I gp-add-vocal-track.py <in.gp> <notes.json> <raw-line.txt> <track name> <out.gp>

- <notes.json>: from vocal-place.py: {"barCount", "notes": [{bar, slot,
  length, midi}]}, with `slot` and `length` in 16ths from the bar's start,
  one plain note per syllable (no ties), each inside its bar.
- <raw-line.txt>: the track's raw lyric line, written verbatim into the new
  track's first `<Lyrics dispatched="true"><Line><Text>` CDATA.

The new track is appended after the existing ones, so their indexes (and
the part names and mute preferences keyed on them) don't move. Its XML
mirrors the catalog's existing vocal tracks (Sweetness' Lead Vocals track):
the "Voice Oohs" sound (GM program 53), not muted, a G-clef staff with the
standard guitar tuning (so the app's tab view shows fret numbers, as it does
for the other vocal tracks), and four empty extra lyric lines.

Every master bar gets one new bar, appended to its `<Bars>` list. Gaps are
filled with rests on the beat grid; an empty bar gets rests filling it.
Fails if a voice would not add up to its bar's length. Rewrites the zip
entry by entry (same order and compression); nothing else in score.gpif or
the other entries changes.
"""
import json
import re
import sys
import zipfile

src, notes_path, raw_path, name, dst = sys.argv[1:6]
plan = json.load(open(notes_path))
raw = open(raw_path, encoding="utf-8").read()
assert "]]>" not in raw and "]]>" not in name

TUNING = [40, 45, 50, 55, 59, 64]
NOTE_VALUES = {16: ("Whole", 0), 12: ("Half", 1), 8: ("Half", 0), 6: ("Quarter", 1), 4: ("Quarter", 0), 3: ("Eighth", 1), 2: ("Eighth", 0), 1: ("16th", 0)}
STEPS = [("C", ""), ("C", "#"), ("D", ""), ("D", "#"), ("E", ""), ("F", ""), ("F", "#"), ("G", ""), ("G", "#"), ("A", ""), ("A", "#"), ("B", "")]

with zipfile.ZipFile(src) as zin:
    gpif = zin.read("Content/score.gpif").decode("utf-8")
    infos = zin.infolist()
    entries = {i.filename: zin.read(i) for i in infos}


def next_id(tag):
    return max(int(x) for x in re.findall(r'<%s id="(\d+)"' % tag, gpif)) + 1


ids = {tag: next_id(tag) for tag in ["Bar", "Voice", "Beat", "Note", "Rhythm"]}
master_bars = list(re.finditer(r"<MasterBar>.*?</MasterBar>", gpif, re.S))
assert len(master_bars) == plan["barCount"], "notes.json was made for another bar count"
track_ids = re.search(r"<MasterTrack>\s*<Tracks>([\d ]+)</Tracks>", gpif)
track_id = len(track_ids.group(1).split())

# Rhythms: one new element per value used.
rhythm_ids, rhythm_xml = {}, []


def rhythm(length):
    if length not in rhythm_ids:
        value, dots = NOTE_VALUES[length]
        rhythm_ids[length] = ids["Rhythm"] + len(rhythm_ids)
        dot = '\n      <AugmentationDot count="1"/>' if dots else ""
        rhythm_xml.append(f'    <Rhythm id="{rhythm_ids[length]}">\n      <NoteValue>{value}</NoteValue>{dot}\n    </Rhythm>\n')
    return rhythm_ids[length]


def rests(a, b):
    """Rests filling 16th positions [a, b), each aligned to its own length."""
    out, p = [], a
    while p < b:
        v = next(v for v in (16, 8, 4, 2, 1) if p % v == 0 and p + v <= b)
        out.append(v)
        p += v
    return out


def pitch_xml(midi):
    step, acc = STEPS[midi % 12]
    a = f"<Accidental>{acc}</Accidental>" if acc else "<Accidental/>"
    return f"<Pitch>\n            <Step>{step}</Step>\n            {a}\n            <Octave>{midi // 12}</Octave>\n          </Pitch>"


def note_xml(nid, midi):
    while midi < TUNING[0]:
        midi += 12
    while midi > TUNING[-1] + 24:
        midi -= 12
    string = max(i for i, p in enumerate(TUNING) if p <= midi)
    fret = midi - TUNING[string]
    return (
        f'    <Note id="{nid}">\n      <InstrumentArticulation>0</InstrumentArticulation>\n      <Properties>\n'
        f'        <Property name="ConcertPitch">\n          {pitch_xml(midi)}\n        </Property>\n'
        f'        <Property name="Fret">\n          <Fret>{fret}</Fret>\n        </Property>\n'
        f'        <Property name="String">\n          <String>{string}</String>\n        </Property>\n'
        f'        <Property name="TransposedPitch">\n          {pitch_xml(midi)}\n        </Property>\n'
        f'        <Property name="Midi">\n          <Number>{midi}</Number>\n        </Property>\n'
        f"      </Properties>\n    </Note>\n"
    )


BEAT_PROPS = (
    '      <Properties>\n        <Property name="PrimaryPickupVolume">\n          <Float>0.500000</Float>\n        </Property>\n'
    '        <Property name="PrimaryPickupTone">\n          <Float>0.500000</Float>\n        </Property>\n      </Properties>\n'
    "      <Dynamic>MF</Dynamic>\n"
)

by_bar = {}
for n in plan["notes"]:
    by_bar.setdefault(n["bar"], []).append(n)

bar_xml, voice_xml, beat_xml, note_xmls, new_bar_ids = [], [], [], [], []
bid, vid, beat_id, nid = ids["Bar"], ids["Voice"], ids["Beat"], ids["Note"]
for i, mb in enumerate(master_bars):
    num, den = map(int, re.search(r"<Time>(\d+)/(\d+)</Time>", mb.group(0)).group(1, 2))
    bar_len = num * 16 // den
    events, p = [], 0  # (length, midi or None)
    for n in sorted(by_bar.get(i, []), key=lambda n: n["slot"]):
        assert n["slot"] >= p and n["slot"] + n["length"] <= bar_len, f"bar {i + 1}: note overlaps or crosses the bar line"
        events += [(v, None) for v in rests(p, n["slot"])]
        events.append((n["length"], n["midi"]))
        p = n["slot"] + n["length"]
    events += [(v, None) for v in rests(p, bar_len)]
    assert sum(v for v, _ in events) == bar_len
    beats = []
    for length, midi in events:
        notes = ""
        if midi is not None:
            note_xmls.append(note_xml(nid, midi))
            notes = f"      <Notes>{nid}</Notes>\n"
            nid += 1
        beat_xml.append(f'    <Beat id="{beat_id}">\n      <Rhythm ref="{rhythm(length)}"/>\n{BEAT_PROPS}{notes}    </Beat>\n')
        beats.append(str(beat_id))
        beat_id += 1
    voice_xml.append(f'    <Voice id="{vid}">\n      <Beats>{" ".join(beats)}</Beats>\n    </Voice>\n')
    bar_xml.append(f'    <Bar id="{bid}">\n      <Clef>G2</Clef>\n      <Voices>{vid} -1 -1 -1</Voices>\n    </Bar>\n')
    new_bar_ids.append(bid)
    bid += 1
    vid += 1
assert nid - ids["Note"] == len(plan["notes"])

empty_line = "        <Line>\n          <Text>\n            <![CDATA[]]>\n          </Text>\n          <Offset>0</Offset>\n        </Line>\n"
track_xml = f"""    <Track id="{track_id}">
      <Name>
        <![CDATA[{name}]]>
      </Name>
      <ShortName>
        <![CDATA[voc.]]>
      </ShortName>
      <Color>142 191 105</Color>
      <SystemsDefautLayout>3</SystemsDefautLayout>
      <SystemsLayout>2</SystemsLayout>
      <PalmMute>0</PalmMute>
      <PlayingStyle>Default</PlayingStyle>
      <UseOneChannelPerString/>
      <IconId>16</IconId>
      <InstrumentSet>
        <Name>Voice Oohs</Name>
        <Type>voice</Type>
        <LineCount>5</LineCount>
        <Elements>
          <Element>
            <Name>Pitched</Name>
            <Type>pitched</Type>
            <SoundbankName/>
            <Articulations>
              <Articulation>
                <Name/>
                <StaffLine>0</StaffLine>
                <Noteheads>noteheadBlack noteheadHalf noteheadWhole</Noteheads>
                <TechniquePlacement>outside</TechniquePlacement>
                <TechniqueSymbol/>
                <InputMidiNumbers/>
                <OutputRSESound/>
                <OutputMidiNumber>0</OutputMidiNumber>
              </Articulation>
            </Articulations>
          </Element>
        </Elements>
      </InstrumentSet>
      <Transpose>
        <Chromatic>0</Chromatic>
        <Octave>0</Octave>
      </Transpose>
      <RSE>
        <ChannelStrip version="E56">
          <Parameters>0.6 0.68 1 0.62 0.75 0.5 0.66 0.18 0.6 0 0.5 0.5 0.80 0.5 0.5 0.5</Parameters>
        </ChannelStrip>
      </RSE>
      <ForcedSound>-1</ForcedSound>
      <Sounds>
        <Sound>
          <Name>
            <![CDATA[Voice Oohs]]>
          </Name>
          <Label>
            <![CDATA[Voice Oohs]]>
          </Label>
          <Path>Orchestra/Other/Singer</Path>
          <Role>User</Role>
          <MIDI>
            <LSB>0</LSB>
            <MSB>0</MSB>
            <Program>53</Program>
          </MIDI>
        </Sound>
      </Sounds>
      <MidiConnection>
        <Port>0</Port>
        <PrimaryChannel/>
        <SecondaryChannel/>
        <ForeOneChannelPerString>false</ForeOneChannelPerString>
      </MidiConnection>
      <PlaybackState>Default</PlaybackState>
      <AudioEngineState>RSE</AudioEngineState>
      <Lyrics dispatched="true">
        <Line>
          <Text>
            <![CDATA[{raw}]]>
          </Text>
          <Offset>0</Offset>
        </Line>
{empty_line * 4}      </Lyrics>
      <Staves>
        <Staff>
          <Properties>
            <Property name="CapoFret">
              <Fret>0</Fret>
            </Property>
            <Property name="FretCount">
              <Number>24</Number>
            </Property>
            <Property name="PartialCapoFret">
              <Fret>0</Fret>
            </Property>
            <Property name="PartialCapoStringFlags">
              <Bitset>000000</Bitset>
            </Property>
            <Property name="Tuning">
              <Pitches>{" ".join(map(str, TUNING))}</Pitches>
              <Instrument>Guitar</Instrument>
              <Label>
                <![CDATA[]]>
              </Label>
              <LabelVisible>true</LabelVisible>
            </Property>
            <Property name="ChordCollection">
              <Items/>
            </Property>
            <Property name="ChordWorkingSet">
              <Items/>
            </Property>
            <Property name="DiagramCollection">
              <Items/>
            </Property>
            <Property name="DiagramWorkingSet">
              <Items/>
            </Property>
            <Name>
              <![CDATA[Standard]]>
            </Name>
          </Properties>
        </Staff>
      </Staves>
      <Automations/>
    </Track>
"""

# Edits, back to front so earlier offsets stay valid.
edits = []
for mb, new in zip(master_bars, new_bar_ids):
    m = re.search(r"<Bars>([\d ]+)</Bars>", mb.group(0))
    edits.append((mb.start() + m.end(1), f" {new}"))
edits.append((track_ids.end(1), f" {track_id}"))
tracks_start = gpif.index("<Tracks>\n", track_ids.end())
tracks_end = gpif.index("</Tracks>", tracks_start)
edits.append((gpif.rindex("\n", 0, tracks_end) + 1, track_xml))
for tag, xml in [("Bars", bar_xml), ("Voices", voice_xml), ("Beats", beat_xml), ("Notes", note_xmls), ("Rhythms", rhythm_xml)]:
    close = gpif.index(f"</{tag}>", gpif.index(f"\n  <{tag}>"))
    edits.append((gpif.rindex("\n", 0, close) + 1, "".join(xml)))
for pos, text in sorted(edits, reverse=True):
    gpif = gpif[:pos] + text + gpif[pos:]

with zipfile.ZipFile(dst, "w") as zout:
    for info in infos:
        if info.filename.startswith("__MACOSX") or "/._" in "/" + info.filename:
            continue
        data = gpif.encode("utf-8") if info.filename == "Content/score.gpif" else entries[info.filename]
        zout.writestr(info, data, compress_type=info.compress_type)
print(f"track {track_id} '{name}': {len(plan['notes'])} notes, {len(master_bars)} bars -> {dst}")
