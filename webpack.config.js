import path from 'path';
import { fileURLToPath } from 'url';
import TerserPlugin from 'terser-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUILD_ROOT = path.join(__dirname, './src/public/javascripts');
const SRC_ROOT = path.join(__dirname, './src/client');

const config = {
    context: SRC_ROOT,
    entry: {
        counter: path.resolve(SRC_ROOT, './api/counter.js'),
    },
    output: {
        filename: '[name].bundle.js',
        path: BUILD_ROOT,
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
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
    optimization: {
        minimizer: [new TerserPlugin({
            extractComments: false,
        })],
      },
    mode: 'production',
}

export default config;
