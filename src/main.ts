import { App } from "./App";

interface Global {
    App: typeof App;
}
declare const global: Global;
global.App = App;
