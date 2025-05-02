import { OAuth2ApiClient } from "./http/OAuth2ApiClient";
import { PlaylistManager } from "../interface/PlaylistManager";
import { getEnvVar, saveEnvVariable, saveEnvVariables } from "@/env";
import {
    SpotifyAuthTokenResponseSchema,
    SpotifyPlaylistTracksSchema,
    SpotifyTracksResponseSchema,
} from "../validator/spotify.z";
import { Song, UnfoundSongs } from "../type/song";

export class SpotifyService implements PlaylistManager {
    private readonly endpoint = "https://api.spotify.com/v1";
    private readonly token_endpoint = "https://accounts.spotify.com/api/token";
    private readonly client_id = getEnvVar("SPOTIFY_CLIENT_ID");
    private readonly client_secret = getEnvVar("SPOTIFY_CLIENT_SECRET");
    private readonly redirect_uri = getEnvVar("SPOTIFY_REDIRECT_URI");
    private readonly authorization_code = getEnvVar(
        "SPOTIFY_AUTHORIZATION_CODE",
    );
    private readonly basic_authorization: string;
    private access_token: string | undefined;
    private refresh_token: string | undefined;
    private playlist_url: string;

    constructor(
        private readonly playlistId: string,
        private readonly oauth_http = new OAuth2ApiClient(),
    ) {
        this.basic_authorization = this.oauth_http.btoa(
            this.client_id + ":" + this.client_secret,
        );
        this.playlist_url =
            this.endpoint + `/playlists/${this.playlistId}/tracks`;
    }

    /**
     * Initialize access token and refresh token.
     */
    public async init(): Promise<void> {
        try {
            this.access_token = getEnvVar("SPOTIFY_ACCESS_TOKEN");
            this.refresh_token = getEnvVar("SPOTIFY_REFRESH_TOKEN");
            if (!this.access_token.length) throw new Error();
        } catch {
            const result = await this.getFirstAccessTokenAndRefreshToken();
            this.access_token = result.access_token;
            this.refresh_token = result.refresh_token;

            if (this.refresh_token)
                saveEnvVariables({
                    SPOTIFY_ACCESS_TOKEN: this.access_token,
                    SPOTIFY_REFRESH_TOKEN: this.refresh_token,
                });
            else saveEnvVariable("SPOTIFY_ACCESS_TOKEN", this.access_token);
        }
    }

    /**
     * Delete all songs of spotify playlist and add given songs.
     * The playlist that be changed is playlist_id of this class member.
     *
     * @param songs - Songs list to be added to playlist.
     * @returns - Unfound songs list when searching.
     */
    async refreshPlaylistWith(songs: Song[]): Promise<UnfoundSongs> {
        // Remove all songs in playlist.
        console.log("get start");
        const playlist_track_ids = await this.getPlaylistSongs();
        if (playlist_track_ids.length) {
            console.log("delete start");
            await this.deletePlaylistSongs(playlist_track_ids);
        } else console.log("empty playlist, delete skipped.");

        // Search songs and add it to playlist.
        console.log("search start");
        const { ids: song_ids, unfound_songs: unfound_songs } =
            await this.searchSongs(songs);
        console.log("add start");
        await this.addSongsToPlaylist(song_ids);

        return unfound_songs;
    }

    private async getFirstAccessTokenAndRefreshToken(): Promise<{
        access_token: string;
        refresh_token: string | undefined;
    }> {
        const headers = {
            Authorization: "Basic " + this.basic_authorization,
            "Content-Type": "application/x-www-form-urlencoded",
        };
        const payload = {
            grant_type: "authorization_code",
            code: this.authorization_code,
            redirect_uri: this.redirect_uri,
        };
        const options = {
            payload: payload,
            headers: headers,
            muteHttpExceptions: true,
        };
        return this.oauth_http.getFirstAccessToken(
            this.token_endpoint,
            options,
            SpotifyAuthTokenResponseSchema,
            "https://accounts.spotify.com/authorize?response_type=code&scope=playlist-modify-public%20user-read-private&redirect_uri=https://example.com/callback&client_id=${this.client_id}",
        );
    }

    private async refreshAccessToken(): Promise<string> {
        const options = {
            headers: {
                Authorization: "Basic " + this.basic_authorization,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            payload: {
                grant_type: "refresh_token",
                refresh_token: this.refresh_token,
            },
            muteHttpExceptions: true,
        };
        const response = await this.oauth_http.post(
            this.token_endpoint,
            options,
            this.refreshAccessToken,
        );
        const parsedResponse = SpotifyAuthTokenResponseSchema.parse(response);
        this.access_token = parsedResponse.access_token;
        if (parsedResponse.refresh_token)
            this.refresh_token = parsedResponse.refresh_token;
        saveEnvVariable("SPOTIFY_ACCESS_TOKEN", this.access_token);
        return this.access_token;
    }

    private async getPlaylistSongs(): Promise<string[]> {
        const options = {
            headers: {
                Authorization: "Bearer " + this.access_token,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            muteHttpExceptions: true,
        };

        const query = {
            fields: "items(track(id,name,artists(name)))",
            limit: 50,
            offset: 0,
            additional_types: "track",
        };

        const get_playlist_song_url = `${this.playlist_url}?${this.oauth_http.makeQueryString(query)}`;
        try {
            const response = await this.oauth_http.get(
                get_playlist_song_url,
                options,
                this.refreshAccessToken.bind(this),
            );
            try {
                const parsedResponse =
                    SpotifyPlaylistTracksSchema.parse(response);
                return parsedResponse.items.map((item) => item.track.id);
            } catch (err) {
                console.log("Failed validation:");
                throw err;
            }
        } catch (err) {
            console.log(
                "Failed searching get playlist request and error skipped:",
            );
            if (err instanceof Error) console.log(err);
            throw err;
        }
    }

    private async deletePlaylistSongs(
        playlist_track_ids: string[],
    ): Promise<void> {
        const delete_body = {
            tracks: playlist_track_ids.map((id) => ({
                uri: `spotify:track:${id}`,
            })),
        };

        const delete_options = {
            headers: {
                Authorization: "Bearer " + this.access_token,
                "Content-Type": "application/json",
            },
            payload: JSON.stringify(delete_body),
            muteHttpExceptions: true,
        };
        await this.oauth_http.delete(
            this.playlist_url,
            delete_options,
            this.refreshAccessToken.bind(this),
        );
    }

    private async searchSongs(
        songs: Song[],
    ): Promise<{ ids: string[]; unfound_songs: UnfoundSongs }> {
        const options = {
            headers: {
                Authorization: "Bearer " + this.access_token,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            muteHttpExceptions: true,
        };
        const url = this.endpoint + `/search`;
        const unfound_songs: Song[] = [];

        const song_ids = await songs.reduce<Promise<string[]>>(
            async (async_acc, song) => {
                const acc = await async_acc;
                const query = {
                    q: song.name_and_artist,
                    type: "track",
                    market: "JP",
                    limit: 10,
                };

                const uri = url + `?` + this.oauth_http.makeQueryString(query);

                try {
                    const response = await this.oauth_http.get(
                        uri,
                        options,
                        this.refreshAccessToken.bind(this),
                    );
                    try {
                        const parsedResponse =
                            SpotifyTracksResponseSchema.parse(response);

                        if (parsedResponse.tracks.items.length) {
                            acc.push(parsedResponse.tracks.items[0].id!);
                        } else unfound_songs.push(song);
                    } catch (err) {
                        console.log("Failed validation:");
                        throw err;
                    }
                } catch (err) {
                    console.log(
                        "Failed searching song request and error skipped:",
                    );
                    if (err instanceof Error) console.log(err);
                }
                return acc;
            },
            Promise.resolve([]),
        );
        return {
            ids: song_ids,
            unfound_songs: unfound_songs,
        };
    }

    private async addSongsToPlaylist(song_ids: string[]) {
        const uris: string[] = song_ids.map((id) => `spotify:track:${id}`);
        const body = {
            uris: uris,
            position: 0,
        };
        const json_options = {
            headers: {
                Authorization: "Bearer " + this.access_token,
                "Content-Type": "application/json",
            },
            payload: JSON.stringify(body),
            muteHttpExceptions: true,
        };

        try {
            await this.oauth_http.post(
                this.playlist_url,
                json_options,
                this.refreshAccessToken.bind(this),
            );
        } catch (err) {
            console.log("Failed post request:");
            throw err;
        }
    }
}
