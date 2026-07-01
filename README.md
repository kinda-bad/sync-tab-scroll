# sync-tab-scroll

A synchronized tab-scrolling app for musicians playing together remotely.
See `.project/artifacts/` for the full artifact-driven-dev specification
(`constitution.md`, `datamodel.md`, `pipeline.md`, `infrastructure.md`,
`ui.md`, `brand.md`) and `.project/STATUS.md` for current status.

## Datamodel

```mermaid
erDiagram
    Session ||--o{ Participant : "participants"
    Session ||--o{ CatalogPart : "availableParts"
    Session ||--|| PlaybackState : "playbackState"
    CatalogSong ||--o{ CatalogPart : "parts"
    CatalogSong ||--o{ Session : "selectedSong"
    CatalogPart ||--o{ Participant : "selectedPart"

    Session {
        string code
        string selectedSong
        string hostId
        boolean countInEnabled
        boolean metronomeEnabled
        number lobbyCursorTick
    }

    Participant {
        string id
        string displayName
        string role
        string connectionStatus
        string selectedPart
        string readiness
    }

    CatalogSong {
        string name
        string artist
        string gpFilePath
        string lyricsLrc
        number lyricsTrackIndex
        number lyricsLineIndex
        number_array lyricLineBreaks
    }

    CatalogPart {
        string id
        string instrumentName
        number trackIndex
    }

    PlaybackState {
        string status
        number tickPosition
        number bpm
        number serverTimestamp
    }
```

## Infrastructure

```mermaid
graph TD
    GP[Guitar Pro Source Files]
    Pipeline[Lyrics Extraction Pipeline]
    Catalog[(Per-Song Catalog Directory<br/>.gp + .lrc + meta.json)]
    Server[Node + ws WebSocket Server]
    Client[Svelte Client]
    AlphaTab[alphaTab: renders tab + plays audio]
    SoundFont[(SoundFont Asset)]

    GP --> Pipeline
    Pipeline -->|writes .gp, .lrc, meta.json| Catalog
    Server -->|reads catalog| Catalog
    Client <-->|WebSocket: playback control, PlaybackState| Server
    Client -->|loads .gp + catalog meta| AlphaTab
    SoundFont -->|loaded for audio playback| AlphaTab
    AlphaTab -->|tickPosition/timePosition drift correction| Client
```

## UI

```mermaid
graph TD
    App[App / View Router]
    Landing[Landing View]
    Lobby[Lobby View]
    Playback[Playback View]
    PartPicker[Song / Part Picker]
    ParticipantList[Participant List]
    LobbyCursor[Lobby Cursor Pointer]
    InstrumentView[Instrument Part Rendering]
    LyricsView[Lyrics Part Rendering]
    AlphaTabVisible[Visible alphaTab Renderer + Native Cursor]
    LyricsOverlay[In-Tab Lyrics Overlay]
    AlphaTabHeadless[Headless alphaTab Instance]
    FullLyrics[Full Lyrics Text View]

    App --> Landing
    App --> Lobby
    App --> Playback
    Lobby --> PartPicker
    Lobby --> ParticipantList
    Lobby --> LobbyCursor
    Playback --> InstrumentView
    Playback --> LyricsView
    InstrumentView --> AlphaTabVisible
    InstrumentView -.->|optional toggle| LyricsOverlay
    LyricsView --> AlphaTabHeadless
    LyricsView --> FullLyrics
```
