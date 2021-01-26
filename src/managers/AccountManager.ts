import { Account, AccountModel } from '../models/AccountModel';

export class AccountManager {

    private static initialized = false;
    private static accounts: [Account, boolean][] = [];

    private constructor() { }

    public static async init(): Promise<void> {
        if (this.initialized) {
            return;
        }
        this.initialized = true;

        const accounts = await AccountModel.find();
        this.accounts = accounts.map(a => [a, false]);
    }

    public static findAccount(): Account {
        const accounts = this.accounts.filter(a => !a[1]);
        if (accounts.length === 0) {
            throw Error('No unused account available');
        }

        const account = accounts[Math.floor(Math.random() * accounts.length)];

        account[1] = true;
        return account[0];
    }

    public static releaseAccount(username: string): void {
        const account = this.accounts.find(a => a[0].username === username);
        if (!account) {
            throw Error(`Account ${username} not found`);
        }

        account[1] = false;
    }

    public static async updateToken(username: string, token: string): Promise<void> {
        const account = this.accounts.find(a => a[0].username === username);
        if (!account) {
            throw Error(`Account ${username} not found`);
        }
        account[0].token = token;
        await account[0].save();
    }

}
