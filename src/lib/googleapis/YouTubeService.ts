import { OAuth2ApiClient } from "#/util/http/OAuth2ApiClient";
import { PlaylistManager } from "#/interface/PlaylistManager";
import { Song, UnfoundSongs } from "#/type/song";
import { YouTubePlaylistItemsResponseSchema } from "#/validator/googleapis.z";
import { GoogleApiBase } from "./GoogleApisBase";

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
        const unfoundSongs: UnfoundSongs = [];
        const video_ids = songs
            .map((song) => {
                if (song.youtube_video_id) return song.youtube_video_id;
                else {
                    unfoundSongs.push(song);
                    return null;
                }
            })
            .filter((id) => id != null);

        // Remove different songs in playlist.
        console.log("Start to get playlist.");
        const current_playlist_ids = await this.getPlaylistItems();

        console.log("Srart to delete playlist.");

        const delete_ids = current_playlist_ids
            .filter((old) => !video_ids.includes(old.video_id))
            .map((to_delete) => to_delete.id);
        await this.deletePlaylistItems(delete_ids);

        // Add defferent songs in playlist.
        console.log("Srart to add items to playlist.");

        const add_ids = video_ids.filter(
            (id) =>
                !current_playlist_ids
                    .map((id_set) => id_set.video_id)
                    .includes(id),
        );

        await this.addItemsToPlaylist(add_ids);

        return unfoundSongs;
    }

    private async getPlaylistItems(): Promise<
        { id: string; video_id: string }[]
    > {
        const options = {
            headers: {
                Authorization: `Bearer ${this.access_token}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            muteHttpExceptions: true,
        };

        const query = `part=id,snippet&playlistId=${this.playlist_id}&mine=true&maxResults=50`;
        const response = await this.oauth_http.get(
            `${this.playlist_url}?${query}`,
            options,
            this.refreshAccessToken.bind(this),
        );
        const parsed_response =
            YouTubePlaylistItemsResponseSchema.parse(response);
        return parsed_response.items.map((item) => ({
            id: item.id,
            video_id: item.snippet.resourceId.videoId,
        }));
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

    private async addItemsToPlaylist(ids: string[]): Promise<void> {
        const options = {
            headers: {
                Authorization: `Bearer ${this.access_token}`,
                "Content-Type": "application/json",
            },
            muteHttpExceptions: true,
        };

        ids.forEach(async (id) => {
            const body = {
                snippet: {
                    playlistId: this.playlist_id,
                    resourceId: {
                        kind: "youtube#video",
                        videoId: id,
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
    }
}
