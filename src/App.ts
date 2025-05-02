import { getEnvVar } from "@/env";
import { SpreadSheetService } from "./lib/googleapis/SpreadSheetService";
import { SpotifyService } from "./lib/SpotifyService";
import { YouTubeService } from "./lib/YouTubeService";

export const App = async () => {
    console.log("Spotify start!!!");
    const sample_id = getEnvVar("SPOTIFY_PLAYLIST_ID");
    const sample_youtube_id = getEnvVar("YOUTUBE_PLAYLIST_ID");
    const sample_sheet_id = getEnvVar("SPREADSHEET_SHEET_ID");

    const sservice = new SpotifyService(sample_id);
    await sservice.init();
    console.log("SpotifyService initted.");

    const yservice = new YouTubeService(sample_youtube_id);
    await yservice.init();
    console.log("YouTubeService initted.");

    const spservice = new SpreadSheetService(sample_sheet_id);
    spservice.init();
    console.log("SpreadSheetService initted.");

    console.log("Start get assigned songs.");
    const songs = await spservice.getAssignedSongs();
    console.log(`Got:\n${songs}`);

    await sservice.refreshPlaylistWith(songs);
    console.log("SpotifyPlaylist refreshed.");

    await yservice.refreshPlaylistWith(songs);
    console.log("YouTubePlaylist refreshed.");
};
