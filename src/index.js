function Datasource (rrdFile) {
  this.dsName = rrdFile.getString()
  this.dsType = rrdFile.getString()
  this.heartbeat = rrdFile.getLong()
  this.minValue = rrdFile.getDouble()
  this.maxValue = rrdFile.getDouble()
  this.lastValue = rrdFile.getDouble()
  this.accumValue = rrdFile.getDouble()
  this.nanSeconds = rrdFile.getLong()
}

function Archive (rrdFile) {
  this.consolFun = rrdFile.getString()
  this.xff = rrdFile.getDouble()
  this.steps = rrdFile.getInt()
  this.rows = rrdFile.getInt()
  this.headerStep = rrdFile.step
  this.headerLastUpdateTime = rrdFile.lastUpdateTime
  this.robins = []
  for (var i = 0; i < rrdFile.dsCount; i++) {
    var curPointer = rrdFile.getInt()
    var arcState = new ArcState(rrdFile)
    this.robins.push(new RobinMatrix(curPointer, arcState, this.rows))
  }
  for (var j = 0; j < this.rows; j++) {
    for (i = 0; i < rrdFile.dsCount; i++) {
      this.robins[i].data.push(rrdFile.getDouble())
    }
  }
}

Archive.prototype.getArcStep = function () {
  return this.headerStep * this.steps
}

Archive.prototype.getStartTime = function () {
  var endTime = this.getEndTime()
  var arcStep = this.getArcStep()
  return endTime - (this.rows - 1) * arcStep
}

Archive.prototype.getEndTime = function () {
  return normalize(this.headerLastUpdateTime, this.getArcStep())
}

Archive.prototype.getData = function (dsIndex, requestFetchStart, requestFetchEnd) {
  var arcStep = this.getArcStep()
  var fetchStart = normalize(requestFetchStart, arcStep)
  var fetchEnd = normalize(requestFetchEnd, arcStep)
  if (fetchEnd < requestFetchEnd) {
    fetchEnd += arcStep
  }
  var startTime = this.getStartTime()
  var endTime = this.getEndTime()
  var ptsCount = ((fetchEnd - fetchStart) / arcStep + 1)
  var matchStartTime = Math.max(fetchStart, startTime)
  var matchEndTime = Math.min(fetchEnd, endTime)
  var robinValues = []

  if (matchStartTime <= matchEndTime) {
    // preload robin values
    var matchCount = ((matchEndTime - matchStartTime) / arcStep + 1)
    var matchStartIndex = ((matchStartTime - startTime) / arcStep)
    robinValues = this.robins[dsIndex].getValues(matchStartIndex, matchCount)
  }
  var result = []
  for (var ptIndex = 0; ptIndex < ptsCount; ptIndex++) {
    var time = fetchStart + ptIndex * arcStep
    var value = NaN
    if (time >= matchStartTime && time <= matchEndTime) {
      // inbound time
      value = robinValues[((time - matchStartTime) / arcStep)]
    }
    result.push([ (fetchStart + ptIndex * arcStep) * 1000, value ])
  }

  return result
}

function normalize (timestamp, step) {
  return timestamp - timestamp % step
}

function RobinMatrix (pointer, arcState, rows) {
  this.pointer = pointer
  this.arcState = arcState
  this.rows = rows
  this.data = []
}

RobinMatrix.prototype.getValues = function (index, count) {
  var startIndex = (this.pointer + index) % this.rows
  var tailReadCount = Math.min(this.rows - startIndex, count)
  var tailValues = this.data.slice(startIndex, startIndex + tailReadCount)
  if (tailReadCount < count) {
    var headReadCount = count - tailReadCount
    var headValues = this.data.slice(0, 0 + headReadCount)
    return tailValues.concat(headValues)
  } else {
    return tailValues
  }
}

function ArcState (rrdFile) {
  this.accumValue = rrdFile.getDouble()
  this.nanSteps = rrdFile.getLong()
}

function RRDFile (byteArray) {
  this.data = byteArray
  this.index = 0
  this.signature = this.getString()
  this.step = this.getLong()
  this.dsCount = this.getInt()
  this.arcCount = this.getInt()
  this.lastUpdateTime = this.getLong()
  this.datasources = []
  for (var i = 0; i < this.dsCount; i++) {
    this.datasources.push(new Datasource(this))
  }
  this.archives = []
  for (i = 0; i < this.arcCount; i++) {
    this.archives.push(new Archive(this))
  }
}

RRDFile.prototype.getData = function (dsName, consolFun, fetchStart, fetchEnd) {
  var dsIndex = this.getDsIndex(dsName)
  var archive = this.getArchive(consolFun, fetchStart / 1000, fetchEnd / 1000)
  if (dsIndex === -1 || archive === null) {
    return {}
  }
  var result = {
    label: dsName,
    data: archive.getData(dsIndex, fetchStart / 1000, fetchEnd / 1000)
  }
  return result
}

RRDFile.prototype.getArchive = function (consolFun, fetchStart, fetchEnd) {
  var bestFullMatch = null
  var bestPartialMatch = null
  var bestStepDiff = 0
  var bestMatch = 0
  for (var i = 0; i < this.arcCount; i++) {
    var archive = this.archives[i]
    if (archive.consolFun !== consolFun) {
      continue
    }
    var arcStep = archive.getArcStep()
    var arcStart = archive.getStartTime() - arcStep
    var fullMatch = fetchEnd - fetchStart
    var tmpStepDiff = Math.abs(archive.getArcStep() - 1)
    // we need step difference in either full or partial case
    if (arcStart <= fetchStart) {
      // best full match
      if (bestFullMatch == null || tmpStepDiff < bestStepDiff) {
        bestStepDiff = tmpStepDiff
        bestFullMatch = archive
      }
    } else {
      // best partial match
      var tmpMatch = fullMatch
      if (arcStart > fetchStart) {
        tmpMatch -= (arcStart - fetchStart)
      }
      if (bestPartialMatch === null || bestMatch < tmpMatch || (bestMatch === tmpMatch && tmpStepDiff < bestStepDiff)) {
        bestPartialMatch = archive
        bestMatch = tmpMatch
      }
    }
  }
  if (bestFullMatch != null) {
    return bestFullMatch
  } else if (bestPartialMatch != null) {
    return bestPartialMatch
  }
  return null
}

RRDFile.prototype.getDsIndex = function (dsName) {
  for (var i = 0; i < this.dsCount; i++) {
    if (dsName === this.datasources[i].dsName) {
      return i
    }
  }
  return -1
}

RRDFile.prototype.getString = function () {
  var result = ''
  for (var i = 0; i < 40; i += 2) {
    result += String.fromCharCode(this.data[this.index + i + 1])
  }
  this.index += 40
  return result.trim()
}

RRDFile.prototype.getDouble = function () {
  var view = new DataView(this.data.buffer, this.index, 8)
  var result = view.getFloat64(0, false)
  this.index += 8
  return result
}

RRDFile.prototype.getLong = function () {
  var high = this.getInt()
  var low = this.getInt()
  return (high << 32) + (low & 0xFFFFFFFF)
}

RRDFile.prototype.getInt = function () {
  var result = ((this.data[this.index + 0] << 24) & 0xFF000000) + ((this.data[this.index + 1] << 16) & 0x00FF0000) + ((this.data[this.index + 2] << 8) & 0x0000FF00) + ((this.data[this.index + 3] << 0) & 0x000000FF)
  this.index += 4
  return result
}

RRDFile.prototype.skip = function (numBytes) {
  this.index += numBytes
}

export default RRDFile
