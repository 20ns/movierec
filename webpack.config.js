const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const Dotenv = require('dotenv-webpack');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { SubresourceIntegrityPlugin } = require('webpack-subresource-integrity');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    mode: isProduction ? 'production' : 'development',
    entry: './src/index.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? '[name].[contenthash].js' : '[name].js',
      chunkFilename: isProduction ? '[name].[contenthash].js' : '[name].js',
      publicPath: '/',
      crossOriginLoading: 'anonymous',
      clean: true
    },
    optimization: {
      minimizer: isProduction ? [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: true,
              drop_debugger: true
            }
          }
        })
      ] : [],
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5
          }
        }      },
      runtimeChunk: 'single'
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
      },      {
        test: /\.css$/,
        use: [
          isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
          'css-loader',
          'postcss-loader'
        ]
      },
      {
        test: /\.(png|jpe?g|gif|svg|webp|avif)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name].[contenthash][ext]'
        },
        use: [
          {
            loader: 'image-webpack-loader',
            options: {
              disable: !isProduction,
              mozjpeg: {
                progressive: true,
                quality: 85
              },
              optipng: {
                enabled: false
              },
              pngquant: {
                quality: [0.8, 0.9],
                speed: 4
              },
              gifsicle: {
                interlaced: false
              },
              webp: {
                quality: 85
              }
            }
          }
        ]
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[contenthash][ext]'
        }      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      minify: isProduction ? {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true
      } : false,
      inject: true
    }),
    new Dotenv({ 
      path: path.resolve(__dirname, '.env'), 
      silent: false, // Show warnings if .env is missing
      systemvars: true,
      safe: false, // Don't require .env.example
      defaults: false // Don't load .env.defaults
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser.js',
      Buffer: ['buffer', 'Buffer']
    }),
    ...(isProduction ? [
      new SubresourceIntegrityPlugin({
        hashFuncNames: ['sha256', 'sha384']
      }),
      new MiniCssExtractPlugin({ 
        filename: 'css/[name].[contenthash].css',
        chunkFilename: 'css/[id].[contenthash].css'
      })
    ] : []),
    new CopyPlugin({ 
      patterns: [
        { from: 'public/blog', to: 'blog' },
        { from: 'public/robots.txt', to: 'robots.txt' },
        { from: 'public/sitemap.xml', to: 'sitemap.xml', noErrorOnMissing: true },
        { from: 'public/manifest.json', to: 'manifest.json', noErrorOnMissing: true }
      ] 
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
      'process.env.REACT_APP_API_GATEWAY_INVOKE_URL': JSON.stringify(process.env.REACT_APP_API_GATEWAY_INVOKE_URL),
      'process.env.REACT_APP_TMDB_API_KEY': JSON.stringify(process.env.REACT_APP_TMDB_API_KEY),
      'process.env.REACT_APP_FANART_TV_API_KEY': JSON.stringify(process.env.REACT_APP_FANART_TV_API_KEY),
      'process.env.REACT_APP_COGNITO_USER_POOL_ID': JSON.stringify(process.env.REACT_APP_COGNITO_USER_POOL_ID),
      'process.env.REACT_APP_COGNITO_CLIENT_ID': JSON.stringify(process.env.REACT_APP_COGNITO_CLIENT_ID),
      'process.env.REACT_APP_REDIRECT_SIGN_IN': JSON.stringify(process.env.REACT_APP_REDIRECT_SIGN_IN),
      'process.env.REACT_APP_REDIRECT_SIGN_OUT': JSON.stringify(process.env.REACT_APP_REDIRECT_SIGN_OUT)
    })
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
      os: require.resolve('os-browserify/browser'),      fs: false
    }
  },
  devServer: {
    static: [
      { directory: path.resolve(__dirname, 'dist') },
      { directory: path.resolve(__dirname, 'public'), publicPath: '/' }
    ],
    historyApiFallback: {
      rewrites: [
        { from: /^\/blog/, to: '/blog/index.html' }
      ]
    },
    hot: true,
    port: 3000,
    host: 'localhost',
    compress: true,
    allowedHosts: ['localhost', '.movierec.net'],
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
    }
  },  performance: {
    hints: isProduction ? 'warning' : false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  }
  };
};