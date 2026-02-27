import * as http from "http";
import { exec } from "child_process";
import { getEnvVar } from "@/env";

function getCachedTokens(): {
    access_token: string;
    refresh_token: string | undefined;
} | null {
    try {
        const access_token = getEnvVar("GOOGLE_ACCESS_TOKEN");
        let refresh_token: string | undefined;
        try {
            refresh_token = getEnvVar("GOOGLE_REFRESH_TOKEN");
        } catch {
            refresh_token = undefined;
        }
        return { access_token, refresh_token };
    } catch {
        return null;
    }
}

const SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "https://www.googleapis.com/auth/youtube.force-ssl",
];
const CALLBACK_PORT = 3000;
const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}/callback`;
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

export async function initGoogleTokens(): Promise<{
    access_token: string;
    refresh_token: string | undefined;
}> {
    // キャッシュ済みトークンがあれば再利用
    const cached = getCachedTokens();
    if (cached) return cached;

    // 初回: ローカル HTTP サーバー経由でブラウザ認証
    const client_id = getEnvVar("GOOGLE_CLIENT_ID");
    const client_secret = getEnvVar("GOOGLE_CLIENT_SECRET");

    const auth_url = buildAuthUrl(client_id);
    const code = await waitForAuthCode(auth_url);
    return exchangeCodeForTokens(code, client_id, client_secret);
}

function buildAuthUrl(client_id: string): string {
    const scope = encodeURIComponent(SCOPES.join(" "));
    return (
        `https://accounts.google.com/o/oauth2/v2/auth?scope=${scope}` +
        `&prompt=consent&include_granted_scopes=true` +
        `&response_type=code&access_type=offline` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&client_id=${client_id}`
    );
}

function waitForAuthCode(auth_url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            if (!req.url) return;
            const url = new URL(req.url, `http://localhost:${CALLBACK_PORT}`);
            const code = url.searchParams.get("code");
            const error = url.searchParams.get("error");
            if (code) {
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end("<h1>Authorization successful! You can close this window.</h1>");
                server.close();
                resolve(code);
            } else {
                res.writeHead(400, { "Content-Type": "text/html" });
                res.end(`<h1>Authorization failed: ${error ?? "unknown"}</h1>`);
                server.close();
                reject(new Error(`Authorization failed: ${error ?? "unknown"}`));
            }
        });

        server.listen(CALLBACK_PORT, () => {
            console.log("Opening browser for Google OAuth authorization...");
            openBrowser(auth_url);
        });

        server.on("error", reject);
    });
}

async function exchangeCodeForTokens(
    code: string,
    client_id: string,
    client_secret: string,
): Promise<{ access_token: string; refresh_token: string | undefined }> {
    const params = new URLSearchParams({
        code,
        client_id,
        client_secret,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
    });

    const response = await fetch(TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
    });
    const data = (await response.json()) as {
        access_token: string;
        refresh_token?: string;
    };
    return { access_token: data.access_token, refresh_token: data.refresh_token };
}

function openBrowser(url: string): void {
    const platform = process.platform;
    const command =
        platform === "win32"
            ? `start "" "${url}"`
            : platform === "darwin"
              ? `open "${url}"`
              : `xdg-open "${url}"`;
    exec(command, (err) => {
        if (err) console.log(`Please open this URL in your browser:\n${url}`);
    });
}
