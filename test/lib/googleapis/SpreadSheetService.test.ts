import { HttpClient } from '#/interface/HttpClient';
import { SpreadSheetService } from '#/lib/googleapis/SpreadSheetService';
import { OAuth2ApiClient } from '#/util/http/OAuth2ApiClient';
import { GoogleAuthTokenResponseSchema } from '#/validator/googleapis.z';
import { WrappedHttpClient } from '#/util/http/WrappedHttpClient.local';
import { generateMock } from '@anatine/zod-mock';
import * as fs from 'fs';
import path from 'path';
import { Song } from '#/type/song';

let envFilePath: string
let envFileContent: string
let processEnv: NodeJS.ProcessEnv;

const test_sheet_id = "test_sheet_id";
const mocked_endpoint = "https://api.sample.com";
const mocked_token_endpoint = "https://token.endpoint.com";
const assigned_song_range = "C5:C";
const assigned_song_range_query = "C5%3AC";
const spread_sheet_url = `${mocked_endpoint}/spreadsheets/${test_sheet_id}`;

describe("SpreadSheetService", () => {
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

    const assigned_songs: Song[] = [...Array(5)].map((_, i) => ({name: "", name_and_artist: `Song${i}/Artict${i}`, youtube_video_id: `video_id_${i}`}));

    const sheet_response: {spreadsheetId: string, sheets: Array<{data: Array<{rowData: Array<{values: Array<{formattedValue: string, hyperlink: string}>}>}>}>} = {
        spreadsheetId: "test_id",
        sheets: [{
        data: [{
            rowData: assigned_songs.map((song) => ({
                values: [{formattedValue: song.name_and_artist, hyperlink: `https://www.youtube.com/watch?v=${song.youtube_video_id}`}]
            })),
        }]
    }]};

    const mocked_access_token_response = generateMock(GoogleAuthTokenResponseSchema);

    const mocked_access_token = mocked_access_token_response.access_token;

    let service: SpreadSheetService;

    const getMock = jest.fn().mockResolvedValue(sheet_response);
    const postMock = jest.fn().mockResolvedValue(mocked_access_token_response);

    describe("getAssignedSongs", () => {
        const get_options = {
            "headers": {
                Authorization: 'Bearer ' + mocked_access_token,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            muteHttpExceptions: true,
        }
        beforeEach(() => {
            service = generateSpreadSheetService(assigned_song_range, generateHttpClientMock(getMock, postMock, jest.fn(), jest.fn()));
        });

        test("returns song objects of cells.", async () => {
            const get_sheet_url_and_query = `${spread_sheet_url}?ranges=${assigned_song_range_query}&includeGridData=true`

            await service.init();
            const result = await service.getAssignedSongs();

            expect(getMock).toHaveBeenCalledWith(get_sheet_url_and_query, get_options);
            expect(result).toStrictEqual(assigned_songs);
        });

        test("return YouTube video id in song no matter YouTube URL.", async () => {
            const verious_link_response = {
                spreadsheetId: "test_id",
                sheets: [{
                    data: [{
                        rowData: [
                            {
                                values: [{
                                    formattedValue: assigned_songs[0].name_and_artist,
                                    // https://www.youtube.com/watch?v=${video_id} 
                                    hyperlink: `https://www.youtube.com/watch?v=${assigned_songs[0].youtube_video_id}`}]
                            },
                            {
                                values: [{
                                    formattedValue: assigned_songs[1].name_and_artist,
                                    // https://www.youtube.com/watch?v=${video_id}&t=59s
                                    hyperlink: `https://www.youtube.com/watch?v=${assigned_songs[1].youtube_video_id}&t=59s`}]
                            },
                            {
                                values: [{
                                    formattedValue: assigned_songs[2].name_and_artist,
                                    // https://m.youtube.com/watch?v=${video_id}&t=59s
                                    hyperlink: `https://m.youtube.com/watch?v=${assigned_songs[2].youtube_video_id}&t=59s`}]
                            },
                            {
                                values: [{
                                    formattedValue: assigned_songs[3].name_and_artist,
                                    // https://youtu.be/${video_id}
                                    hyperlink: `https://youtu.be/${assigned_songs[3].youtube_video_id}`}]
                            },
                            {
                                values: [{
                                    formattedValue: assigned_songs[4].name_and_artist,
                                    // https://youtu.be/${video_id}?t=59s 
                                    hyperlink: `https://youtu.be/${assigned_songs[4].youtube_video_id}?=59s`}]
                            },
                        ],
                    }],
                }],
            };
            getMock.mockResolvedValue(verious_link_response);

            await service.init();
            const result = await service.getAssignedSongs();

            expect(result).toStrictEqual(assigned_songs);
        });
    });
});

function generateSpreadSheetService(assigned_song_range: string, http: HttpClient): SpreadSheetService {
    const preservice = new SpreadSheetService(test_sheet_id, new OAuth2ApiClient(http));
    return Object.defineProperties(preservice, {
        endpoint: {value: mocked_endpoint},
        token_endpoint: {value: mocked_token_endpoint},
        spread_sheet_url: {value: spread_sheet_url},
        assigned_song_range: {value: assigned_song_range},
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
