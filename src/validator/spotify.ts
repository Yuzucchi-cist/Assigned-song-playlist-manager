import { z } from 'zod';

// ********************************
// Auth
// ********************************

// Returned response: POST https://accounts.spotify.com/api/token
export const SpotifyAuthTokenResponseSchema = z.object({
    access_token: z.string(),
    token_type: z.literal('Bearer'),
    expires_in: z.number(),
    scope: z.string().optional(),
    refresh_token: z.string().optional()
});