const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const Dotenv = require('dotenv-webpack');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { SubresourceIntegrityPlugin } = require('webpack-subresource-integrity');

module.exports = {
mode: 'production',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.[contenthash].js',
    publicPath: '/',
    crossOriginLoading: 'anonymous'
  },
  module: {
    rules: [
      {
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto'
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: 'babel-loader'
      },
      {
              test: /\.css$/,
              use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader']
            }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html'
    }),
    new Dotenv({ path: path.resolve(__dirname, '.env'), silent: true }),
    new webpack.ProvidePlugin({
      process: 'process/browser.js',
      Buffer: ['buffer', 'Buffer']
    }),
    new SubresourceIntegrityPlugin({
      hashFuncNames: ['sha256', 'sha384']
    }),
    new MiniCssExtractPlugin({ filename: '[name].[contenthash].css' }),
    new CopyPlugin({ patterns: [{ from: 'public/blog', to: 'blog' }] })
  ],
  resolve: {
    extensions: ['.mjs', '.js', '.jsx'],
    alias: {
      process: 'process/browser.js',
    },
    fallback: {
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer/'),
      util: require.resolve('util/'),
      assert: require.resolve('assert/'),
      url: require.resolve('url/'),
      vm: require.resolve('vm-browserify'),
      path: require.resolve('path-browserify'),
      os: require.resolve('os-browserify/browser'),
      fs: false
    }
  },
  devServer: {
    static: [
      { directory: path.resolve(__dirname, 'dist') },
      { directory: path.resolve(__dirname, 'public'), publicPath: '/' }
    ],
    historyApiFallback: true,
    hot: true,
    port: 3000
  }
};