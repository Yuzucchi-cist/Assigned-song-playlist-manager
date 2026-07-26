import { getEnvVar, saveEnvVariables } from "@/env";
import { SpotifyAuthTokenResponseSchema } from "#/validator/spotify.z";

const AUTHORIZE_ENDPOINT = "https://accounts.spotify.com/authorize";
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const SCOPE = "playlist-modify-public user-read-private";

/**
 * Spotify re-authorization handler for the GAS web app (doGet).
 *
 * Register the web app URL as a redirect URI of the Spotify app, then:
 * 1. Open the web app URL -> shows a link to the Spotify consent screen.
 * 2. Approve on Spotify -> redirected back here with `?code=...`.
 * 3. The code is exchanged for tokens, which are saved to Script Properties.
 */
export function handleSpotifyAuthRequest(
    e: GoogleAppsScript.Events.DoGet,
): GoogleAppsScript.HTML.HtmlOutput {
    const redirect_uri = ScriptApp.getService().getUrl();

    if (e?.parameter?.error)
        return htmlPage(
            "認可に失敗しました",
            `Spotify からエラーが返されました: ${e.parameter.error}`,
        );

    const code = e?.parameter?.code;
    if (!code) {
        const authorize_url =
            AUTHORIZE_ENDPOINT +
            `?response_type=code` +
            `&client_id=${encodeURIComponent(getEnvVar("SPOTIFY_CLIENT_ID"))}` +
            `&scope=${encodeURIComponent(SCOPE)}` +
            `&redirect_uri=${encodeURIComponent(redirect_uri)}`;
        return htmlPage(
            "Spotify 再認可",
            `<a href="${authorize_url}" target="_top">ここをクリックして Spotify の認可を行う</a>` +
                `<p>リダイレクト URI: <code>${redirect_uri}</code></p>` +
                `<p>この URI が Spotify アプリの Redirect URIs に登録されている必要があります。</p>`,
        );
    }

    const response = UrlFetchApp.fetch(TOKEN_ENDPOINT, {
        method: "post",
        headers: {
            Authorization:
                "Basic " +
                Utilities.base64Encode(
                    getEnvVar("SPOTIFY_CLIENT_ID") +
                        ":" +
                        getEnvVar("SPOTIFY_CLIENT_SECRET"),
                ),
        },
        payload: {
            grant_type: "authorization_code",
            code: code,
            redirect_uri: redirect_uri,
        },
        muteHttpExceptions: true,
    });

    if (response.getResponseCode() !== 200)
        return htmlPage(
            "トークン取得に失敗しました",
            `HTTP ${response.getResponseCode()}: <pre>${response.getContentText()}</pre>`,
        );

    const parsed = SpotifyAuthTokenResponseSchema.parse(
        JSON.parse(response.getContentText()),
    );
    const variables: { [key: string]: string } = {
        SPOTIFY_ACCESS_TOKEN: parsed.access_token,
        SPOTIFY_REDIRECT_URI: redirect_uri,
    };
    if (parsed.refresh_token)
        variables.SPOTIFY_REFRESH_TOKEN = parsed.refresh_token;
    saveEnvVariables(variables);

    return htmlPage(
        "再認可が完了しました",
        "アクセストークンとリフレッシュトークンを Script Properties に保存しました。このタブを閉じて、スクリプトを再実行してください。",
    );
}

function htmlPage(
    title: string,
    body: string,
): GoogleAppsScript.HTML.HtmlOutput {
    return HtmlService.createHtmlOutput(
        `<h1>${title}</h1><div>${body}</div>`,
    ).setTitle(title);
}
