import { InvalidAccessTokenError } from "#/error/http_client";
import { HttpClient } from "#/interface/HttpClient";
import { WrappedHttpClient } from "@/http";
import { z } from "zod";

export class OAuth2ApiClient {
    constructor(
        private readonly http_client: HttpClient = new WrappedHttpClient(),
    ) {}

    async getFirstAccessToken(
        endpoint: string,
        options: unknown,
        responseSchema: z.ZodObject<{
            access_token: z.ZodString;
            refresh_token: z.ZodOptional<z.ZodString>;
        }>,
        get_auth_code_url: string,
    ): Promise<{
        access_token: string;
        refresh_token: string | undefined;
    }> {
        try {
            const response = await this.http_client.post(endpoint, options);
            try {
                const parsed_response = responseSchema.parse(response);

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
                    get_auth_code_url,
            );
        }
    }

    noBearerPost(url: string, options?: unknown): Promise<unknown> {
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
            console.log(err);
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

    btoa(data: string): string {
        return this.http_client.btoa(data);
    }
    makeQueryString(obj: object, encode?: boolean): string {
        return this.http_client.makeQueryString(obj, encode);
    }
}
