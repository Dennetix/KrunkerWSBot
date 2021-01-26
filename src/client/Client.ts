import { decode, encode } from 'msgpack-lite';
import { AStarFinder, DiagonalMovement, Util } from 'pathfinding';
import { performance } from 'perf_hooks';
import * as WebSocket from 'ws';
import config from '../config.json';
import { Instance } from '../instances/Instance';
import { AccountManager } from '../managers/AccountManager';
import { VersionManager } from '../managers/VersionManager';
import { Account } from '../models/AccountModel';
import { cellToPos, posToCell } from '../utils/ClientUtils';
import { when } from '../utils/Utils';
import { Match } from './Match';
import { MessageBuilder } from './MessageBuilder';
import { MessageParser } from './MessageParser';

export class Client {

    private socket: WebSocket;
    private isDisconnected = false;
    private isWaitingForToken = false;

    private _id = '';

    private msgIndexSequence: [number, number][];
    private msgIndexSequencePosition = 0;
    private msgIndex1 = 0;
    private msgIndex2 = 0;

    protected tickNumber = 0;
    protected lastTickTime = 0;

    private isReady = false;
    private inGame = false;

    private isWalking = false;
    private xPos = 0;
    private zPos = 0;
    private angle = 0;

    constructor(
        private instance: Instance,
        uri: string,
        private isMainClient: boolean,
        private account?: Account,
        private autoJoin: boolean = true,
        private charClass: number = 2
    ) {
        this.tick = this.tick.bind(this);

        this.msgIndexSequence = VersionManager.msgIndexSequence;

        this.socket = new WebSocket(uri, { headers: { Origin: 'https://krunker.io' } });
        this.socket.once('open', this.onOpen.bind(this));
        this.socket.once('close', this.onClose.bind(this));
        this.socket.on('error', this.onError.bind(this));
        this.socket.on('message', this.onMessage.bind(this));
    }

    public async findPathAndMove(cell: { x: number, y: number }): Promise<void> {
        if (!this.inGame) {
            return;
        }

        const closestCell = this.getClosestWalkableCell();
        await this.moveToCell(closestCell);

        const grid = this.instance.grid;
        if (!grid) {
            throw Error('No grid defined');
        }

        const currentCell = this.cell;

        const finder = new AStarFinder({ diagonalMovement: DiagonalMovement.OnlyWhenNoObstacles });
        const path = Util.compressPath(finder.findPath(currentCell.x, currentCell.y, cell.x, cell.y, grid));
        if (path.length === 0) {
            throw Error('No path found');
        }

        for (const cell of path) {
            await this.moveToCell({ x: cell[0], y: cell[1] });
        }
    }

    public getClosestWalkableCell(): { x: number, y: number } {
        const map = this.instance.map;
        if (!map) {
            throw Error('No map defined');
        }

        const cell = this.cell;
        if (map.matrix[cell.y][cell.x] === 0) {
            return cell;
        }

        const neighbours = [
            { x: cell.x > 0 ? cell.x - 1 : cell.x, y: cell.y },
            { x: cell.x < map.matrix[cell.y].length - 1 ? cell.x + 1 : cell.x, y: cell.y },
            { x: cell.x, y: cell.y > 0 ? cell.y - 1 : cell.y },
            { x: cell.x, y: cell.y < map.matrix.length - 1 ? cell.y + 1 : cell.y }
        ].filter(n => map.matrix[n.y][n.x] === 0);

        if (neighbours.length === 0) {
            console.log(cell);
            throw Error('No neighbouring cells are walkable');
        }

        const distances = neighbours.map(n => this.distanceTo(cellToPos(map, n)));

        return neighbours[distances.indexOf(Math.min(...distances))];
    }

    public async moveToCell(cell: { x: number, y: number }): Promise<void> {
        if (!this.inGame) {
            return;
        }

        const map = this.instance.map;
        if (!map) {
            throw Error('No map defined');
        }

        const cellCenter = cellToPos(map, cell);

        this.lookAt(cellCenter);
        this.walk(true);

        return new Promise((resolve) => {
            const update = (): void => {
                this.lookAt(cellCenter);

                if (this.distanceTo(cellCenter) < config.moveDistanceThreshold) {
                    this.walk(false);
                    resolve();
                    return;
                }
                setTimeout(update, 1000 / config.moveUpdateFrequency);
            };
            update();
        });
    }

    public walk(state: boolean): void {
        if (this.inGame) {
            this.send(MessageBuilder.tick(this.tickNumber++, undefined, { '0-4': state ? 1 : -1 }));
            this.isWalking = state;
        }
    }

    public shoot(state: boolean): void {
        if (this.inGame) {
            this.send(MessageBuilder.tick(this.tickNumber++, undefined, { '0-6': state ? 1 : 0 }));
            this.send(MessageBuilder.tick(this.tickNumber++, undefined, { '0-5': state ? 1 : 0 }));
        }
    }

    public lookAt(pos: { x: number, z: number }): void {
        this.setAngle(Math.atan2(pos.z - this.zPos, pos.x - this.xPos) + (Math.PI * 0.5));
    }

    public setAngle(angle: number): void {
        if (this.inGame) {
            this.send(MessageBuilder.tick(this.tickNumber++, angle));
            this.angle = angle;
        }
    }

    public enterGame(): void {
        if (!this.inGame) {
            this.send(MessageBuilder.enter(this.charClass));
        }
    }

    public voteMatch(match: Match): void {
        if (!this.inGame) {
            this.send(MessageBuilder.voteMatch(match));
        }
    }

    public distanceTo(pos: { x: number, z: number }): number {
        return Math.sqrt((this.xPos - pos.x) * (this.xPos - pos.x) + (this.zPos - pos.z) * (this.zPos - pos.z));
    }

    public disconnect(waitForToken: boolean = true): void {
        if (this.isDisconnected) {
            return;
        }
        this.isDisconnected = true;

        const close = (): void => {
            if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
                this.socket.close();
            }
        };

        if (waitForToken) {
            when(() => !this.isWaitingForToken, close);
        } else {
            close();
        }
    }

    public get name(): string | undefined {
        return this.account?.username;
    }

    public get mainClient(): boolean {
        return this.isMainClient;
    }

    public get id(): string {
        return this._id;
    }

    public get position(): { x: number, z: number } {
        return {
            x: this.xPos,
            z: this.zPos
        };
    }

    public get cell(): { x: number, y: number } {
        const map = this.instance.map;
        if (!map) {
            throw Error('No map defined');
        }
        return posToCell(map, { x: this.xPos, z: this.zPos });
    }

    private tick(): void {
        if (this.inGame) {
            setTimeout(this.tick, 1000 / config.socketTickFrequency);

            this.send(MessageBuilder.tick(this.tickNumber));
            this.tickNumber++;

            const time = performance.now();
            const delta = time - this.lastTickTime;
            this.lastTickTime = time;

            if (this.isWalking) {
                const dist = delta * 0.045;
                this.xPos += dist * Math.sin(this.angle);
                this.zPos += dist * -Math.cos(this.angle);
            }
        }
    }

    /*
        The client must include two extra bytes at the end of every MessagePack encoded message. The first 4 bits are always 0,
        the last 4 bits count up in version specific sequences.
    */
    private send(data: any): void {
        if (this.isDisconnected) {
            return;
        }

        this.msgIndex1 += this.msgIndexSequence[this.msgIndexSequencePosition][0];
        if (this.msgIndex1 >= 16) {
            this.msgIndex1 -= 16;
        }

        this.msgIndex2 += this.msgIndexSequence[this.msgIndexSequencePosition][1];
        if (this.msgIndex2 >= 16) {
            this.msgIndex2 -= 16;
        }

        this.msgIndexSequencePosition++;
        if (this.msgIndexSequencePosition >= 16) {
            this.msgIndexSequencePosition = 0;
        }

        this.socket.send(Buffer.concat([encode(data), new Uint8Array([this.msgIndex1, this.msgIndex2])]));
    }

    private onOpen(): void {
        console.log(`Client '${this.account?.username || 'Guest'}' connected`);
    }

    private onClose(): void {
        console.log(`Client '${this.account?.username || 'Guest'}' disconnected`);
        this.instance.onClientDisconnect(this);
    }

    private onError(error: any): void {
        console.error(`Error in Client '${this.account?.username || 'Guest'}': `, error);
    }

    private onMessage(data: Buffer): void {
        const msg = decode(data) as [string, ...any];

        try {
            switch (msg[0]) {
            case 'pi':
                this.send(MessageBuilder.pong());
                break;
            case 'load':
                this.send(MessageBuilder.load());
                break;
            case 'io-init':
                this._id = MessageParser.ioInit(msg);
                break;
            case 'init':
                this.handleInit();
                break;
            case 't': {
                const time = MessageParser.time(msg);
                if (!this.isDisconnected) {
                    this.instance.onTime(time.time, time.endscreen);
                }
                break;
            }
            case 'ready':
                this.handleReady();
                break;
            case 'a': {
                const account = MessageParser.login(msg);
                this.handleLogin(account.username, account.token);
                break;
            }
            case '0': {
                if (!this.inGame) {
                    this.handleSpawn(MessageParser.initialPosition(msg, this._id));
                }
                break;
            }
            case 'l': {
                const position = MessageParser.positionUpdate(msg);
                if (this.inGame && position.isDead) {
                    this.handleDeath();
                } else if (!position.isDead) {
                    this.handlePositionUpdate(position.x!, position.z!, position.angle!);
                }
                break;
            }
            case 'end':
                this.handleGameEnd(MessageParser.end(msg));
                break;
            case 'error':
                this.onError(MessageParser.error(msg));
                break;
            }
        } catch (e) {
            this.onError(e);
            this.disconnect(false);
        }
    }

    private handleInit(): void {
        if (this.isReady && this.autoJoin) {
            when(() => this.instance.ready, this.enterGame.bind(this));
        }

        if (this.isMainClient && !this.isDisconnected) {
            this.instance.onGameStarted();
        }
    }

    private handleReady(): void {
        if (this.account) {
            this.send(MessageBuilder.login(this.account));
            this.isWaitingForToken = true;
        } else {
            this.isReady = true;
            if (this.autoJoin) {
                when(() => this.instance.ready, this.enterGame.bind(this));
            }
        }
    }

    private handleLogin(username: string, token: string): void {
        AccountManager.updateToken(username, token)
            .catch(console.error);

        this.isReady = true;
        this.isWaitingForToken = false;
        if (this.autoJoin) {
            when(() => this.instance.ready, this.enterGame.bind(this));
        }
    }

    private handleSpawn(pos: { x: number, z: number }): void {
        this.inGame = true;
        this.isWalking = false;
        this.xPos = pos.x;
        this.zPos = pos.z;

        this.tickNumber = 1;
        this.send(MessageBuilder.tick(0, 0, { '0-4': -1, '0-5': 0, '0-6': 0, '0-7': 0, '0-8': 0, '0-9': 0, '0-10': 0, '0-11': 0, '0-12': 0, '0-13': 0 }));
        this.tick();

        if (!this.isDisconnected) {
            this.instance.onClientSpawned(this, pos.x, pos.z);
        }
    }

    private handleDeath(): void {
        this.inGame = false;
        if (this.autoJoin) {
            setTimeout(() => {
                this.send(MessageBuilder.enter(this.charClass));
            }, 3000);
        }

        if (!this.isDisconnected) {
            this.instance.onClientDied(this);
        }
    }

    private handlePositionUpdate(x: number, z: number, angle: number): void {
        this.xPos = x;
        this.zPos = z;
        this.angle = angle;
    }

    private handleGameEnd(matches: Match[]): void {
        this.inGame = false;

        if (this.isMainClient && !this.isDisconnected) {
            this.instance.onGameEnded(matches);
        }
    }

}
