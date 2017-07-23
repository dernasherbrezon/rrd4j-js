(function($) {

	$.fn.rrd4j = function(options) {
		// Establish our default settings
		var settings = $.extend({
			points: {
				show: true
			},
			xaxis: {
			    mode: "time",
			    timeformat: "%Y/%m/%d"
			},
			grid: {
				hoverable: true,
				clickable: true
			}
		}, options);

		$("<div id='rrd4jTooltip'></div>").css({
			position: "absolute",
			display: "none",
			border: "1px solid #fdd",
			padding: "2px",
			"background-color": "#fee",
			opacity: 0.80
		}).appendTo("body");
		
		return this.each(function() {
			var oReq = new XMLHttpRequest(), $this = $(this);
			oReq.open("GET", $this.attr("data-src"), true);
			oReq.responseType = "arraybuffer";
			oReq.onload = function(oEvent) {
				var byteArray = new Uint8Array(oReq.response);
				var file = new RRDFile(byteArray);
				$.plot($this, [ [[0, 0], [new Date().getTime(), 1]] ], settings);
				$this.bind("plothover", function (event, pos, item) {
					if (item) {
						var x = item.datapoint[0].toFixed(2),
							y = item.datapoint[1].toFixed(2);
						$("#rrd4jTooltip").html(y)
							.css({top: item.pageY+5, left: item.pageX+5})
							.fadeIn(200);
					} else {
						$("#rrd4jTooltip").hide();
					}
				});
			};
			oReq.send();
		});
	}

	function Datasource(rrdFile) {
		this.dsName = rrdFile.getString();
		this.dsType = rrdFile.getString();
		this.heartbeat = rrdFile.getLong();
		this.minValue = rrdFile.getDouble();
		this.maxValue = rrdFile.getDouble();
		this.lastValue = rrdFile.getDouble();
		this.accumValue = rrdFile.getDouble();
		this.nanSeconds = rrdFile.getLong();
	}

	function Archive(rrdFile) {
		this.consolFun = rrdFile.getString();
		this.xff = rrdFile.getDouble();
		this.steps = rrdFile.getInt();
		this.rows = rrdFile.getInt();
		this.robins = [];
		for (var i = 0; i < rrdFile.dsCount; i++) {
			var curPointer = rrdFile.getInt(), arcState = new ArcState(rrdFile);
			this.robins.push(new RobinMatrix(curPointer, arcState));
		}
		for( var j = 0; j < this.rows; j++ ) {
			for (var i = 0; i < rrdFile.dsCount; i++) {
				this.robins[i].data.push(rrdFile.getDouble());
			}
		}
	}

	function RobinMatrix(pointer, arcState) {
		this.pointer = pointer;
		this.arcState = arcState;
		this.data = [];
	}
	
	function ArcState(rrdFile) {
		this.accumValue = rrdFile.getDouble();
		this.nanSteps = rrdFile.getLong();
	}

	function RRDFile(byteArray) {
		this.data = byteArray;
		this.index = 0;
		this.signature = this.getString();
		this.step = this.getLong();
		this.dsCount = this.getInt();
		this.arcCount = this.getInt();
		// last update time
		this.skip(8);
		this.datasources = [];
		for (var i = 0; i < this.dsCount; i++) {
			this.datasources.push(new Datasource(this));
		}
		this.archives = [];
		for (var i = 0; i < this.arcCount; i++) {
			this.archives.push(new Archive(this));
		}
	}

	RRDFile.prototype.getString = function() {
		var result = "";
		for (var i = 0; i < 40; i += 2) {
			result += String.fromCharCode(this.data[this.index + i + 1]);
		}
		this.index += 40;
		return result.trim();
	}

	RRDFile.prototype.getDouble = function() {
		var view = new DataView(this.data.buffer, this.index, 8);
		var result = view.getFloat64(0, false);
		this.index += 8;
		return result;
	}

	RRDFile.prototype.getLong = function() {
		var high = this.getInt();
		var low = this.getInt();
		return (high << 32) + (low & 0xFFFFFFFF);
	}

	RRDFile.prototype.getInt = function() {
		var result = ((this.data[this.index + 0] << 24) & 0xFF000000) + ((this.data[this.index + 1] << 16) & 0x00FF0000) + ((this.data[this.index + 2] << 8) & 0x0000FF00) + ((this.data[this.index + 3] << 0) & 0x000000FF);
		this.index += 4;
		return result;
	}

	RRDFile.prototype.skip = function(numBytes) {
		this.index += numBytes;
	}

}(jQuery));