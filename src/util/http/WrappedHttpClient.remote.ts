import { HttpClient } from "../../interface/HttpClient";
import { InvalidAccessTokenError } from "../../error/http_client";

/**
 * Wrapper class of UrlFetchApp of GAS.
 */
export class WrappedHttpClient implements HttpClient {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async get(url: string, options?: any): Promise<unknown> {
        const res = this.fetchWithRetry(url, options);
        return this.response2contents(url, res);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async post(url: string, options?: any): Promise<unknown> {
        const res = this.fetchWithRetry(url, {
            ...options,
            method: "post",
        });
        return this.response2contents(url, res);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async put(url: string, options?: any): Promise<unknown> {
        const res = this.fetchWithRetry(url, {
            ...options,
            method: "put",
        });
        return this.response2contents(url, res);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async delete(url: string, options?: any): Promise<unknown> {
        const res = this.fetchWithRetry(url, {
            ...options,
            method: "delete",
        });
        return this.response2contents(url, res);
    }

    /**
     * Retry on 5xx server errors (e.g. Spotify returns transient 503)
     * with exponential backoff.
     */
    private fetchWithRetry(
        url: string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        options?: any,
        max_attempts = 3,
    ): GoogleAppsScript.URL_Fetch.HTTPResponse {
        let response = UrlFetchApp.fetch(url, options);
        for (let attempt = 1; attempt < max_attempts; attempt++) {
            if (response.getResponseCode() < 500) return response;
            console.log(
                `HTTP ${response.getResponseCode()} from ${url}, retrying (${attempt}/${max_attempts - 1})`,
            );
            Utilities.sleep(1000 * 2 ** (attempt - 1));
            response = UrlFetchApp.fetch(url, options);
        }
        return response;
    }

    btoa(data: string): string {
        return Utilities.base64Encode(data);
    }

    makeQueryString(obj: { [key: string]: string }, encode?: boolean) {
        const encode_value: boolean = encode ? encode : true;
        return Object.keys(obj)
            .map((key) => {
                if (encode_value) {
                    return `${key}=${encodeURIComponent(obj[key])}`;
                } else {
                    return `${key}=${obj[key]}`;
                }
            })
            .join("&");
    }

    private response2contents(url: string, response: GoogleAppsScript.URL_Fetch.HTTPResponse) {
        switch (response.getResponseCode()) {
            case 200:
            case 201: // Response 201 for Created.
            case 204: // Response 204 for delete playlist item response.
                return JSON.parse(response.getContentText());
            case 401:
                throw new InvalidAccessTokenError();
            default:
                console.log(url);
                console.log(response.getResponseCode());
                console.log(response.getContentText());
                throw new Error(
                    `Fetch failed: HTTP ${response.getResponseCode()} from ${url}: ${response.getContentText()}`,
                );
        }
    }
}
