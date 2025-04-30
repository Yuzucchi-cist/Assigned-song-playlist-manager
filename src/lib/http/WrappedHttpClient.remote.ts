import { HttpClient } from '../../interface/HttpClient';
import { InvalidAccessTokenError } from '../../error/http_client'

/**
 * Wrapper class of UrlFetchApp of GAS.
 */
export class WrappedHttpClient implements HttpClient {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async get(url: string, options?: any): Promise<unknown> {
        const res = UrlFetchApp.fetch(url, options);
        switch (res.getResponseCode()) {
            case 200:
                return JSON.parse(res.getContentText());
            case 401:
                throw new InvalidAccessTokenError();
            default:
                console.log(url);
                console.log(options);
                console.log(res.getContentText());
                throw new Error("Unknown Fetch Error!");
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async post(url: string, options?: any): Promise<unknown> {
        const res = UrlFetchApp.fetch(url, {
            ...options,
            method: 'post',
        });
        switch (res.getResponseCode()) {
            case 200:
            case 201:   // Response 201 for add item to playlist response
                return JSON.parse(res.getContentText());
            case 401:
                throw new InvalidAccessTokenError();
            default:
                console.log(url);
                console.log(options);
                console.log(res.getContentText());
                throw new Error("Unknown Fetch Error!");
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async put(url: string, options?: any): Promise<unknown> {
        const res = UrlFetchApp.fetch(url, {
            ...options,
            method: 'put',
        });
        switch (res.getResponseCode()) {
            case 200:
                return JSON.parse(res.getContentText());
            case 401:
                throw new InvalidAccessTokenError();
            default:
                console.log(url);
                console.log(options);
                console.log(res.getContentText());
                throw new Error("Unknown Fetch Error!");
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async delete(url: string, options?: any): Promise<unknown> {
        const res = UrlFetchApp.fetch(url, {
            ...options,
            method: 'delete',
        });
        switch (res.getResponseCode()) {
            case 200:
                return JSON.parse(res.getContentText());
            case 401:
                throw new InvalidAccessTokenError();
            default:
                console.log(url);
                console.log(options);
                console.log(res.getContentText());
                throw new Error("Unknown Fetch Error!");
        }
    }

    btoa(data: string): string {
        return Utilities.base64Encode(data);
    }

    makeQueryString(obj: { [key: string]: string; }, encode?: boolean) {
        const encode_value: boolean = encode ? encode : false;
        return Object.keys(obj).map((key) => {
            if (encode_value) {
                return `${key}=${encodeURIComponent(obj[key])}`;
            } else {
                return `${key}=${obj[key]}`;
            }
        }).join('&');
    }
} 