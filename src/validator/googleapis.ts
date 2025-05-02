import { z } from "zod";

// ********************************
// Auth
// ********************************

// Returned response: POST https://accounts.google.com/o/oauth2/v2/auth
export const GoogleAuthTokenResponseSchema = z.object({
    access_token: z.string(),
    token_type: z.literal("Bearer"),
    expires_in: z.number(),
    scope: z.string().optional(),
    refresh_token: z.string().optional(),
});

// ********************************
// YouTube
// ********************************

/**
 * YouTube playlist item resource used response.
 */
export const YouTubePlaylistItemResourceSchema = z
    .object({
        kind: z.string(),
        etag: z.string(),
        id: z.string(),
    })
    .passthrough();

// Returned response: GET https://www.googleapis.com/youtube/v3/playlistItems
export const YouTubePlaylistItemsResponseSchema = z.object({
    kind: z.string(),
    etag: z.string(),
    nextPageToken: z.string().nullish(),
    prevPageToken: z.string().nullish(),
    pageInfo: z.object({
        totalResults: z.number(),
        resultsPerPage: z.number(),
    }),
    items: z.array(YouTubePlaylistItemResourceSchema),
});

// ********************************
// SpreadSheet
// ********************************

/**
 * SpreadSheet cell value used response.
 */
const CellValueSchema = z
    .object({
        formattedValue: z.string().nullish(),
        hyperlink: z.string().nullish(),
    })
    .passthrough();

/**
 * SpreadSheet cell value used response.
 */
export const rowDataSchema = z
    .object({
        values: z.array(CellValueSchema).optional(),
    })
    .passthrough();

/**
 * SpreadSheet sheet value used response.
 */
export const SheetValueSchema = z
    .object({
        data: z.array(
            z
                .object({
                    rowData: z.array(rowDataSchema),
                })
                .passthrough(),
        ),
    })
    .passthrough();

/**
 * SpreadSheet sheet response: POST https://sheets.googleapis.com/v4/spreadsheets/${sheet_id}/?query
 */
export const SheetResponseSchema = z.object({
    spreadsheetId: z.string(),
    sheets: z.array(SheetValueSchema),
});
