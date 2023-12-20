const path = require('path');
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const config = {
    entry: {
        sdmxdashboard: './src/index.tsx',
    },
    devtool: (process.env.NODE_ENV === 'production') ? false : 'inline-source-map',
    mode: (process.env.NODE_ENV === 'production') ? 'production' : 'development',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].bundle.js',
        clean: true
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: "src/index.html", // to import index.html file inside index.js
        }),
        new MiniCssExtractPlugin()
    ],
    optimization: {
        splitChunks: {
            cacheGroups: {
                react: {
                    test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
                    name: 'vendor-react',
                    chunks: 'all',
                },
            }
        },
    },
    devtool: 'source-map',
    devServer: {
        port: 3030, // you can change the port
    },
    module: {
        rules: [
            {
                test: /\.tsx$/,
                exclude: /(node_modules)/,
                use: {
                    loader: 'ts-loader'
                }
            },
            {
                test: /\.css$/i,
                use: [MiniCssExtractPlugin.loader, "css-loader"],
            },
        ]
    },
    resolve:
    {
        extensions: ['.tsx', '.ts', '.js'],
    }
};

module.exports = config;
