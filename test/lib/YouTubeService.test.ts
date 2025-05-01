import { HttpClient } from '#/interface/HttpClient';
import { WrappedHttpClient } from '#/lib/http/WrappedHttpClient.local';
import { YouTubeService } from '#/lib/YouTubeService';
import { GoogleAuthTokenResponseSchema } from '#/validator/googleapis';
import { getEnvVar } from '@/env';
import { generateMock } from '@anatine/zod-mock';
import * as fs from 'fs';
import path from 'path';

let envFilePath: string
let envFileContent: string
let processEnv: NodeJS.ProcessEnv;

const mocked_endpoint = "https://api.sample.com";
const mocked_token_endpoint = "https://token.endpoint.com";

describe("YouTubeService", () => {
    // Reset process and env file env after each test.
    beforeEach(() => {
        processEnv = {...process.env};
        envFilePath = path.join(process.cwd(), ".env.test.local");
        envFileContent = fs.readFileSync(envFilePath, 'utf-8');
    });
    afterEach(() => {
        process.env = processEnv;
        fs.writeFileSync(envFilePath, envFileContent);
    });

    // Generate mock for http request.
    const mocked_access_token_response = generateMock(GoogleAuthTokenResponseSchema);

    const mocked_access_token = mocked_access_token_response.access_token;
    const mocked_refresh_token = mocked_access_token_response.refresh_token;

    const mocked_client_id = getEnvVar("GOOGLE_CLIENT_ID");
    const mocked_client_secret = getEnvVar("GOOGLE_CLIENT_SECRET");
    const mocked_authorization_code = getEnvVar("GOOGLE_AUTHORIZATION_CODE");

    describe("init", () => {
        const getMock = jest.fn().mockResolvedValue(undefined);
        const postMock = jest.fn().mockResolvedValue(mocked_access_token_response);
        const putMock = jest.fn().mockResolvedValue(undefined);
        const deleteMock = jest.fn().mockResolvedValue(undefined);
        const httpMock = generateHttpClientMock(getMock, postMock, putMock, deleteMock);

        let service: YouTubeService;

        beforeEach(() => {
            service = generateYouTubeService(httpMock);
        });

        afterEach(() => {
            getMock.mockClear();
            postMock.mockClear();
            putMock.mockClear();
        });

        const access_token_options = {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            payload: {
                client_id: mocked_client_id,
                client_secret: mocked_client_secret,
                code: mocked_authorization_code,
                redirect_uri: "http://example.com/",
                grant_type: "authorization_code",
            }
        };

        test("Set access token to env file and service property.", async () => {
            await service.init();

            expect(postMock).toHaveBeenCalledWith(mocked_token_endpoint, access_token_options);

            expect(getTestEnvFromFile("GOOGLE_ACCESS_TOKEN")).toBe(mocked_access_token);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((service as any).access_token).toBe(mocked_access_token);
        });

        test("Throws error and message prompt to get authorization when get error response.", async () => {
            const throwed_error = new Error("test error");
            const postMock = jest.fn().mockRejectedValue(throwed_error);
            const httpMock = generateHttpClientMock(
                jest.fn().mockResolvedValue(undefined),
                postMock,
                jest.fn().mockResolvedValue(undefined),
                jest.fn().mockResolvedValue(undefined) 
            );
            const service = generateYouTubeService(httpMock);

            const error_message = 
                    `Failed get access token: ${throwed_error} \n\n` +
                    "Access get authorization code \n" +
                    `https://accounts.google.com/o/oauth2/v2/auth?scope=https%3A//www.googleapis.com/auth/youtube.force-ssl&prompt=consent&include_granted_scopes=true&response_type=code&access_type=offline&redirect_uri=https%3A//example.com/&client_id=${mocked_client_id}`

            const exec = () => service.init();
            
            await expect(exec).rejects.toStrictEqual(new Error(error_message));
        });
        
        test("Set refresh token to env file and service property.", async () => {
            await service.init();

            expect(getTestEnvFromFile("GOOGLE_REFRESH_TOKEN")).toBe(mocked_refresh_token);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((service as any).refresh_token).toBe(mocked_refresh_token);
        });

        test("Don't set refresh token and set access token when response access token is null.", async () => {
            const response_without_refresh_token = { ...mocked_access_token_response};
            response_without_refresh_token.refresh_token = undefined;
            const postMock = jest.fn().mockResolvedValue(response_without_refresh_token);
            const httpMock = generateHttpClientMock(
                jest.fn().mockResolvedValue(undefined),
                postMock,
                jest.fn().mockResolvedValue(undefined),
                jest.fn().mockResolvedValue(undefined) 
            );
            const service = generateYouTubeService(httpMock);

            await service.init();

            expect(getTestEnvFromFile("GOOGLE_ACCESS_TOKEN")).toBe(mocked_access_token);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((service as any).access_token).toBe(mocked_access_token);

            expect(getTestEnvFromFile("GOOGLE_REFRESH_TOKEN")).toBeNull();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((service as any).refresh_token).toBeUndefined();
        });

        test("Throw error when response is not match schema.", async () => {
            const postMock = jest.fn().mockResolvedValue({invalid: "Schema"});
            const httpMock = generateHttpClientMock(
                jest.fn().mockResolvedValue(undefined),
                postMock,
                jest.fn().mockResolvedValue(undefined),
                jest.fn().mockResolvedValue(undefined) 
            );
            const service = generateYouTubeService(httpMock);
            jest.spyOn(console, 'log');
            const exec = async () => await service.init();

            await expect(exec).rejects.toBeInstanceOf(Error);
            expect(console.log).toHaveBeenCalledWith("Failed validation: ");
        });

        test("If both of access token and refresh token exists, set env value.", async () => {
            const test_access_token = "test_access_token";
            const test_refresh_token = "test_refresh_token";
            process.env.GOOGLE_ACCESS_TOKEN = test_access_token;
            process.env.GOOGLE_REFRESH_TOKEN = test_refresh_token;

            await service.init();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((service as any).access_token).toBe(test_access_token);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((service as any).refresh_token).toBe(test_refresh_token);
            expect(postMock).toHaveBeenCalledTimes(0);
        });
    });

    describe("refreshPlaylistWith", () => {

    });
});

function getTestEnvFromFile(key: string): string | null {
    const regex = new RegExp(`^${key}=(.*)$`, 'm');
    const content = fs.readFileSync(envFilePath, 'utf-8');
    const matched = content.match(regex);
    return matched ? matched[1]: null;
}

function generateYouTubeService(http: HttpClient): YouTubeService {
    const preservice = new YouTubeService(http);// mocked_playlist_id, http);
    return Object.defineProperties(preservice, {
        endpoint: {value: mocked_endpoint},
        token_endpoint: {value: mocked_token_endpoint},
        /*
        playlist_url: {value: `${mocked_endpoint}/playlists/${mocked_playlist_id}/tracks`},
    */
    });
}

function generateHttpClientMock(
    getMethod: () => Promise<unknown>,
    postMethod: () => Promise<unknown>,
    putMethod: () => Promise<unknown>,
    deleteMethod: () => Promise<unknown>
): HttpClient {
    const localhttp = new WrappedHttpClient();
    return new (jest.fn<HttpClient, []>().mockImplementation(() => ({
        get: getMethod,
        post: postMethod,
        put: putMethod,
        delete: deleteMethod,
        btoa: localhttp.btoa,
        makeQueryString: localhttp.makeQueryString
    })))();
}