import { AxiosHttpClient } from '#/lib/http/HttpClient.local'
describe("AxiosHttpClient", () => {
    const httpbin_endpoint = "https://httpbin.org"
    const http = new AxiosHttpClient();
    describe("get", () => {
        test("Get response.", async () => {
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
    });
});
