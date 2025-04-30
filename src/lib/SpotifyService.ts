import { PlaylistManager } from '../interface/PlaylistManager';
import { HttpClient } from '../interface/HttpClient';
import { getEnvVar, saveEnvVariable, saveEnvVariables } from '@/env';
import { GasHttpClient } from './http/HttpClient.remote';
import { SpotifyAuthTokenResponseSchema } from '../validator/spotify';
import { AsyncResult } from '../type/result';
import { Song, UnfoundSongs } from '#/type/song';

export class SpotifyService implements PlaylistManager {
    private readonly token_endpoint = 'https://accounts.spotify.com/api/token';
    private readonly client_id = getEnvVar('SPOTIFY_CLIENT_ID');
    private readonly client_secret = getEnvVar('SPOTIFY_CLIENT_SECRET');
    private readonly redirect_uri = getEnvVar('SPOTIFY_REDIRECT_URI');
    private readonly authorization_code = getEnvVar('SPOTIFY_AUTHORIZATION_CODE');
    private readonly basic_authorization: string;
    private access_token: string | undefined;
    private refresh_token: string | undefined;

    constructor(private readonly playlistId: string, private readonly http: HttpClient = new GasHttpClient()) {
        this.basic_authorization = http.btoa(this.client_id + ":" + this.client_secret);
    }

    /**
     * Initialize access token and refresh token.
     */
    public async init(): Promise<void> {
        try {
            this.access_token = getEnvVar('SPOTIFY_ACCESS_TOKEN');
            this.refresh_token = getEnvVar('SPOTIFY_REFRESH_TOKEN');
            if (!this.access_token.length)  throw new Error();
        } catch {
            const result = await this.getFirstAccessTokenAndRefreshToken();
            if (result.ok){
                this.access_token = result.value.access_token;
                this.refresh_token = result.value.refresh_token;
            } else {
                throw new Error(
                    `Failed get access token: ${result.error} \n\n
                    Access get authorization code \n
                    https://accounts.spotify.com/authorize?response_type=code&scope=playlist-modify-public%20user-read-private&redirect_uri=https://example.com/callback&client_id=${this.client_id}`
                );
            }

            if (this.refresh_token)
                saveEnvVariables({
                    "SPOTIFY_ACCESS_TOKEN": this.access_token ,
                    "SPOTIFY_REFRESH_TOKEN": this.refresh_token ,
                });
            else
                saveEnvVariable("SPOTIFY_ACCESS_TOKEN", this.access_token);
        }
    }

    refreshPlaylistWith(songs: Song[]): Promise<UnfoundSongs> {
        throw new Error('Method not implemented.');
    }

    private async getFirstAccessTokenAndRefreshToken()
    : AsyncResult<{access_token:string, refresh_token: string | undefined}> {
        const headers = {
            "Authorization": "Basic " + this.basic_authorization,
            'Content-Type':'application/x-www-form-urlencoded',
        }
        const payload = {
            "grant_type": "authorization_code",
            "code": this.authorization_code,
            "redirect_uri": this.redirect_uri
        };
        const options = {
            "payload": payload,
            "headers": headers,
            muteHttpExceptions: true,
        };
        try {        
            const response: unknown = await this.http.post(this.token_endpoint, options);
            try {
                const parsedResponse = SpotifyAuthTokenResponseSchema.parse(response);
                return {
                    ok: true,
                    value: {
                        access_token: parsedResponse.access_token,
                        refresh_token: parsedResponse.refresh_token,
                    }
                };
            } catch (err) {
                console.log("Failed validation:");
                throw err;
            }
        } catch (err) {
            console.error("Failed request:", err);
            return {ok: false, error:err};
        }
    }
}