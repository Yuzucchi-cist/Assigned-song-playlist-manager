import { HttpClient } from "../../interface/HttpClient";
import { InvalidAccessTokenError } from "../../error/http_client";

/**
 * Wrapper class of UrlFetchApp of GAS.
 */
export class WrappedHttpClient implements HttpClient {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async get(url: string, options?: any): Promise<unknown> {
        const res = UrlFetchApp.fetch(url, options);
        return this.response2contents(url, options, res);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async post(url: string, options?: any): Promise<unknown> {
        const res = UrlFetchApp.fetch(url, {
            ...options,
            method: "post",
        });
        return this.response2contents(url, options, res);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async put(url: string, options?: any): Promise<unknown> {
        const res = UrlFetchApp.fetch(url, {
            ...options,
            method: "put",
        });
        return this.response2contents(url, options, res);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async delete(url: string, options?: any): Promise<unknown> {
        const res = UrlFetchApp.fetch(url, {
            ...options,
            method: "delete",
        });
        return this.response2contents(url, options, res);
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

    private response2contents(url: string, options: unknown, response: GoogleAppsScript.URL_Fetch.HTTPResponse) {
        switch (response.getResponseCode()) {
            case 200:
            case 204: // Response 204 for delete playlist item response.
                return JSON.parse(response.getContentText());
            case 401:
                throw new InvalidAccessTokenError();
            default:
                console.log(url);
                console.log(options);
                console.log(response.getResponseCode);
                console.log(response.getContentText());
                throw new Error("Unknown Fetch Error!");
        }
    }
}
