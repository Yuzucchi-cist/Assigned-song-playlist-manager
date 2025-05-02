/**
 * Wrapper class of Http request.
 */
export interface HttpClient {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get(url: string, options?: any): Promise<unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    post(url: string, options?: any): Promise<unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    put(url: string, options?: any): Promise<unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete(url: string, options?: any): Promise<unknown>;
    btoa(data: string): string;
    makeQueryString(obj: object, encode?: boolean): string;
}
