/**
 * Wrapper class of Http request.
 */
export interface HttpClient {
    get(url: string, options?: any): Promise<unknown>;
    post(url: string, options?: any): Promise<unknown>;
    put(url: string, options?: any): Promise<unknown>;
    delete(url: string, options?: any): Promise<unknown>;
    btoa(data: string): string;
    makeQueryString(obj: object, encode?: boolean): string; 
}