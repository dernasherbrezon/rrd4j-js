var assert = require('assert')
var rrdfile = require('../dist/rrd4j')
var fs = require('fs')

describe('rrdfile', function () {
  describe('success', function () {
    fs.readFile(__dirname + '/demo.rrd', function (err, data) {
      console.log('data: ' + data + ' error ' + err)
    })
  })
})