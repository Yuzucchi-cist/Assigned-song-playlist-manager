export async function initGoogleTokens(): Promise<{
    access_token: string;
    refresh_token: undefined;
}> {
    return { access_token: ScriptApp.getOAuthToken(), refresh_token: undefined };
}
