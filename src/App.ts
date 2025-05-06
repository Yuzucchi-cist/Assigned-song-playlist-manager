import { getEnvVar } from "@/env";
import { SpreadSheetService } from "./lib/googleapis/SpreadSheetService";
import { YouTubeService } from "./lib/googleapis/YouTubeService";
import { SpotifyService } from "./lib/SpotifyService";

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
    console.log(`Got: ${songs.length}\n]\n\t${songs.map(((song) => `${song.name_and_artist}`)).join(',\n\t')}\n]`);

    const unfound_songs = await sservice.refreshPlaylistWith(songs);
    console.log("SpotifyPlaylist refreshed.");
    console.log(`Unfound: ${unfound_songs.length}\n[\n\t${unfound_songs.map((song) => song.name_and_artist).join(',\n\t')}\n]`);

    await yservice.refreshPlaylistWith(songs);
    console.log("YouTubePlaylist refreshed.");
};
