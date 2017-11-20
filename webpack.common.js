const
path = require('path');

const
CleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = {
  entry : {
    rrd4j : './src/index.js'
  },
  plugins : [ new CleanWebpackPlugin([ 'dist' ]) ],
  output : {
    filename : '[name].js',
    path : path.resolve(__dirname, 'dist')
  },
  module: {
    loaders: [
      {
        test: path.join(__dirname, 'src'),
        loader: 'babel-loader'
      }
    ]
  }
};