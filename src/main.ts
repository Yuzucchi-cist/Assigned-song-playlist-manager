import { App } from "./App";
import { handleSpotifyAuthRequest } from "./util/auth/spotifyAuth";

interface Global {
    App: typeof App;
    doGet: typeof handleSpotifyAuthRequest;
}
declare const global: Global;
global.App = App;
global.doGet = handleSpotifyAuthRequest;
