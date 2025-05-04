import { InvalidAccessTokenError } from '#/error/http_client';
import { HttpClient } from '#/interface/HttpClient';
import { OAuth2ApiClient } from '#/util/http/OAuth2ApiClient';

describe("OAuth2ApiClient", () => {
    const test_url = "test_url";
    const test_options = {
        headers: { Authorization: "Bearer test"},
        test: "options",
    };
    const test_response = {
        test: "response",
        data: "test_data",
    };
    const refreshed_access_token = "refreshed_access_token";
    const refreshed_options = {
        headers: { Authorization: `Bearer ${refreshed_access_token}`},
        test: "options",
    };

    // Generate Mock
    const getMock = jest.fn()
    const postMock = jest.fn()
    const putMock = jest.fn()
    const deleteMock = jest.fn()
    const btoaMock = jest.fn();
    const makeQueryStringMock = jest.fn();

    const refreshAccessTokenMock = jest.fn<Promise<string>, never, () => Promise<string>>().mockResolvedValue(refreshed_access_token);

    let oauth2: OAuth2ApiClient;


    describe("method of http requests.", () => {
        describe("noBearerPost", () => {
            const httpMock = generateHttpClientMock(getMock, postMock, putMock, deleteMock, btoaMock, makeQueryStringMock);
            oauth2 = new OAuth2ApiClient(httpMock)

            test("noBearer deligates http client post.", async () => {
                const url = "test_url";
                const options = {headers: "test_header", payload: "test_payload"};
                postMock.mockResolvedValue(test_response);

                const response = await oauth2.noBearerPost(url, options);

                expect(response).toBe(test_response);
            })
        });
        describe("get", () => {
            test_http_request("get", () => oauth2.get.bind(oauth2), getMock);
        });
        
        describe("post", () => {
            test_http_request("post", () => oauth2.post.bind(oauth2), postMock);
        });

        describe("put", () => {
            test_http_request("put", () => oauth2.put.bind(oauth2), putMock);
        });
        
        describe("delete", () => {
            test_http_request("delete", () => oauth2.delete.bind(oauth2), deleteMock);
        });
    });

    describe("other method of http request.", () => {
        beforeEach(() => {
            const httpMock = generateHttpClientMock(getMock, postMock, putMock, deleteMock, btoaMock, makeQueryStringMock);
            oauth2 = new OAuth2ApiClient(httpMock)
        });

        afterEach(() => {
            getMock.mockClear();
            postMock.mockClear();
            putMock.mockClear();
            deleteMock.mockClear();
            refreshAccessTokenMock.mockClear();
        });

        test("btoa deligates http client btoa.", () => {
            const data = "test_data";
            const encoded = "encoded_test_data";
            btoaMock.mockReturnValue(encoded);

            const result = oauth2.btoa(data);
            expect(result).toBe(encoded);
        });

        test("makeQueryString deligates http client makeQueryString.", () => {
            const obj = { test: "object"};
            const encode = true;
            const query = "encoded_query";
            makeQueryStringMock.mockReturnValue(query);

            const result = oauth2.makeQueryString(obj, encode);
            expect(result).toBe(query);
        })
    });

    function test_http_request(name: string, getReqMethod: () => (
        url: string,
        options: { headers: { Authorization: string } },
        refreshAccessToken: () => Promise<string>,
    ) => Promise<unknown>, reqMock: jest.Mock) {
        beforeEach(() => {
            const httpMock = generateHttpClientMock(getMock, postMock, putMock, deleteMock, btoaMock, makeQueryStringMock);
            oauth2 = new OAuth2ApiClient(httpMock)
        });

        afterEach(() => {
            getMock.mockClear();
            postMock.mockClear();
            putMock.mockClear();
            deleteMock.mockClear();
            refreshAccessTokenMock.mockClear();
        });

        test(`${name} deligates to http client when access token is valid.`, async () => {
            reqMock.mockResolvedValue(test_response);
            const reqMethod = getReqMethod();
            const response = await reqMethod(test_url, test_options, refreshAccessTokenMock);

            expect(reqMock).toHaveBeenCalledWith(test_url, test_options);
            expect(refreshAccessTokenMock).toHaveBeenCalledTimes(0);
            expect(response).toBe(test_response);
        });

        test(`retries ${name} method with refreshed token on InvalidAccessTokenError`, async () => {
            reqMock.mockRejectedValueOnce(new InvalidAccessTokenError).mockResolvedValue(test_response);
            const reqMethod = getReqMethod();
            const response = await reqMethod(test_url, test_options, refreshAccessTokenMock);

            expect(refreshAccessTokenMock).toHaveBeenCalled();
            expect(reqMock).toHaveBeenNthCalledWith(2, test_url, refreshed_options);
            expect(response).toBe(test_response);
        });        
    }
});

function generateHttpClientMock(
    getMethod: () => Promise<unknown>,
    postMethod: () => Promise<unknown>,
    putMethod: () => Promise<unknown>,
    deleteMethod: () => Promise<unknown>,
    btoa: (data: string) => string,
    makeQueryString: (obj: object, encode?: boolean) => string,
): HttpClient {
    return new (jest.fn<HttpClient, []>().mockImplementation(() => ({
        get: getMethod,
        post: postMethod,
        put: putMethod,
        delete: deleteMethod,
        btoa: btoa,
        makeQueryString: makeQueryString
    })))();
}