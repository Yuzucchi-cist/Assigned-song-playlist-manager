/**
 * Response error of Spotify API response code of 401.
 */
export class InvalidAccessTokenError extends Error {
    constructor() {
        const message = "Access token is maybe expired."
        super(message)
        this.name = "Invalid access token error"
    }
}