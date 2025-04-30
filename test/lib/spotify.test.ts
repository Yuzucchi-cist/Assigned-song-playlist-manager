import { SpotifyService } from "#/lib/SpotifyService";
import { HttpClient } from '#/interface/HttpClient';
import { generateMock } from '@anatine/zod-mock';
import { SpotifyAuthTokenResponseSchema} from '#/validator/spotify';
import { getEnvVar } from '@/env';
import * as fs from 'fs';
import path from 'path';

let envFilePath: string
let envFileContent: string
let processEnv: any;

const mocked_playlist_id = "samplePlaylistId";
const mocked_endpoint = "https://api.sample.com";
const mocked_token_endpoint = "https://token.endpoint.com";

describe("SpotifyService", () => {
    // Reset env file after test.
    beforeAll(() => {
        envFilePath = path.join(process.cwd(), ".env.test.local");
        envFileContent = fs.readFileSync(envFilePath, 'utf-8');
    });
    afterAll(() => fs.writeFileSync(envFilePath, envFileContent));

    // Reset process env after each test.
    beforeEach(() => {
        processEnv = {...process.env};
    });
    afterEach(() => {
        process.env = processEnv;
    });

    // Generate mock for http requests.
    const mocked_access_token_response = generateMock(SpotifyAuthTokenResponseSchema);
    const mocked_access_token = mocked_access_token_response.access_token;
    const mocked_refresh_token = mocked_access_token_response.refresh_token;

    describe("init", () => {
        const access_token_options = {
            "payload": {
                "grant_type": "authorization_code",
                "code": getEnvVar("SPOTIFY_AUTHORIZATION_CODE"),
                "redirect_uri": "https://example.com/callback"
            },
            "headers": {
                Authorization: `Basic ${btoa(getEnvVar("SPOTIFY_CLIENT_ID") + ":" + (getEnvVar("SPOTIFY_CLIENT_SECRET")))}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            "muteHttpExceptions": true,
        }

        const getMock = jest.fn().mockResolvedValue(undefined);
        const postMock = jest.fn().mockResolvedValue(mocked_access_token_response)
        const putMock = jest.fn().mockResolvedValue(undefined)
        const deleteMock = jest.fn().mockResolvedValue(undefined)
        const httpMock = generateHttpClientMock(getMock, postMock, putMock, deleteMock);

        let service: SpotifyService;

        beforeEach(() => {
            service = generateSpotifyClient(httpMock);
        });

        afterEach(() => {
            getMock.mockClear();
            postMock.mockClear();
            putMock.mockClear();
        });

        test("Set access token to env file and service property.", async () => {;
            await service.init();
            expect(postMock).toHaveBeenCalledWith(mocked_token_endpoint, access_token_options);
            expect(getTestEnvFromFile("SPOTIFY_ACCESS_TOKEN")).toBe(mocked_access_token);
            expect((service as any).access_token).toBe(mocked_access_token);
        });

        test("Set refresh token to env file and service property.", async () => {;
            await service.init();

            expect(postMock).toHaveBeenCalledWith(mocked_token_endpoint, access_token_options);
            expect(getTestEnvFromFile("SPOTIFY_REFRESH_TOKEN")).toBe(mocked_refresh_token);
            expect((service as any).refresh_token).toBe(mocked_refresh_token);
        });

        test("If both of access token and refresh token exists, set env value.", async () => {
            const test_access_token = "test_access_token";
            process.env.SPOTIFY_ACCESS_TOKEN = test_access_token;
            const test_refresh_token = "test_refresh_token";
            process.env.SPOTIFY_REFRESH_TOKEN = test_refresh_token;

            await service.init();

            expect((service as any).access_token).toBe(test_access_token);
            expect((service as any).refresh_token).toBe(test_refresh_token);
            expect(postMock).toHaveBeenCalledTimes(0);
        });
    });
});

function getTestEnvFromFile(key: string): string | null {
    const regex = new RegExp(`^${key}=(.*)$`, 'm');
    const content = fs.readFileSync(envFilePath, 'utf-8');
    const matched = content.match(regex);
    return matched ? matched[1]: null;
}

function generateSpotifyClient(http: HttpClient): SpotifyService {
    const preservice = new SpotifyService(mocked_playlist_id, http);
    return Object.defineProperties(preservice, {
        endpoint: {value: mocked_endpoint},
        token_endpoint: {value: mocked_token_endpoint},
        playlist_url: {value: `${mocked_endpoint}/playlists/${mocked_playlist_id}/tracks`},
    });
}

function generateHttpClientMock(
    getMethod: () => Promise<unknown>,
    postMethod: () => Promise<unknown>,
    putMethod: () => Promise<unknown>,
    deleteMethod: () => Promise<unknown>
): HttpClient {
    return new (jest.fn<HttpClient, []>().mockImplementation(() => ({
        get: getMethod,
        post: postMethod,
        put: putMethod,
        delete: deleteMethod,
        btoa: btoa,
    })))();
}