import { getEnvVar, saveEnvVariable, saveEnvVariables } from "@/env";
import { OAuth2ApiClient } from "#/util/http/OAuth2ApiClient";
import { GoogleAuthTokenResponseSchema } from "#/validator/googleapis.z";

// TODO: Add tests.
export class GoogleApiBase {
    protected readonly token_endpoint = "https://oauth2.googleapis.com/token";
    protected readonly client_id = getEnvVar("GOOGLE_CLIENT_ID");
    protected readonly client_secret = getEnvVar("GOOGLE_CLIENT_SECRET");
    protected readonly authorization_code = getEnvVar(
        "GOOGLE_AUTHORIZATION_CODE",
    );
    protected access_token: string | undefined;
    protected refresh_token: string | undefined;

    constructor(protected readonly oauth2_http: OAuth2ApiClient) {}

    async init() {
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

    protected async getFirstAccessToken(): Promise<{
        access_token: string;
        refresh_token: string | undefined;
    }> {
        const options = {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            muteHttpExceptions: true,
            payload: {
                code: this.authorization_code,
                client_id: this.client_id,
                client_secret: this.client_secret,
                redirect_uri: "http://example.com/",
                grant_type: "authorization_code",
            },
        };
        return await this.oauth2_http.getFirstAccessToken(
            this.token_endpoint,
            options,
            GoogleAuthTokenResponseSchema,
            `https://accounts.google.com/o/oauth2/v2/auth?scope=https://www.googleapis.com/auth/spreadsheets.readonly%20https%3A//www.googleapis.com/auth/youtube.force-ssl&prompt=consent&include_granted_scopes=true&response_type=code&access_type=offline&redirect_uri=https%3A//example.com/&client_id=${this.client_id}`,
        );
    }

    protected async refreshAccessToken(): Promise<string> {
        const options = {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            muteHttpExceptions: true,
            payload: `client_id=${this.client_id}&client_secret=${this.client_secret}&refresh_token=${this.refresh_token}&grant_type=refresh_token`,
        };

        const response = await this.oauth2_http.noBearerPost(
            this.token_endpoint,
            options,
        );
        const parsed_response = GoogleAuthTokenResponseSchema.parse(response);
        this.access_token = parsed_response.access_token;
        saveEnvVariable("GOOGLE_ACCESS_TOKEN", this.access_token);
        return this.access_token;
    }
}
