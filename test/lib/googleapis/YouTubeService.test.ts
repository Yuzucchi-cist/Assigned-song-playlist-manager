import { HttpClient } from '#/interface/HttpClient';
import { WrappedHttpClient } from '#/util/http/WrappedHttpClient.local';
import { YouTubeService } from '#/lib/googleapis/YouTubeService';
import { GoogleAuthTokenResponseSchema, YouTubePlaylistItemResourceSchema, YouTubePlaylistItemsResponseSchema } from '#/validator/googleapis.z';
import { Song } from '#/type/song';
import { getEnvVar } from '@/env';
import { generateMock } from '@anatine/zod-mock';
import * as fs from 'fs';
import path from 'path';
import { InvalidAccessTokenError } from '#/error/http_client';
import { OAuth2ApiClient } from '#/util/http/OAuth2ApiClient';

let envFilePath: string
let envFileContent: string
let processEnv: NodeJS.ProcessEnv;

const mocked_playlist_id = "playlist_id";

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
            muteHttpExceptions: true,
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
                    `https://accounts.google.com/o/oauth2/v2/auth?scope=https://www.googleapis.com/auth/spreadsheets.readonly%20https%3A//www.googleapis.com/auth/youtube.force-ssl&prompt=consent&include_granted_scopes=true&response_type=code&access_type=offline&redirect_uri=https%3A//example.com/&client_id=${mocked_client_id}`

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
        type id_position = {
            pl_itm_id: string;
            video_id: string;
            position: number | undefined;
        };

        // old playlist id: 0, 1,       4 ,5
        // new playlist id:    1, 2, 3,    5,    7
        // playlist id to reduce:      0, 4
        // playlist id not to touch:   1, 5
        // playlist id to add:         2, 3, 7
        const old_id_indexs = [0, 1,       4 ,5];
        const new_id_indexs = [   1, 2, 3,    5,    7];
        const songs: Song[] =
            new_id_indexs.map((num) => ({name: `name_${num}`, name_and_artist: `n_and_a_${num}`, youtube_video_id: `video_id_${num}`}));
        const old_ids: id_position[] =
            old_id_indexs.map((num, i) => ({pl_itm_id: `pl_itm_id_${num}`, video_id: `video_id_${num}`, position: i}));

        const reduce_ids: id_position[] = [0, 4].map((num) => ({pl_itm_id: `pl_itm_id_${num}`, video_id: `video_id_${num}`, position: undefined}));
        const no_touch_ids: id_position[] = [1, 5].map((num) => ({pl_itm_id: `pl_itm_id_${num}`, video_id: `video_id_${num}`, position: undefined}));
        const add_ids: id_position[] = [{i: 2, p: 1}, {i: 3, p: 2}, {i: 7, p: 4}].map(({i:num, p: pos}) => ({pl_itm_id: `pl_itm_id_${num}`, video_id: `video_id_${num}`, position: pos}));
        
        const playlist_url = `${mocked_endpoint}/playlistItems`;

        const playlist_resource_items = old_ids.map(
            (id) => ({
                ...generateMock(YouTubePlaylistItemResourceSchema),
                id: id.pl_itm_id,
                snippet: {resourceId: {kind: "test_kind", videoId: id.video_id}},
            })
        );

        const mocked_playlist_item_response = { ...generateMock(YouTubePlaylistItemsResponseSchema), items: playlist_resource_items};

        const get_options = {
            "headers": {
                Authorization: 'Bearer ' + mocked_access_token,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            muteHttpExceptions: true,
        };

        const json_options = {
            "headers": {
                Authorization: 'Bearer ' + mocked_access_token,
                "Content-Type": "application/json",
            },
            muteHttpExceptions: true,
        };
        
        let getMock: jest.Mock;
        let postMock: jest.Mock;
        let putMock: jest.Mock;
        let deleteMock: jest.Mock;

        let service: YouTubeService;

        beforeEach(() => {
            getMock =
                jest.fn().mockResolvedValue(mocked_playlist_item_response);
            postMock = jest.fn().mockResolvedValue(mocked_access_token_response)
            putMock = jest.fn().mockResolvedValue(undefined);
            deleteMock = jest.fn().mockResolvedValue({snapshot_id: "abc"});
            const http_mock = generateHttpClientMock(getMock, postMock, putMock, deleteMock);
            service = generateYouTubeService(http_mock);
        });
        test("Get playlist songs.", async () => {
            const get_playlist_url_and_query = `${playlist_url}?part=id,snippet&playlistId=${mocked_playlist_id}&mine=true&maxResults=50`;

            await service.init();
            await service.refreshPlaylistWith(songs);
            expect(getMock).toHaveBeenNthCalledWith(1, get_playlist_url_and_query, get_options);
        });

        test("Remove different songs of playlist.", async () => {
            const delete_playlist_item_url_and_queries = reduce_ids.map((id) => `${playlist_url}?id=${id.pl_itm_id}`);

            await service.init();
            await service.refreshPlaylistWith(songs);

            delete_playlist_item_url_and_queries.forEach((url_and_query) => expect(deleteMock).toHaveBeenCalledWith(url_and_query, get_options));
        });

        test("Do not remove the same songs in new and old playlist.", async () => {
            const not_called_delete_playlist_item_url_and_queries = no_touch_ids.map((id) => `${playlist_url}?id=${id.pl_itm_id}`);
            
            await service.init();
            await service.refreshPlaylistWith(songs);

            not_called_delete_playlist_item_url_and_queries.forEach((url_and_query) => expect(deleteMock).not.toHaveBeenCalledWith(url_and_query, expect.objectContaining((get_options))));
        });

        test("Add difference of songs from video id to playlist.", async () => {
            const add_url_and_query = `${playlist_url}?part=snippet`
            const bodies = add_ids.map((id) => (JSON.stringify({
                snippet: {
                    playlistId: mocked_playlist_id,
                    resourceId: {
                        kind: "youtube#video",
                        videoId: id.video_id,
                    },
                    position: id.position,
                }
            })));

            await service.init();
            await service.refreshPlaylistWith(songs);

            bodies.forEach((body) => {
                expect(postMock).toHaveBeenCalledWith(add_url_and_query, { ...json_options, payload: body });
            });
        });

        test("Do not add the same songs in new and old playlist.", async () => {
            const add_url_and_query = `${playlist_url}?part=snippet`
            const not_called_bodies = no_touch_ids.map(
                (id) => expect.objectContaining({
                    snippet: expect.objectContaining({
                        playlistId: mocked_playlist_id,
                        resourceId: expect.objectContaining({
                            kind: "youtube#video",
                            videoId: id.video_id,
                        }),
                        position: expect.any(Number),
                    }),
                })
            );

            await service.init();
            await service.refreshPlaylistWith(songs);

            const called_args = postMock.mock.calls.map(
                (call) => typeof call[1].payload == "string"
                                                  ? { url: call[0], body: JSON.parse(call[1].payload) }
                                                  : { url: call[0], body: call[1].payload }
            );

            called_args.forEach((called_arg) =>
                not_called_bodies.forEach((body) =>
                    expect(called_arg).not.toEqual(
                        expect.objectContaining({
                            url: add_url_and_query,
                            body: body
                        })
                    )
                )
            )
        });

        test("All fetch of refreshing playlist", async () => {
            const get_playlist_url_and_query = `${playlist_url}?part=id,snippet&playlistId=${mocked_playlist_id}&mine=true&maxResults=50`;
            const delete_playlist_item_url_and_queries = reduce_ids.map((id) => `${playlist_url}?id=${id.pl_itm_id}`);
            const add_url_and_query = `${playlist_url}?part=snippet`
            const bodies = add_ids.map((id) => (JSON.stringify({
                snippet: {
                    playlistId: mocked_playlist_id,
                    resourceId: {
                        kind: "youtube#video",
                        videoId: id.video_id,
                    },
                    position: id.position,
                }
            })));

            await service.init();
            await service.refreshPlaylistWith(songs);

            expect(getMock).toHaveBeenNthCalledWith(1, get_playlist_url_and_query, get_options);
            delete_playlist_item_url_and_queries.forEach((url_and_query) => expect(deleteMock).toHaveBeenCalledWith(url_and_query, get_options));
            bodies.forEach((body) => {
                expect(postMock).toHaveBeenCalledWith(add_url_and_query, { ...json_options, payload: body });
            });
        });
        
        test("Refresh access token, save refreshed access token and reexec if access token has been expired.", async () => {
            const mocked_refreshed_access_token_response = { ...mocked_access_token_response };
            const refreshed_access_token = "refreshed_access_token";
            mocked_refreshed_access_token_response.access_token = refreshed_access_token;

            const get_playlist_url_and_query = `${playlist_url}?part=id,snippet&playlistId=${mocked_playlist_id}&mine=true&maxResults=50`;
            const delete_playlist_item_url_and_queries = reduce_ids.map((id) => `${playlist_url}?id=${id.pl_itm_id}`);
            const add_url_and_query = `${playlist_url}?part=snippet`
            const bodies = add_ids.map((id) => (JSON.stringify({
                snippet: {
                    playlistId: mocked_playlist_id,
                    resourceId: {
                        kind: "youtube#video",
                        videoId: id.video_id,
                    },
                    position: id.position,
                }
            })));

            getMock =
                jest.fn().mockRejectedValueOnce(new InvalidAccessTokenError())
                .mockResolvedValue(mocked_playlist_item_response);
            postMock = 
                jest.fn().mockResolvedValueOnce(mocked_access_token_response)
                .mockResolvedValue(mocked_refreshed_access_token_response);
            putMock = jest.fn().mockResolvedValue(undefined);
            deleteMock = jest.fn().mockResolvedValue({snapshot_id: "abc"});
            const http_mock = generateHttpClientMock(getMock, postMock, putMock, deleteMock);
            service = generateYouTubeService(http_mock);

            await service.init();
            await service.refreshPlaylistWith(songs);

            expect(getMock).toHaveBeenNthCalledWith(1, get_playlist_url_and_query, get_options);
            const refreshed_get_options = {
                headers: {
                    Authorization: 'Bearer ' + refreshed_access_token,
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                muteHttpExceptions: true,
            };
            expect(getMock).toHaveBeenNthCalledWith(2, get_playlist_url_and_query, refreshed_get_options);
            
            const refresh_access_token_options = {
                headers: { "Content-Type": "application/x-www-form-urlencoded"},
                payload: `client_id=${mocked_client_id}&client_secret=${mocked_client_secret}&refresh_token=${mocked_refresh_token}&grant_type=refresh_token`,
                muteHttpExceptions: true,
            };
            expect(postMock).toHaveBeenNthCalledWith(2, mocked_token_endpoint, refresh_access_token_options);
            delete_playlist_item_url_and_queries.forEach((url_and_query) => expect(deleteMock).toHaveBeenCalledWith(url_and_query, refreshed_get_options));
            const refreshed_json_options = {
                headers: {
                    Authorization: 'Bearer ' + refreshed_access_token,
                    "Content-Type": "application/json"
                },
                muteHttpExceptions: true,
            }
            bodies.forEach((body) => {
                expect(postMock).toHaveBeenCalledWith(add_url_and_query, { ...refreshed_json_options, payload: body });
            });

            expect(getEnvVar("GOOGLE_ACCESS_TOKEN")).toBe(refreshed_access_token);
        });
    });

    // TODO: Check 401 ERROR!!!!!
});

function getTestEnvFromFile(key: string): string | null {
    const regex = new RegExp(`^${key}=(.*)$`, 'm');
    const content = fs.readFileSync(envFilePath, 'utf-8');
    const matched = content.match(regex);
    return matched ? matched[1]: null;
}

function generateYouTubeService(http: HttpClient): YouTubeService {
    const preservice = new YouTubeService(mocked_playlist_id, new OAuth2ApiClient(http));
    return Object.defineProperties(preservice, {
        endpoint: {value: mocked_endpoint},
        token_endpoint: {value: mocked_token_endpoint},
        playlist_url: {value: `${mocked_endpoint}/playlistItems`},
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