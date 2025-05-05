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

    const sheet_response_base: {spreadsheetId: string, sheets: Array<{data: Array<{rowData: Array<{values: Array<{formattedValue: string, hyperlink: string}>}>}>}>} = {
        spreadsheetId: "test_id",
        sheets: [{
        data: [{
            rowData: [
                {values: [{formattedValue: "Song0/Artist0", hyperlink: "https://www.youtube.com/watch?v=video_id_0"}]},
                {values: [{formattedValue: "Song1/Artist1", hyperlink: "https://www.youtube.com/watch?v=video_id_1"}]},
                {values: [{formattedValue: "Song2/Artist2", hyperlink: "https://youtu.be/testVideoId?si=s3YiFGS9nunWdRlW"}]},
                {values: [{formattedValue: "Song3/Artist3", hyperlink: "https://www.youtube.com/watch?v=video_id_3"}]},
            ],
        }]
    }]};

    const mocked_access_token_response = generateMock(GoogleAuthTokenResponseSchema);

    const sheet_response = { ...sheet_response_base };
    sheet_response.sheets[0].data[0].rowData.map((row, index) => {
        row.values![0].hyperlink = `https://www.youtube.com/watch?v=video_id_${index}`;
        return row;
    });
    const assigned_songs: Song[] = sheet_response.sheets[0].data[0].rowData.map(
        (row) => {
            if (!row.values![0].hyperlink) {
                return {name: "", name_and_artist: row.values![0].formattedValue!, youtube_video_id: ""};
            } else {
                const matched_youtube_video_id = /https:\/\/www\.youtube\.com\/watch\?v=(.+)/.exec(row.values![0].hyperlink);
                const matched_short_youtube_video_id = /https:\/\/youtu.be\/([^?]+)/.exec(row.values![0].hyperlink);
                const youtube_video_id = matched_youtube_video_id
                                            ? matched_youtube_video_id[1]
                                            : matched_short_youtube_video_id
                                                ? matched_short_youtube_video_id[1]
                                                : "";
                return {name: "", name_and_artist: row.values![0].formattedValue!, youtube_video_id: youtube_video_id};
            }
        }
    );
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