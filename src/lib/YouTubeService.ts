import { OAuth2ApiClient } from "#/util/http/OAuth2ApiClient";
import { PlaylistManager } from "#/interface/PlaylistManager";
import { Song, UnfoundSongs } from "#/type/song";
import { YouTubePlaylistItemsResponseSchema } from "#/validator/googleapis.z";
import { GoogleApiBase } from "./googleapis/GoogleApisBase";

export class YouTubeService extends GoogleApiBase implements PlaylistManager {
    private readonly endpoint = "https://www.googleapis.com/youtube/v3";
    private readonly playlist_url = this.endpoint + `/playlistItems`;

    constructor(
        private readonly playlist_id: string,
        private readonly oauth_http: OAuth2ApiClient = new OAuth2ApiClient(),
    ) {
        super(oauth_http);
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

    private async getPlaylistItems(): Promise<string[]> {
        const options = {
            headers: {
                Authorization: `Bearer ${this.access_token}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            muteHttpExceptions: true,
        };

        const query = `part=id&playlistId=${this.playlist_id}&mine=true&maxResults=50`;
        const response = await this.oauth_http.get(
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
            await this.oauth_http.delete(
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

            await this.oauth_http.post(
                `${this.playlist_url}?part=snippet`,
                json_options,
                this.refreshAccessToken.bind(this),
            );
        });

        return unfoundSongs;
    }
}
