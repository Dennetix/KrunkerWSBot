import axios from 'axios';
import { app, BrowserWindow, session } from 'electron';
import { URL } from 'url';
import { Map, Mode } from '../client/Match';
import config from '../config.json';

export class Lobby {

    constructor(private gameId: string, private region: string, private version: string) { }

    public async generateSocketURI(): Promise<string> {
        const token = await LobbyManager.getValidationToken();

        // TODO add proxy to request
        const gameInfo = (await axios.get<{ host: string, clientId: string, port: number }>(
            'https://matchmaker.krunker.io/seek-game',
            {
                headers: { Origin: 'https://krunker.io' },
                params: {
                    hostname: 'krunker.io',
                    autoChangeGame: false,
                    region: this.region,
                    game: this.gameId,
                    dataQuery: { v: this.version },
                    validationToken: token
                }
            }
        )).data;

        return `${gameInfo.port === 80 ? 'ws' : 'wss'}://${gameInfo.host}/ws?gameId=${this.gameId}&clientKey=${gameInfo.clientId}`;
    }

    public generateSocketURIs(n: number): Promise<string[]> {
        const p: Promise<string>[] = [];
        for (let i = 0; i < n; i++) {
            p.push(this.generateSocketURI());
        }
        return Promise.all(p);
    }

    public release(): void {
        LobbyManager.releaseLobby(this);
    }

    public get id(): string {
        return this.gameId;
    }

}

export class LobbyManager {

    private static initialized = false;
    private static tokenListeners: [BrowserWindow, (token?: string) => void][] = [];

    private static lobbiesInUse: Lobby[] = [];

    private constructor() { }

    private static init(): void {
        if (this.initialized) {
            return;
        }
        this.initialized = true;

        session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
            const webContentIds = this.tokenListeners.map(l => l[0].webContents.id);
            if (details.webContentsId && webContentIds.includes(details.webContentsId)) {
                const url = new URL(details.url);
                if (url.pathname === '/seek-game') {
                    callback({ cancel: true });

                    const listener = this.tokenListeners.find(l => l[0].webContents.id === details.webContentsId)![1];
                    const token = url.searchParams.get('validationToken');
                    if (token) {
                        listener(token);
                    } else {
                        listener();
                    }

                    return;
                }

                if (
                    details.url.includes('.png') ||
                    details.url.includes('.css') ||
                    details.url.includes('.obj') ||
                    details.url.includes('twitter') ||
                    details.url.includes('paypal') ||
                    details.url.includes('unpkg')
                ) {
                    callback({ cancel: true });
                    return;
                }
            }

            callback({ });
        });
    }

    public static async findLobby(maps?: Map[], modes?: Mode[]): Promise<Lobby> {
        if (!this.initialized) {
            this.init();
        }

        let games = (await axios.get<{ games: [string, string, number, number, { g: number, c: number, v: string, i: string }][] }>(
            'https://matchmaker.krunker.io/game-list',
            { params: { hostname: 'krunker.io' } }
        )).data.games.filter(g => (
            !this.lobbiesInUse.map(l => l.id).includes(g[0]) && // game not already used
            g[4].c === 0 && // not a custom game
            g[2] === 0 && // 0 players
            (maps && maps.length > 0 ? maps.some(m => m.name === g[4].i.toLowerCase()) : true) &&// map is one of maps or any map if maps is not defined
            (modes && modes.length > 0 ? modes.some(m => m.id === g[4].g) : true) // mode is one of modes or any mode if modes is not defined
        ));

        if (games.length === 0) {
            throw Error('No game found');
        }

        const preferredGames = games.filter(g => g[1] === config.preferredLobbyRegion.toLowerCase());
        if (preferredGames.length > 0) {
            games = preferredGames;
        }

        const game = games[Math.floor(Math.random() * games.length)];

        const lobby = new Lobby(game[0], game[1], game[4].v);
        this.lobbiesInUse.push(lobby);
        return lobby;
    }

    public static async getValidationToken(): Promise<string> {
        if (!this.initialized) {
            this.init();
        }

        await app.whenReady();

        const window = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true } });
        window.webContents.setUserAgent(window.webContents.userAgent.replace(/Electron.*/, ''));

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                window.close();
                this.tokenListeners.splice(this.tokenListeners.findIndex(l => l[0] === window)!, 1);
                reject('Timeout');
            }, 60000);

            const callback = (token: string | undefined): void => {
                clearTimeout(timeout);
                window.close();
                this.tokenListeners.splice(this.tokenListeners.findIndex(l => l[0] === window)!, 1);

                if (token) {
                    resolve(token);
                } else {
                    reject('Request did not include token');
                }
            };

            this.tokenListeners.push([window, callback]);

            window.loadURL('https://krunker.io')
                .catch(reject);
        });
    }

    public static releaseLobby(lobby: Lobby): void {
        if (this.lobbiesInUse.includes(lobby)) {
            this.lobbiesInUse.splice(this.lobbiesInUse.indexOf(lobby), 1);
        }
    }

}
