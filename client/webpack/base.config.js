const nodeExternals = require('webpack-node-externals');
const path = require('path');

const BUILD_ROOT = path.join(__dirname, '../../app/src/public/javascripts');
const SRC_ROOT = path.join(__dirname, '../src');

module.exports = {
    context: SRC_ROOT,
    entry: path.resolve(SRC_ROOT, 'index.ts'),
    externals: [nodeExternals()],
    output: {
        filename: 'client.js',
        path: BUILD_ROOT,
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                loader: 'ts-loader',
                options: {
                    configFile: 'tsconfig.json'
                }
            }
        ]
    },
    resolve: {
        extensions: [ '.ts', '.js', '.json' ],
        alias: {
            '@': SRC_ROOT
        }
    },
}