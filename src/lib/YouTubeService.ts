import { HttpClient } from "#/interface/HttpClient";
import { PlaylistManager } from "#/interface/PlaylistManager";
import { Song, UnfoundSongs } from "#/type/song";
import { saveEnvVariables } from "#/util/env.local";
import { GoogleAuthTokenResponseSchema } from "#/validator/googleapis";
import { getEnvVar, saveEnvVariable } from "@/env";
import { WrappedHttpClient } from "@/http";

export class YouTubeService implements PlaylistManager {
    private readonly token_endpoint =
        "https://accounts.google.com/o/oauth2/v2/auth";
    private readonly http: HttpClient;
    private readonly client_id = getEnvVar("GOOGLE_CLIENT_ID");
    private readonly client_secret = getEnvVar("GOOGLE_CLIENT_SECRET");
    private readonly authorization_code = getEnvVar(
        "GOOGLE_AUTHORIZATION_CODE",
    );
    private access_token: string | undefined;
    private refresh_token: string | undefined;

    constructor(http: HttpClient = new WrappedHttpClient()) {
        this.http = http;
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

    refreshPlaylistWith(songs: Song[]): Promise<UnfoundSongs> {
        songs.toString();
        throw new Error("Method not implemented.");
    }

    private async getFirstAccessToken(): Promise<{
        access_token: string;
        refresh_token: string | undefined;
    }> {
        const options = {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            payload: {
                client_id: this.client_id,
                client_secret: this.client_secret,
                code: this.authorization_code,
                redirect_uri: "http://example.com/",
                grant_type: "authorization_code",
            },
        };

        try {
            const response = await this.http.post(this.token_endpoint, options);
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
}
