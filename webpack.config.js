const path = require('path');
const fs = require('fs');

let nodeModules = {};
fs.readdirSync('node_modules')
    .filter((x) => x !== '.bin')
    .forEach((module) => nodeModules[module] = 'commonjs2 ' + module);

const bot = () => {
    return {
        entry: {
            bot: './src/Bot'
        },
        output: {
            path: path.join(__dirname, './dist'),
            filename: '[name].bundle.js'
        },
        resolve: {
            extensions: ['.ts', '.js'],
            modules: ['./node_modules']
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: [
                        {
                            loader: 'ts-loader',
                            options: {
                                onlyCompileBundledFiles: true
                            }
                        }
                    ]
                }
            ]
        },
        target: 'electron-main',
        node: {
            __dirname: false
        },
        externals: nodeModules
    };
};

module.exports = [bot];
