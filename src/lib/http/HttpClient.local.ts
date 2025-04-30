import { HttpClient } from '#/interface/HttpClient';
import axios from 'axios';

/**
 * Wrapper class of local http test.
 */
export class AxiosHttpClient implements HttpClient {
    async get(url: string, options?: any): Promise<unknown> {
        return await axios.get(url, options)
            .then((res) => res.data);
    }
    async post(url: string, body?: any, options?: any): Promise<unknown> {
        return await axios.post(url, body, options)
            .then((res) => res.data);
    }
    async put(url: string, body?: any, options?: any): Promise<unknown> {
        return await axios.put(url, body, options)
            .then((res) => res.data);
    }

    delete(url: string, options?: any): Promise<unknown> {
        throw new Error('Method not implemented.');
    }

    btoa(data: string): string {
        return btoa(data);
    }
}