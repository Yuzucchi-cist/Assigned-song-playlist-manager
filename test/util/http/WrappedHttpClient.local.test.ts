import { WrappedHttpClient } from '#/util/http/WrappedHttpClient.local'
import { InvalidAccessTokenError } from '#/error/http_client';

describe("AxiosHttpClient", () => {
    const httpbin_endpoint = "https://httpbin.org"
    const http = new WrappedHttpClient();
    describe("get", () => {
        test("Get response.", async () => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const example_res = {
                "args": {}, 
                "headers": {
                    "Accept": "*/*", 
                    "Host": "httpbin.org", 
                    "User-Agent": "curl/7.81.0", 
                    "X-Amzn-Trace-Id": "Root=1-680e2ac0-781ae2122aef899177939f23"
                }, 
                "origin": "49.129.127.192", 
                "url": "https://httpbin.org/get"
            };

            const res = await http.get(`${httpbin_endpoint}/get`);

            expect(res).toHaveProperty('args');
            expect(res).toHaveProperty('headers');
            expect(res).toHaveProperty('origin');
            expect(res).toHaveProperty('url');
            expect((res as {url: string})['url']).toBe("https://httpbin.org/get")
        });

        testErrorResponse((url) => http.get(url));
    });

    const example_form = {
        key1:   "value1",
        key2: "value3",
    };

    describe("post", () => {
        test("Post response.", async () => {
            const options = {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                paylocad: {
                    code: "code",
                }
            };
            const res = await http.post(`${httpbin_endpoint}/post`, example_form, options);
            expect((res as {form: unknown}).form).toStrictEqual(example_form);
            expect(
                (res as {headers: {"Content-Type": unknown}}).headers['Content-Type']
            ).toStrictEqual(options.headers['Content-Type']);
            expect((res as {url: string})['url']).toBe("https://httpbin.org/post")
        });

        testErrorResponse((url) => http.post(url));
    });

    describe("put", () => {
        const options = {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        }
        test("Put response.", async () => {
            const res = await http.put(`${httpbin_endpoint}/put`, example_form, options);
            expect((res as {form: unknown}).form).toStrictEqual(example_form);
            expect(
                (res as {headers: {"Content-Type": unknown}}).headers['Content-Type']
            ).toStrictEqual(options.headers['Content-Type']);
            expect((res as {url: string})['url']).toBe("https://httpbin.org/put")
        });

        testErrorResponse((url) => http.put(url));
    });

    function testErrorResponse(tested_method: (url: string) => Promise<unknown>) {
        test("Throw InvalidAccessTokenError if response is 401", async () => {
            const exec = async () => await tested_method(`${httpbin_endpoint}/status/401`);
            await expect(exec).rejects.toThrow(new InvalidAccessTokenError());
        });
        test("Throw error if response is not 200 or 401", async () => {
            const exec = async () => await tested_method(`${httpbin_endpoint}/status/404`);
            await expect(exec).rejects.toThrow(new Error("Request failed with status code 404"));
        });
    }
});
