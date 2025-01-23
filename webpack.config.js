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
        chart: path.resolve(SRC_ROOT, './chart.js'),
        skyway: path.resolve(SRC_ROOT, './skyway.js'),
        chat: path.resolve(SRC_ROOT, './chat.js'),
    },
    output: {
        filename: '[name].bundle.js',
        path: BUILD_ROOT,
        // libraryTarget: 'module',
    },
    // experiments: {
    //     outputModule: true,
    // },
    // devtool: 'source-map',
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
            terserOptions: {
                mangle: false,
                keep_classnames: true,
                keep_fnames: true,
            }
        })],
      },
    mode: 'production',
}

export default config;
