import nodeExternals from 'webpack-node-externals';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUILD_ROOT = path.join(__dirname, './src/public/javascripts');
const SRC_ROOT = path.join(__dirname, './src/client');

const config = {
    context: SRC_ROOT,
    entry: {
        counter: path.resolve(SRC_ROOT, 'counter.js'),
    },
    externals: [nodeExternals()],
    output: {
        filename: '[name].bundle.js',
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
    mode: 'production',
}

export default config;
