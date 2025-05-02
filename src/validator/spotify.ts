import { z } from "zod";

// ********************************
// Auth
// ********************************

// Returned response: POST https://accounts.spotify.com/api/token
export const SpotifyAuthTokenResponseSchema = z.object({
    access_token: z.string(),
    token_type: z.literal("Bearer"),
    expires_in: z.number(),
    scope: z.string().optional(),
    refresh_token: z.string().optional(),
});

// ********************************
// Search
// ********************************

/**
 * Returned response: GET https://api.spotify.com/v1/search
 */
export const SpotifySearchItemResponseSchema = z.object({
    href: z.string(),
    limit: z.number(),
    next: z.string(),
    offset: z.number(),
    previous: z.string(),
    total: z.number(),
});

// ********************************
// Get Playlist Items
// ********************************

/**
 * Spotify API response of Track
 */
export const SpotifyTrackSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        artists: z.array(
            z
                .object({
                    name: z.string(),
                })
                .passthrough(), // nameだけ検証、他は無視
        ),
    })
    .passthrough(); // id, name, artistsだけ検証、他のフィールドは無視

/**
 * Spotify API response of Playlist Items
 */
export const SpotifyPlaylistTracksSchema = z.object({
    items: z.array(z.object({ track: SpotifyTrackSchema })),
});

/**
 * Returned response: GET https://api.spotify.com/v1/playlists/{playlist_id}/tracks
 */
export const SpotifyTracksResponseSchema = z.object({
    tracks: z.object({
        items: z.array(SpotifyTrackSchema),
        limit: z.number(),
        offset: z.number(),
        total: z.number(),
        href: z.string(),
        next: z.string().nullable(),
        previous: z.string().nullable(),
    }),
});
