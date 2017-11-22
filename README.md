# About [![Build Status](https://travis-ci.org/dernasherbrezon/rrd4j-js.svg?branch=master)](https://travis-ci.org/dernasherbrezon/rrd4j-js)

Javascript library for loading [rrd4j](https://github.com/rrd4j/rrd4j) files

![sample](sample.png)

# Installation

### NPM

	npm install rrd4j-js

# Usage

	var RRDFile = require('rrd4j-js')
	var data = new RRDFile(byteArray).getData('datasource', 'AVERAGE', new Date(start), new Date(end))
	console.log(data.label)
	console.log(data.data.length)