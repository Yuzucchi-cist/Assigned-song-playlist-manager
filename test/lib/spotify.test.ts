import { SpotifyService } from "#/lib/SpotifyService";
import { HttpClient } from '#/interface/HttpClient';
import { InvalidAccessTokenError } from '#/error/http_client';
import { Song } from '#/type/song';
import { generateMock } from '@anatine/zod-mock';
import { SpotifyAuthTokenResponseSchema, SpotifyPlaylistTracksSchema, SpotifyTracksResponseSchema } from '#/validator/spotify';
import { getEnvVar } from '#/util/env.local';
import * as fs from 'fs';
import path from 'path';
import { WrappedHttpClient } from '#/lib/http/WrappedHttpClient.local';

let envFilePath: string
let envFileContent: string
let processEnv: NodeJS.ProcessEnv;

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

    describe("init", () => {
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((service as any).access_token).toBe(mocked_access_token);
        });

        test("Set refresh token to env file and service property.", async () => {;
            await service.init();

            expect(postMock).toHaveBeenCalledWith(mocked_token_endpoint, access_token_options);
            expect(getTestEnvFromFile("SPOTIFY_REFRESH_TOKEN")).toBe(mocked_refresh_token);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((service as any).refresh_token).toBe(mocked_refresh_token);
        });

        test("If both of access token and refresh token exists, set env value.", async () => {
            const test_access_token = "test_access_token";
            process.env.SPOTIFY_ACCESS_TOKEN = test_access_token;
            const test_refresh_token = "test_refresh_token";
            process.env.SPOTIFY_REFRESH_TOKEN = test_refresh_token;

            await service.init();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((service as any).access_token).toBe(test_access_token);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((service as any).refresh_token).toBe(test_refresh_token);
            expect(postMock).toHaveBeenCalledTimes(0);
        });
    });

    const songs: Song[] = [{ name: "a", name_and_artist: "b" }];

    describe("refreshPlaylistWith", () => {
        const search_query = {q: songs[0].name_and_artist, type: "track", market: "JP", limit: 10};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const search_url_and_query = `${mocked_endpoint}/search?${new URLSearchParams(search_query as any).toString()}`
        const playlist_url = `${mocked_endpoint}/playlists/${mocked_playlist_id}/tracks`;

        const mock_tracks_res = generateMock(SpotifyTracksResponseSchema);
        const get_playlist_tracks_response = generateMock(SpotifyPlaylistTracksSchema);

        const playlist_tracks: {tracks: Array<{uri: string}>} = {
            tracks: { ...get_playlist_tracks_response }.items.map(
                (item) => ({ uri: `spotify:track:${item.track.id}`})),
        };

        const get_options = {
            "headers": {
                Authorization: 'Bearer ' + mocked_access_token,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            "muteHttpExceptions": true,
        };
        const json_options = {
            "headers": {
                Authorization: 'Bearer ' + mocked_access_token,
                "Content-Type": "application/json",
            },
            "muteHttpExceptions": true,
        };

        let getMock: jest.Mock;
        let postMock: jest.Mock;
        let putMock: jest.Mock;
        let deleteMock: jest.Mock;

        let service: SpotifyService;

        beforeEach(() => {
            getMock =
                jest.fn()
                    .mockResolvedValueOnce(get_playlist_tracks_response)
                    .mockResolvedValue(mock_tracks_res);
            postMock = jest.fn().mockResolvedValue(mocked_access_token_response)
            putMock = jest.fn().mockResolvedValue(undefined);
            deleteMock = jest.fn().mockResolvedValue({snapshot_id: "abc"});
            const http_mock = generateHttpClientMock(getMock, postMock, putMock, deleteMock);
            service = generateSpotifyClient(http_mock);
        });

        afterEach(() => {
            getMock.mockClear();
            postMock.mockClear();
            putMock.mockClear();
            deleteMock.mockClear();
        });

        test("Get playlist songs.", async () => {
            const get_playlist_url_and_query = `${playlist_url}?fields=items%28track%28id%2Cname%2Cartists%28name%29%29%29&limit=50&offset=0&additional_types=track`;

            await service.init();
            await service.refreshPlaylistWith(songs);
            expect(getMock).toHaveBeenNthCalledWith(1, get_playlist_url_and_query, get_options);
        });

        test("Remove all songs of playlist.", async () => {
            await service.init();
            await service.refreshPlaylistWith(songs);

            expect(deleteMock).toHaveBeenCalledWith(
                playlist_url, { ...json_options, payload: JSON.stringify(playlist_tracks)});
        });        

        test("Search songs", async () => {
            await service.init();
            await service.refreshPlaylistWith(songs);

            expect(getMock)
                .toHaveBeenCalledWith(search_url_and_query, get_options);
        });

        test("Add search songs to playlist.", async () => {
            const payload = JSON.stringify({uris: [`spotify:track:${mock_tracks_res.tracks.items[0].id}`], position: 0});

            await service.init();
            await service.refreshPlaylistWith(songs);

            expect(postMock).toHaveBeenCalledWith(playlist_url, { ...json_options, payload: payload});
        });

        test("All fetch of refreshing playlist", async () => {
            await service.init();
            await service.refreshPlaylistWith(songs);

            // Get playlist songs.
            const get_playlist_url_and_query = `${playlist_url}?fields=items%28track%28id%2Cname%2Cartists%28name%29%29%29&limit=50&offset=0&additional_types=track`;
            expect(getMock).toHaveBeenNthCalledWith(1, get_playlist_url_and_query, get_options);

            // Delete all playlist songs.
            expect(deleteMock).toHaveBeenCalledWith(
                playlist_url, { ...json_options, payload: JSON.stringify(playlist_tracks)});

            // Search new songs.
            expect(getMock)
                .toHaveBeenCalledWith(search_url_and_query, get_options);

            // Add searched songs.
            const payload = JSON.stringify({uris: [`spotify:track:${mock_tracks_res.tracks.items[0].id}`], position: 0});
            expect(postMock).toHaveBeenCalledWith(playlist_url, { ...json_options, payload: payload});
        });

        test("Refresh access token, save refreshed access token and reexec if access token has been expired.", async () => {
            const get_playlist_url_and_query = `${playlist_url}?fields=items%28track%28id%2Cname%2Cartists%28name%29%29%29&limit=50&offset=0&additional_types=track`;
            const mocked_refreshed_access_token = "refreshed_access_token";
            const mocked_refreshed_access_token_response = {...mocked_access_token_response};
            mocked_refreshed_access_token_response.access_token = mocked_refreshed_access_token;
            const getMock =
            jest.fn()
                .mockRejectedValueOnce(new InvalidAccessTokenError())
                .mockResolvedValueOnce(get_playlist_tracks_response)
                .mockResolvedValue(mock_tracks_res);
            const postMock =
            jest.fn()
                .mockResolvedValueOnce(mocked_access_token_response)
                .mockResolvedValue(mocked_refreshed_access_token_response);
            const http_mock = generateHttpClientMock(getMock, postMock, putMock, deleteMock);
            const service = generateSpotifyClient(http_mock);

            await service.init();
            await service.refreshPlaylistWith(songs);

            expect(getMock).toHaveBeenNthCalledWith(1, get_playlist_url_and_query, get_options);
            const refreshed_get_options = {
                headers: {
                    Authorization: 'Bearer ' + mocked_refreshed_access_token,
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                "muteHttpExceptions": true,
            };
            expect(getMock)
                .toHaveBeenNthCalledWith(2, get_playlist_url_and_query, refreshed_get_options);
            expect(getMock)
                .toHaveBeenNthCalledWith(3, search_url_and_query, refreshed_get_options);
                
            const refresh_access_token_options = {
                headers: {
                    Authorization: access_token_options.headers.Authorization,
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                payload: {
                    grant_type: "refresh_token",
                    refresh_token: mocked_access_token_response.refresh_token,
                },
                "muteHttpExceptions": true,
            }
            expect(postMock)
                .toHaveBeenNthCalledWith(2,
                    mocked_token_endpoint, refresh_access_token_options
                );
            expect(postMock)
                .toHaveBeenNthCalledWith(3,
                    `${mocked_endpoint}/playlists/${mocked_playlist_id}/tracks`,
                    {
                        headers: {
                            Authorization: 'Bearer ' + mocked_refreshed_access_token,
                            "Content-Type": "application/json"
                        },
                        "muteHttpExceptions": true,
                        payload: JSON.stringify({uris: [`spotify:track:${mock_tracks_res.tracks.items[0].id}`], position: 0})});
            expect(getTestEnvFromFile("SPOTIFY_ACCESS_TOKEN"))
                .toBe(mocked_refreshed_access_token);
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