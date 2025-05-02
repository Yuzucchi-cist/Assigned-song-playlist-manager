import { getEnvVar } from '@/env';
import { SpotifyService } from './lib/SpotifyService';
import { YouTubeService } from "./lib/YouTubeService";
import { Song } from './type/song';

export const App = async () => {
    console.log("Spotify start!!!");
    const sample_id = getEnvVar("SPOTIFY_PLAYLIST_ID");
    const sample_youtube_id = getEnvVar("YOUTUBE_PLAYLIST_ID");

    const sservice = new SpotifyService(sample_id);
    await sservice.init();
    console.log("SpotifyService initted.");

    const yservice = new YouTubeService(sample_youtube_id);
    yservice.init();

    console.log("YouTubeService initted.");
    const songs: Song[] = [
        {
            name: "完全感覚Dreamer",
            name_and_artist: "完全感覚ドリーマー/ONE OK ROCK",
            youtube_video_id: "xGbxsiBZGPI",
        },
        {
            name: "立ち上がリーヨ",
            name_and_artist: "立ち上がリーヨ/T-Pistonz",

            youtube_video_id: "VyYC49rXiSw",
        },
    ];
    await sservice.refreshPlaylistWith(songs);
    console.log("SpotifyPlaylist refreshed.");

    await yservice.refreshPlaylistWith(songs);
    console.log("YouTubePlaylist refreshed.");
};
