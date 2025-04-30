import axios from 'axios';

import { HttpClient } from '#/interface/HttpClient';
import { InvalidAccessTokenError } from '#/error/http_client';

/**
 * Wrapper class of local http test.
 */
export class WrappedHttpClient implements HttpClient {
    async get(url: string, options?: any): Promise<unknown> {
        return await axios.get(url, options)
            .then((res) => res.data)
            .catch(this.catch401Error);
    }
    async post(url: string, body?: any, options?: any): Promise<unknown> {
        return await axios.post(url, body, options)
            .then((res) => res.data)
            .catch(this.catch401Error);
    }
    async put(url: string, body?: any, options?: any): Promise<unknown> {
        return await axios.put(url, body, options)
            .then((res) => res.data)
            .catch(this.catch401Error);
    }

    private async catch401Error(err: any): Promise<unknown> {
        if(err.response.status == 401)  throw new InvalidAccessTokenError();
        else    throw err;
    }
    delete(url: string, options?: any): Promise<unknown> {
        throw new Error('Method not implemented.');
    }

    btoa(data: string): string {
        return btoa(data);
    }

    makeQueryString(obj: object, encode?: boolean): string {
        return new URLSearchParams(obj as any).toString();
    }
}