import axios from 'axios';
import { Grid } from 'pathfinding';
import { Bot } from '../Bot';
import { Client } from '../client/Client';
import { Map, Match, Mode } from '../client/Match';
import { Lobby, LobbyManager } from '../managers/LobbyManager';
import maps from '../maps.json';
import * as crypto from 'crypto';

export interface MapData {
    offset: {
        x: number,
        z: number
    };
    points: { x: number, y: number }[];
    matrix: number[][];
}

export abstract class Instance {

    protected isReady = false;
    protected isStopped = false;

    private _id: string;

    private _lobby: Lobby | undefined;
    protected clients: Client[] = [];

    protected _map: MapData | undefined;
    protected _grid: Grid | undefined;

    protected _time: number | undefined;

    constructor(protected bot: Bot, private _name: string, private _gameId: string, private _maxClients: number, maps?: Map[], modes?: Mode[]) {
        this._maxClients = Math.min(Math.max(this._maxClients, 1), 4);

        this._id = crypto.createHash('md5').update(this._name + crypto.randomBytes(4).toString('hex')).digest('hex').substr(0, 8);

        if (this._gameId === '') {
            LobbyManager.findLobby(maps, modes)
                .then((lobby) => {
                    console.log(`Instance '${this._name}' connecting to lobby ${lobby.id}`);
                    this._lobby = lobby;
                    this.begin();
                })
                .catch((e) => {
                    console.error('Error while searching for a lobby: ', e);
                    this.stop();
                });
        } else {
            axios.get<[string, string, number, number, { v: string }]>(
                'https://matchmaker.krunker.io/game-info',
                { params: { game: _gameId } }
            )
                .then((res) => {
                    console.log(`Instance '${this._id}' connecting to lobby ${res.data[0]}`);
                    this._lobby = new Lobby(res.data[0], res.data[1], res.data[4].v);
                    this.begin();
                })
                .catch((e) => {
                    console.error('Error while joining lobby: ', e);
                    this.stop();
                });
        }
    }

    public stop(): void {
        if (!this.isStopped) {
            this.isReady = false;
            this.isStopped = true;

            this.clients.forEach(c => c.disconnect());
            this.lobby?.release();

            this.bot.onInstnaceEnd(this);
        }
    }

    public get ready(): boolean {
        return this.isReady;
    }

    public get lobby(): Lobby | undefined {
        return this._lobby;
    }

    public get id(): string {
        return this._id;
    }

    public get name(): string {
        return this._name;
    }

    public get gameId(): string {
        return this._gameId;
    }

    public get maxClients(): number {
        return this._maxClients;
    }

    public get map(): MapData | undefined {
        return this._map;
    }

    public get grid(): Grid | undefined {
        return this._grid?.clone();
    }

    public get time(): number | undefined {
        return this._time;
    }

    public onTime(time: string, endscreen: boolean): void {
        if (endscreen) {
            this._time = undefined;
            return;
        }

        const parts = time.split(':');
        this._time = parseInt(parts[0], 10) + (parseInt(parts[1], 10) / 60);
    }

    protected loadMap(): Promise<void> {
        return axios.get<[string, string, number, number, { i: string }]>(
            'https://matchmaker.krunker.io/game-info',
            { params: { game: this._lobby?.id } }
        )
            .then((res) => {
                switch (res.data[4].i.toLowerCase()) {
                case 'littletown':
                    this._map = maps.littletown;
                    break;
                case 'sandstorm':
                    this._map = maps.sandstorm;
                    break;
                case 'industry':
                    this._map = maps.industry;
                    break;
                default:
                    console.error(`No map data for map ${res.data[4].i}`);
                    return this.stop();
                }
                this._grid = new Grid(this._map.matrix);
            })
            .catch((e) => {
                console.error('Error while querying game info: ', e);
                this.stop();
            });
    }

    protected reset(): void {
        this.isReady = false;
        this._map = undefined;
        this._grid = undefined;
        this._time = undefined;
    }

    public abstract onGameStarted(): void;
    public abstract onGameEnded(matches: Match[]): void;
    public abstract onClientSpawned(client: Client, x: number, z: number): void;
    public abstract onClientDied(client: Client): void;
    public abstract onClientDisconnect(client: Client): void;

    protected abstract begin(): void;
    protected abstract end(): void;

}
