import { getEnvVar } from '@/env';
import { SpotifyService } from './lib/SpotifyService';
import { Song } from './type/song';

export const App = async () => {
    console.log("Spotify start!!!");
    const sample_id = getEnvVar("SPOTIFY_PLAYLIST_ID");

    const sservice = new SpotifyService(sample_id);
    await sservice.init();
    console.log("SpotifyService initted.");
    const songs: Song[] = [
        {name: "完全感覚Dreamer", name_and_artist: "完全感覚ドリーマー/ONE OK ROCK"},
        {name: "立ち上がリーヨ", name_and_artist: "立ち上がリーヨ/T-Pistonz"}
    ];
    await sservice.refreshPlaylistWith(songs);
    console.log("Playlist refreshed.");
};