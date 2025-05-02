import { InvalidAccessTokenError } from "#/error/http_client";
import { HttpClient } from "#/interface/HttpClient";
import { PlaylistManager } from "#/interface/PlaylistManager";
import { Song, UnfoundSongs } from "#/type/song";
import {
    GoogleAuthTokenResponseSchema,
    YouTubePlaylistItemsResponseSchema,
} from "#/validator/googleapis";
import { getEnvVar, saveEnvVariable, saveEnvVariables } from "@/env";
import { WrappedHttpClient } from "@/http";

export class YouTubeService implements PlaylistManager {
    private readonly endpoint = "https://www.googleapis.com/youtube/v3";
    private readonly token_endpoint = "https://oauth2.googleapis.com/token";
    private readonly playlist_url = this.endpoint + `/playlistItems`;
    private readonly client_id = getEnvVar("GOOGLE_CLIENT_ID");
    private readonly client_secret = getEnvVar("GOOGLE_CLIENT_SECRET");
    private readonly authorization_code = getEnvVar(
        "GOOGLE_AUTHORIZATION_CODE",
    );
    private access_token: string | undefined;
    private refresh_token: string | undefined;
    private youtube_client: YouTubeApiClient;

    constructor(
        private readonly playlist_id: string,
        private readonly http: HttpClient = new WrappedHttpClient(),
    ) {
        this.youtube_client = new YouTubeApiClient(http);
    }

    async init(): Promise<void> {
        try {
            this.access_token = getEnvVar("GOOGLE_ACCESS_TOKEN");
            this.refresh_token = getEnvVar("GOOGLE_REFRESH_TOKEN");
        } catch {
            const result = await this.getFirstAccessToken();
            this.access_token = result.access_token;
            this.refresh_token = result.refresh_token;

            if (this.refresh_token)
                saveEnvVariables({
                    GOOGLE_ACCESS_TOKEN: this.access_token,
                    GOOGLE_REFRESH_TOKEN: this.refresh_token,
                });
            else saveEnvVariable("GOOGLE_ACCESS_TOKEN", this.access_token);
        }
    }

    async refreshPlaylistWith(songs: Song[]): Promise<UnfoundSongs> {
        // Remove all songs in playlist.
        console.log("Start to get playlist.");
        const current_playlist_ids = await this.getPlaylistItems();

        console.log("Srart to delete playlist.");
        await this.deletePlaylistItems(current_playlist_ids);

        console.log("Srart to add items to playlist.");
        return await this.addItemsToPlaylist(songs);
    }

    private async getFirstAccessToken(): Promise<{
        access_token: string;
        refresh_token: string | undefined;
    }> {
        const options = {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            muteHttpExceptions: true,
            payload: {
                client_id: this.client_id,
                client_secret: this.client_secret,
                code: this.authorization_code,
                redirect_uri: "http://example.com/",
                grant_type: "authorization_code",
            },
        };

        try {
            const response = await this.youtube_client.authPost(
                this.token_endpoint,
                options,
            );
            try {
                const parsed_response =
                    GoogleAuthTokenResponseSchema.parse(response);

                return {
                    access_token: parsed_response.access_token,
                    refresh_token: parsed_response.refresh_token,
                };
            } catch (err) {
                console.log("Failed validation: ");
                throw err;
            }
        } catch (err) {
            throw new Error(
                `Failed get access token: ${err} \n\n` +
                    "Access get authorization code \n" +
                    `https://accounts.google.com/o/oauth2/v2/auth?scope=https%3A//www.googleapis.com/auth/youtube.force-ssl&prompt=consent&include_granted_scopes=true&response_type=code&access_type=offline&redirect_uri=https%3A//example.com/&client_id=${this.client_id}`,
            );
        }
    }

    private async getPlaylistItems(): Promise<string[]> {
        const options = {
            headers: {
                Authorization: `Bearer ${this.access_token}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            muteHttpExceptions: true,
        };

        const query = `part=id&playlistId=${this.playlist_id}&mine=true&maxResults=50`;
        const response = await this.youtube_client.get(
            `${this.playlist_url}?${query}`,
            options,
            this.refreshAccessToken.bind(this),
        );
        const parsed_response =
            YouTubePlaylistItemsResponseSchema.parse(response);
        return parsed_response.items.map((item) => item.id);
    }

    private async deletePlaylistItems(
        current_playlist_ids: string[],
    ): Promise<void> {
        const options = {
            headers: {
                Authorization: `Bearer ${this.access_token}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            muteHttpExceptions: true,
        };
        console.log("Start to delete playlist items.");
        current_playlist_ids.forEach(async (id) => {
            await this.youtube_client.delete(
                `${this.playlist_url}?id=${id}`,
                options,
                this.refreshAccessToken.bind(this),
            );
        });
    }

    private async addItemsToPlaylist(songs: Song[]): Promise<UnfoundSongs> {
        const options = {
            headers: {
                Authorization: `Bearer ${this.access_token}`,
                "Content-Type": "application/json",
            },
            muteHttpExceptions: true,
        };

        const unfoundSongs: UnfoundSongs = [];

        songs.forEach(async (song) => {
            if (!song.youtube_video_id) {
                unfoundSongs.push(song);
                return;
            }
            const body = {
                snippet: {
                    playlistId: this.playlist_id,
                    resourceId: {
                        kind: "youtube#video",
                        videoId: song.youtube_video_id,
                    },
                },
            };

            const json_options = {
                ...options,
                payload: JSON.stringify(body),
            };

            await this.youtube_client.post(
                `${this.playlist_url}?part=snippet`,
                json_options,
                this.refreshAccessToken.bind(this),
            );
        });

        return unfoundSongs;
    }

    async refreshAccessToken(): Promise<string> {
        const options = {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            muteHttpExceptions: true,
            payload: `client_id=${this.client_id}&client_secret=${this.client_secret}&refresh_token=${this.refresh_token}&grant_type=refresh_token`,
        };

        const response = await this.youtube_client.authPost(
            this.token_endpoint,
            options,
        );
        const parsed_response = GoogleAuthTokenResponseSchema.parse(response);
        this.access_token = parsed_response.access_token;
        saveEnvVariable("GOOGLE_ACCESS_TOKEN", this.access_token);
        return this.access_token;
    }
}

class YouTubeApiClient {
    constructor(private readonly http_client: HttpClient) {}

    authPost(url: string, options: unknown): Promise<unknown> {
        return this.http_client.post(url, options);
    }

    async get(
        url: string,
        options: { headers: { Authorization: string } },
        refreshAccessToken: () => Promise<string>,
    ): Promise<unknown> {
        try {
            return await this.http_client.get(url, options);
        } catch (err) {
            if (err instanceof InvalidAccessTokenError) {
                const refreshed_access_token = await refreshAccessToken();
                options = { ...options };
                options.headers = {
                    ...options.headers,
                    Authorization: "Bearer " + refreshed_access_token,
                };
                return await this.http_client.get(url, options);
            } else throw err;
        }
    }

    async post(
        url: string,
        options: { headers: { Authorization: string } },
        refreshAccessToken: () => Promise<string>,
    ): Promise<unknown> {
        try {
            return await this.http_client.post(url, options);
        } catch (err) {
            if (err instanceof InvalidAccessTokenError) {
                const refreshed_access_token = await refreshAccessToken();
                options = { ...options };
                options.headers = {
                    ...options.headers,
                    Authorization: "Bearer " + refreshed_access_token,
                };
                return await this.http_client.post(url, options);
            } else throw err;
        }
    }

    async put(
        url: string,
        options: { headers: { Authorization: string } },
        refreshAccessToken: () => Promise<string>,
    ): Promise<unknown> {
        try {
            return await this.http_client.put(url, options);
        } catch (err) {
            if (err instanceof InvalidAccessTokenError) {
                const refreshed_access_token = await refreshAccessToken();
                options = { ...options };
                options.headers = {
                    ...options.headers,
                    Authorization: "Bearer " + refreshed_access_token,
                };
                return await this.http_client.put(url, options);
            } else throw err;
        }
    }

    async delete(
        url: string,
        options: { headers: { Authorization: string } },
        refreshAccessToken: () => Promise<string>,
    ): Promise<unknown> {
        try {
            return await this.http_client.delete(url, options);
        } catch (err) {
            if (err instanceof InvalidAccessTokenError) {
                const refreshed_access_token = await refreshAccessToken();
                options = { ...options };
                options.headers = {
                    ...options.headers,
                    Authorization: "Bearer " + refreshed_access_token,
                };
                return await this.http_client.delete(url, options);
            } else throw err;
        }
    }
}
