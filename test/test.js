var expect = require('chai').expect
var RRDFile = require('../dist/rrd4j')
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
      var result = new RRDFile(data).getData('sun', 'AVERAGE', new Date(1278111429000), new Date(1278111431000))
      expect(result.label).to.equal('sun')
      expect(result.data).to.deep.equal([[1278111300000, 3957.25], [1278111600000, NaN]])
      done()
    })
  })
})
