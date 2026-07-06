# sync-tab-scroll

<!-- ardd-badge-start -->
[![built with ARDD](https://img.shields.io/badge/built%20with-ARDD-blue)](https://github.com/moui72/artifact-driven-dev)
<!-- ardd-badge-end -->

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
    CatalogSong ||--o| ConsentRecord : "consent (public deployment only)"

    Session {
        string code
        string selectedSong "CatalogSong.id or null"
        string hostId
        boolean countInEnabled
        number lobbyCursorTick "null once playback starts"
        boolean spotlightMode
        string pendingHostRequest "Participant.id or null"
    }

    Participant {
        string id
        string displayName
        string role "host | member"
        string connectionStatus "connected | disconnected"
        string selectedPart "trackIndex | 'lyrics' | null"
        string readiness "no-part | loading | ready"
        number joinedAt
    }

    CatalogSong {
        string id "song slug"
        string name
        string artist
        string gpFilePath "client-fetchable URL"
        string lyricsLrc "URL or null"
        number lyricsTrackIndex "null on lrclib fallback"
        number lyricsLineIndex "lyric channel, usually 0"
        number_array lyricLineBreaks "syllables per line"
    }

    CatalogPart {
        string instrumentName
        number trackIndex "stable id for instrument parts"
    }

    PlaybackState {
        string status "stopped | running | paused"
        number tickPosition "host-client-authoritative"
        number bpm "informational only"
        number serverTimestamp
    }

    ConsentRecord {
        string submitterName
        string tosVersion
        number acceptedAt
    }
```

## Infrastructure

```mermaid
graph TD
    GP[Guitar Pro source files]
    Lrclib[lrclib.net<br/>external lyrics source]
    Pipeline[Offline lyrics-extraction pipeline<br/>alphaTab in Node]
    Catalog[(Per-song catalog directory<br/>.gp + .lrc + meta.json + consent record)]
    Server[Node + ws server<br/>in-memory sessions, host succession/transfer,<br/>consent gate at catalog load]
    HTTP[Static HTTP route<br/>/catalog/...]
    Client[Svelte client<br/>single store, reconnect-by-identity,<br/>2s retry on connection loss]
    AlphaTab[alphaTab instance per participant<br/>visible renderer or headless<br/>renders tab + plays audio + native cursor]
    SoundFont[(SoundFont asset<br/>multi-MB, part of load readiness)]

    GP --> Pipeline
    Lrclib -->|line breaks or full .lrc fallback| Pipeline
    Pipeline -->|writes .gp, .lrc, meta.json| Catalog
    Catalog -->|loaded once at startup,<br/>paths rewritten to URLs| Server
    Server --- HTTP
    HTTP -->|.gp and .lrc fetches| Client
    Client <-->|WebSocket: session-state broadcasts,<br/>playback-control, song-select, host transfer| Server
    Client -->|host only: playback-tick-report ~1/s| Server
    Server -->|periodic PlaybackState broadcast<br/>drift correction against 50-tick threshold| Client
    Client --> AlphaTab
    SoundFont --> AlphaTab
```

## UI

```mermaid
graph TD
    App[App / view-state router<br/>single client store]
    Banner[Connection-lost banner<br/>all views, non-dismissing]
    Bar[Persistent bar<br/>join code + song, Song & part,<br/>settings cog, Leave session]
    Toasts[Error toasts]
    Landing[Landing view<br/>create / join forms]
    Lobby[Lobby view<br/>state-dependent hint line]
    Playback[Playback view]

    SongPartModal[Song & part modal<br/>forced-open until both set]
    CatalogPicker[Catalog picker - host only]
    PartPicker[Part picker incl. Lyrics option]

    SettingsModal[Settings modal]
    TabParticipants[Participants tab<br/>list + host transfer controls]
    TabSession[Session tab<br/>lobby cursor + Spotlight mode,<br/>host Count-in toggle]
    TabPreferences[Preferences tab<br/>theme toggle, personal metronome]

    InstrumentView[Instrument part rendering]
    AlphaTabVisible[Visible alphaTab renderer<br/>native cursor overlay]
    Ticker[In-tab lyrics ticker<br/>single-line, snap-centered syllable]
    LyricsView[Lyrics part rendering]
    AlphaTabHeadless[Headless alphaTab instance<br/>audio + shared clock only]
    FullLyrics[Full lyrics text view<br/>.lrc line timestamps]
    LoadingBanner[Loading tab/lyrics banner]

    App --> Banner
    App --> Bar
    App --> Toasts
    App --> Landing
    App --> Lobby
    App --> Playback
    Bar --> SongPartModal
    Bar --> SettingsModal
    SongPartModal --> CatalogPicker
    SongPartModal --> PartPicker
    SettingsModal --> TabParticipants
    SettingsModal --> TabSession
    SettingsModal --> TabPreferences
    Playback --> LoadingBanner
    Playback --> InstrumentView
    Playback --> LyricsView
    InstrumentView --> AlphaTabVisible
    InstrumentView -.->|optional toggle| Ticker
    LyricsView --> AlphaTabHeadless
    LyricsView --> FullLyrics
```
