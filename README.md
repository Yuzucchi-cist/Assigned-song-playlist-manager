# CPC-ASSIGNED-SONG-PLAYLIST-MANAGER

## Overview
Making playlist of cpc assigned songs.
Supported with:
- Spotify (planned)
- YouTube (planned)

## Requirement
- Windows 11 with WSL2 (Ubuntu 22.04)
- Node.js 22.15
- TypeScript 5.8.3

## Usage
```
npm i
clasp login
clasp create --title $DEVELOPMENT_TITLE --type standalone
mv .clasp.json .clasp.dev.json
clasp create --title $PRODUCED_TITLE --type standalone
mv .clasp.json .clasp.prod.json
```

## Features
- Get songs from Google Spreadsheet
- Add to each playlists

## Author
- [X](https://x.com/yuzucchi_bass)