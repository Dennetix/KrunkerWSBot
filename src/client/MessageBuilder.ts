import { Account } from '../models/AccountModel';
import { Match } from './Match';

export class MessageBuilder {

    private constructor() { }

    public static pong(): ['po'] {
        return ['po'];
    }

    public static load(): ['load', ...any] {
        return ['load', null];
    }

    public static login(account: Account): ['a', ...any] {
        return ['a', 1, [account.username, null, account.token], null];
    }

    public static enter(chararcterClass: number): ['en', ...any] {
        return ['en', [chararcterClass, 2482, [-1, -1], -1, -1, 2, 0, 1, 1, -1, -1, 1, 0, -1, -1, -1, 0, -1, -1, -1, 0, -1], 16, 18];
    }

    public static tick(tick: number, angle?: number | undefined, input?: { [key: string]: number } | undefined): ['q', ...any] {
        return ['q', tick, angle !== undefined ? [0, Math.round(angle * -1000)] : 0, input !== undefined ? input : 0, '3500', 2];
    }

    public static voteMatch(match: Match): ['maVote', ...any] {
        return ['maVote', match.text];
    }

}
