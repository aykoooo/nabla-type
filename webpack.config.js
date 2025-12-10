const path = require('path');

module.exports = {
  mode: 'development',
  entry: path.resolve('./entry.js'),
  module: {
    rules: [
      {
        test: /\.svg$/,
        loader: 'svg-inline-loader'
      },
      {
        test: /\.(frag|vert|glsl)$/,
        use: [
          {
            loader: 'glsl-shader-loader',
            options: {}
          }
        ]
      }
    ]
  },
  resolve: {
    fallback: {
      "fs": false,
      "path": require.resolve("path-browserify")
    }
  },
  devtool: 'inline-source-map',
  devServer: {
    host: '127.0.0.1',
    port: 9001,
    static: {
      directory: path.resolve('./'),
      watch: true
    },
    devMiddleware: {
      publicPath: '/dist/'
    },
    compress: true,
    open: true,
    watchFiles: {
      paths: ['app.html', 'index.html', 'css/**/*', 'js/**/*', 'glsl/**/*']
    }
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve('dist')
  }
}