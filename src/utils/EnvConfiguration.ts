import * as dotenv from 'dotenv';

dotenv.config();

const missing: string[] = [];
if (process.env.DB_URI === undefined) {
    missing.push('DB_URI');
}

if (missing.length > 0) {
    console.error(`${missing.join(', ')} not set`);
    process.exit(1);
}

export const envConfig = {
    webServerPort: process.env.PORT || 3000,
    dbUri: process.env.DB_URI!
};
