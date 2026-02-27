# Assigned Song Playlist Manager

スプレッドシートで管理された配信曲リストをもとに、YouTube および Spotify のプレイリストを自動同期する Google Apps Script です。

A Google Apps Script that automatically synchronizes YouTube and Spotify playlists based on a list of assigned songs managed in a Google Spreadsheet.

---

## 概要 / Overview

**日本語**

Google スプレッドシートに記載された曲リスト（YouTube リンク付き）を読み取り、指定した YouTube プレイリストおよび Spotify プレイリストの内容をそのリストと一致するよう更新します。

**English**

Reads a song list (with YouTube links) from a Google Spreadsheet and updates the specified YouTube playlist and Spotify playlist to match that list.

---

## 使用する API / APIs Used

| API | 用途 / Purpose |
|-----|---------------|
| Google Sheets API | スプレッドシートから曲リストを読み取る / Read song list from spreadsheet |
| YouTube Data API v3 | プレイリストの取得・追加・削除 / Get, add, and delete playlist items |
| Spotify Web API | プレイリストの取得・追加・削除 / Get, add, and delete playlist items |

---

## プライバシーポリシー / Privacy Policy

*最終更新 / Last updated: 2026-02-27*

### 日本語

#### 収集する情報

本アプリケーションは、以下の情報にアクセスします。

- **Google スプレッドシートのデータ**: 曲名・アーティスト名・YouTube リンクを含む、スプレッドシートの指定セル範囲の内容（読み取り専用）
- **YouTube プレイリストのデータ**: 同期対象のプレイリストに含まれる動画 ID・プレイリストアイテム ID
- **Spotify プレイリストのデータ**: 同期対象のプレイリストに含まれるトラック情報

#### 情報の利用目的

取得したデータは、YouTube および Spotify のプレイリストをスプレッドシートの曲リストと同期する目的にのみ使用します。

#### データの保存

- アクセストークンは Google Apps Script の Script Properties に保存され、スクリプトの実行に必要な期間のみ保持されます。
- スプレッドシートや各プレイリストの内容を外部サーバーへ送信・保存することは一切ありません。

#### 第三者への開示

取得した情報を第三者に開示・販売・共有することはありません。

#### アクセス権限

本アプリケーションは、スクリプトを実行したユーザー本人のデータにのみアクセスします。他のユーザーのデータには一切アクセスしません。

#### お問い合わせ

プライバシーに関するご質問は、本リポジトリの Issues よりお問い合わせください。

---

### English

#### Information We Collect

This application accesses the following information:

- **Google Spreadsheet data**: Contents of the specified cell range in the spreadsheet, including song titles, artist names, and YouTube links (read-only).
- **YouTube playlist data**: Video IDs and playlist item IDs contained in the target playlist.
- **Spotify playlist data**: Track information contained in the target playlist.

#### How We Use Information

The retrieved data is used solely for the purpose of synchronizing YouTube and Spotify playlists with the song list in the spreadsheet.

#### Data Storage

- Access tokens are stored in Google Apps Script's Script Properties and are retained only for as long as necessary to execute the script.
- The contents of the spreadsheet and playlists are never transmitted to or stored on any external server.

#### Disclosure to Third Parties

We do not disclose, sell, or share any retrieved information with third parties.

#### Data Access

This application accesses only the data of the user who runs the script. It does not access data belonging to any other users.

#### Contact

For privacy-related inquiries, please open an issue in this repository.

---

## セットアップ / Setup

### 必要なもの / Requirements

- [Node.js](https://nodejs.org/) v18+
- [clasp](https://github.com/google/clasp) (`npm install -g @google/clasp`)
- Google Cloud Platform プロジェクト（Google Sheets API・YouTube Data API v3 を有効化済み）
- Spotify Developer アプリケーション

### 環境変数 / Environment Variables

`.env.exapmle.local` を参考に `.env.local` を作成してください。

| キー / Key | 説明 / Description |
|-----------|-------------------|
| `GOOGLE_CLIENT_ID` | GCP OAuth クライアント ID |
| `GOOGLE_CLIENT_SECRET` | GCP OAuth クライアントシークレット |
| `SPOTIFY_CLIENT_ID` | Spotify アプリのクライアント ID |
| `SPOTIFY_CLIENT_SECRET` | Spotify アプリのクライアントシークレット |
| `SPOTIFY_REDIRECT_URI` | Spotify OAuth リダイレクト URI |
| `YOUTUBE_PLAYLIST_ID` | 同期対象の YouTube プレイリスト ID |
| `SPREADSHEET_SHEET_ID` | 読み取り元の Google スプレッドシート ID |
| `SPOTIFY_PLAYLIST_ID` | 同期対象の Spotify プレイリスト ID |

### デプロイ / Deploy

```bash
# 依存関係をインストール / Install dependencies
npm install

# 開発環境へデプロイ / Deploy to development
npm run deploy:dev

# 本番環境へデプロイ / Deploy to production
npm run deploy:prod
```

---

## ライセンス / License

ISC
