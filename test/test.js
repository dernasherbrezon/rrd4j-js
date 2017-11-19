var expect = require('chai').expect
var rrdFile = require('../src/index').default
var fs = require('fs')

describe('rrdfile', function () {
  it('should return empty array for unknown ds', function(){
    fs.readFile(__dirname + '/demo.rrd', function (err, data) {
      var result = new rrdFile(data).getData(Math.random().toString(36).substring(7), 'AVERAGE', new Date(), new Date())
      expect(result).to.be.a({});
    })
  })
})
