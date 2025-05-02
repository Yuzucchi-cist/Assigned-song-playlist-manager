import { Song, UnfoundSongs } from "../type/song";

/**
 * Manage each playlist.
 */
export interface PlaylistManager {
    /**
     * Delete all songs of playlist and add songs.
     * @param songs - Songs array to add playlist.
     */
    refreshPlaylistWith(songs: Song[]): Promise<UnfoundSongs>;
}
