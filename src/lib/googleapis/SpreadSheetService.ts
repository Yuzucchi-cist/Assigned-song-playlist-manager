import { OAuth2ApiClient } from "#/util/http/OAuth2ApiClient";
import { GoogleApiBase } from "./GoogleApisBase";
import { Song } from "#/type/song";
import { SheetResponseSchema } from "#/validator/googleapis.z";

export class SpreadSheetService extends GoogleApiBase {
    private readonly endpoint = "https://sheets.googleapis.com/v4";
    private readonly assigned_song_range = "C4:C";
    private readonly spread_sheet_url = `${this.endpoint}/spreadsheets/${this.sheet_id}`;

    constructor(
        private readonly sheet_id: string,
        private readonly oauth_http: OAuth2ApiClient = new OAuth2ApiClient(),
    ) {
        super(oauth_http);
    }

    async getAssignedSongs(): Promise<Song[]> {
        const options = {
            headers: {
                Authorization: `Bearer ${this.access_token}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            muteHttpExceptions: true,
        };
        const query = this.oauth_http.makeQueryString({
            ranges: this.assigned_song_range,
            includeGridData: true,
        });
        const response = await this.oauth2_http.get(
            `${this.spread_sheet_url}?${query}`,
            options,
            this.refreshAccessToken.bind(this),
        );

        const parsed_response = SheetResponseSchema.parse(response);

        const songs: Song[] = parsed_response.sheets[0].data[0].rowData
            .map((row) => {
                if (
                    !(
                        row &&
                        row.values &&
                        row.values[0] &&
                        row.values[0].hyperlink &&
                        row.values[0].formattedValue
                    )
                )
                    return null;
                const youtube_video_id = this.extractYouTubeVideoId(
                    row.values[0].hyperlink,
                );
                return {
                    name: "",
                    name_and_artist: row.values[0].formattedValue,
                    youtube_video_id: youtube_video_id
                        ? youtube_video_id
                        : undefined,
                };
            })
            .filter<Song>((value) => value != null);

        return songs;
    }

    private extractYouTubeVideoId(url: string): string | null {
        const watch_url_pattern =
            /^https:\/\/(m|www)\.youtube\.com\/watch\?v=([^&]+)/;
        const short_url_pattern = /^https:\/\/youtu.be\/([^?]+)/;

        const watch_url_matched = watch_url_pattern.exec(url);
        if (watch_url_matched) return watch_url_matched[2];

        const short_url_matched = short_url_pattern.exec(url);
        if (short_url_matched) return short_url_matched[1];

        return null;
    }
}
