var expect = require('chai').expect
var RRDFile = require('../src/index').default
var fs = require('fs')
var path = require('path')

describe('rrdfile', function () {
  it('should return empty array for unknown ds', function (done) {
    fs.readFile(path.join(__dirname, '/demo.rrd'), function (err, data) {
      expect(err).to.equal(null)
      var result = new RRDFile(data).getData(Math.random().toString(36).substring(7), 'AVERAGE', new Date(), new Date())
      expect(result).to.deep.equal({})
      done()
    })
  })
  it('should return some data', function (done) {
    fs.readFile(path.join(__dirname, '/demo.rrd'), function (err, data) {
      expect(err).to.equal(null)
      var result = new RRDFile(data).getData('sun', 'AVERAGE', new Date(), new Date())
      expect(result).to.deep.equal({})
      done()
    })
  })
})
