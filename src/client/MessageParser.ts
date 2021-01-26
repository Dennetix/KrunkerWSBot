/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
import { Match, toMatch } from './Match';

export class MessageParser {

    private constructor() { }

    public static ioInit(msg: [string, ...any]): string {
        if (msg[0] !== 'io-init') {
            throw Error('Wrong message type');
        }

        return msg[1];
    }

    public static time(msg: [string, ...any]): { time: string, endscreen: boolean } {
        if (msg[0] !== 't') {
            throw Error('Wrong message type');
        }

        return {
            time: msg[1],
            endscreen: msg.length > 2
        };
    }

    public static login(msg: [string, ...any]): { username: string, token: string } {
        if (msg[0] !== 'a') {
            throw Error('Wrong message type');
        }
        if (msg.length !== 6) {
            throw Error('Invalid account token');
        }

        return {
            username: msg[3],
            token: msg[5]
        };
    }

    public static initialPosition(msg: [string, ...any], id: string): { x: number, z: number } {
        if (msg[0] !== '0') {
            throw Error('Wrong message type');
        }

        let position: any[] = msg[1];
        position = position.slice(position.findIndex(msg => msg === id));
        return {
            x: position[2],
            z: position[4]
        };
    }

    public static positionUpdate(msg: [string, ...any]): { isDead: boolean, x?: number, z?: number, angle?: number } {
        if (msg[0] !== 'l') {
            throw Error('Wrong message type');
        }

        if (msg[1] === 0) {
            return { isDead: true };
        }

        return {
            isDead: false,
            x: msg[1][2],
            z: msg[1][4],
            angle: -msg[1][8]
        };
    }

    public static end(msg: [string, ...any]): Match[] {
        if (msg[0] !== 'end') {
            throw Error('Wrong message type');
        }

        const matches: string[] = msg[3].mts;
        return matches.map(m => toMatch(m));
    }

    public static error(msg: [string, ...any]): string {
        if (msg[0] !== 'error') {
            throw Error('Wrong message type');
        }

        msg.shift();
        return msg.join(' ');
    }

}
