import * as mongoose from 'mongoose';

export interface Account extends mongoose.Document {
    username: string;
    token: string;
}

export const AccountSchema = new mongoose.Schema<Account>({
    username: {
        type: String,
        required: true,
        index: {
            unique: true,
            collation: { locale: 'en', strength: 2 }
        }
    },
    token: {
        type: String,
        required: true
    }
});

export const AccountModel = mongoose.model<Account>('account', AccountSchema);
