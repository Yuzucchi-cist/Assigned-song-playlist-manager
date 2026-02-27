import { getEnvVar, saveEnvVariable, saveEnvVariables } from "@/env";
import { OAuth2ApiClient } from "#/util/http/OAuth2ApiClient";
import { GoogleAuthTokenResponseSchema } from "#/validator/googleapis.z";
import { initGoogleTokens } from "@/googleToken";

export class GoogleApiBase {
    protected readonly token_endpoint = "https://oauth2.googleapis.com/token";
    protected access_token: string | undefined;
    protected refresh_token: string | undefined;

    constructor(protected readonly oauth2_http: OAuth2ApiClient) {}

    async init() {
        const result = await initGoogleTokens();
        this.access_token = result.access_token;
        this.refresh_token = result.refresh_token;

        if (this.refresh_token)
            saveEnvVariables({
                GOOGLE_ACCESS_TOKEN: this.access_token,
                GOOGLE_REFRESH_TOKEN: this.refresh_token,
            });
        else saveEnvVariable("GOOGLE_ACCESS_TOKEN", this.access_token);
    }

    protected async refreshAccessToken(): Promise<string> {
        if (!this.refresh_token) {
            // GAS path: ScriptApp.getOAuthToken() で常に新鮮なトークンを取得
            const result = await initGoogleTokens();
            this.access_token = result.access_token;
            saveEnvVariable("GOOGLE_ACCESS_TOKEN", this.access_token);
            return this.access_token;
        }

        // Local path: refresh_token を使って新しい access_token を取得
        const client_id = getEnvVar("GOOGLE_CLIENT_ID");
        const client_secret = getEnvVar("GOOGLE_CLIENT_SECRET");
        const options = {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            muteHttpExceptions: true,
            payload: `client_id=${client_id}&client_secret=${client_secret}&refresh_token=${this.refresh_token}&grant_type=refresh_token`,
        };

        const response = await this.oauth2_http.noBearerPost(
            this.token_endpoint,
            options,
        );
        const parsed_response = GoogleAuthTokenResponseSchema.parse(response);
        this.access_token = parsed_response.access_token;
        if (parsed_response.refresh_token) {
            this.refresh_token = parsed_response.refresh_token;
            saveEnvVariable("GOOGLE_REFRESH_TOKEN", this.refresh_token);
        }
        saveEnvVariable("GOOGLE_ACCESS_TOKEN", this.access_token);
        return this.access_token;
    }
}
