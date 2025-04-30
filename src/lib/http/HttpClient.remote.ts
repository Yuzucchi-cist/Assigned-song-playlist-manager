import { HttpClient } from '../../interface/HttpClient';

/**
 * Wrapper class of UrlFetchApp of GAS.
 */
export class GasHttpClient implements HttpClient {
    async get(url: string, options?: any): Promise<unknown> {
        return UrlFetchApp.fetch(url, options);
    }

    async post(url: string, options?: any): Promise<unknown> {
        return UrlFetchApp.fetch(url, {
            ...options,
            method: 'post',
        });
    }

    async put(url: string, options?: any): Promise<unknown> {
        return UrlFetchApp.fetch(url, {
            ...options,
            method: 'put',
        });
    }

    async delete(url: string, options?: any): Promise<unknown> {
        return UrlFetchApp.fetch(url, {
            ...options,
            method: 'delete',
        });
    }

    btoa(data: string): string {
        return Utilities.base64Encode(data);
    }
};