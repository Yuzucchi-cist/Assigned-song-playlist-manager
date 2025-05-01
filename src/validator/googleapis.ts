import { z } from 'zod';

// ********************************
// Auth
// ********************************

// Returned response: POST https://accounts.google.com/o/oauth2/v2/auth
export const GoogleAuthTokenResponseSchema = z.object({
    access_token: z.string(),
    token_type: z.literal('Bearer'),
    expires_in: z.number(),
    scope: z.string().optional(),
    refresh_token: z.string().optional()
});
