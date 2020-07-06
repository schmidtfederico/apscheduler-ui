const HtmlWebpackPlugin = require('html-webpack-plugin')

const path = require('path');
let webpack = require('webpack');

module.exports = {
    mode: 'development',
    entry: './src/app.js',
    output: {
        path: path.resolve(__dirname, '../apschedulerui/static'),
        publicPath: '/static/',
        filename: 'app.bundle.js'
    },
    module: {
        rules: [
            {
                test: /\.less$/,
                use: [
                    'style-loader',
                    'css-loader',
                    'less-loader'
                ]
            }
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            title: 'Apscheduler UI',
            template: 'src/index.html'
        }),
        new webpack.ProvidePlugin({
           $: "jquery",
           jQuery: "jquery"
       })
    ]
};