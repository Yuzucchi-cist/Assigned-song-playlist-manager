import { InvalidAccessTokenError } from "#/error/http_client";
import { HttpClient } from "#/interface/HttpClient";
import { WrappedHttpClient } from "@/http";

export class OAuth2ApiClient {
    constructor(
        private readonly http_client: HttpClient = new WrappedHttpClient(),
    ) {}

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
