/*!
 * Damoo - HTML5 Danmaku Engine v2.1.9
 * https://github.com/jamesliu96/Damoo
 *
 * Copyright (c) 2015-2016 James Liu
 * Released under the MIT license
 */

var Damoo = function({container, fontSize, fontFamily}) {
	fontFamily = fontFamily || 'Arial';
	this.canvas = new Canvas(container, fontSize, fontFamily);
	this.thread = new Thread(() => Math.floor(container.offsetHeight/fontSize-4));
};

var _preload = function(d, f) {
	var cvs = document.createElement('canvas');
	var ctx = cvs.getContext('2d');
	ctx.font = f;
	cvs.width = ctx.measureText(d.text).width;
	cvs.height = f.size * 1.5;
	ctx.font = f;
	ctx.textAlign = "start";
	ctx.textBaseline = "top";
	let shadow = d.shadow || {color: '#000'};
	if (shadow) {
		ctx.shadowOffsetX = 1;
		ctx.shadowOffsetY = 1;
		ctx.shadowColor = shadow.color;
	}
	ctx.fillStyle = "#fff";
	ctx.fillStyle = d.color;
	ctx.fillText(d.text, 0, 0);
	return cvs;
};

var _RAF = function(cb) { return setTimeout(cb, 1000/10) };
var _CAF = function(id) { clearTimeout(id); };

Damoo.prototype.curtime = function() {
	if (this._curtimeBase) {
		return this._curtimeBase+(Date.now()-this._curtimeStart)/1e3;
	}
	return Date.now()/1e3;
}

Damoo.prototype.emit = function(d) {
	if ("string" === typeof d) {
		d = { text: d };
	}
	var cvs = _preload(d, this.canvas.font);
	var defaultTime = 10;
	this.thread.push({
		canvas: cvs,
		pos: d.pos,
		index: this.thread.index,
		displaytime: d.time || 10,
		timestart: this.curtime(),
		y: this.canvas.font.size * this.thread.index,
	});
	return this;
};

Damoo.prototype.render = function() {
	var time = this.curtime();

	this.canvas.clear();
	for (var i = 0; i < this.thread.pool.length; i++) {
		var d = this.thread.get(i);
		var elapsed = time-d.timestart;
		if (elapsed > d.displaytime) {
			this.thread.remove(i);
			continue;
		}
		var x;
		if (d.pos == 'bottom' || d.pos == 'top') {
			x = (this.canvas.width-d.canvas.width)/2;
		} else {
			var w = this.canvas.width+d.canvas.width;
			x = this.canvas.width-w*(elapsed/d.displaytime);
		}
		this.canvas.context.drawImage(d.canvas, x, d.y);
	}
	this._afid = _RAF(() => this.render());
}

Damoo.prototype.clear = function() {
	this.thread.empty();
};

Damoo.prototype.updateState = function() {
	if (this.playing && this.visible) {
		if (this._afid == null) {
			this.render();
		}
	} else {
		if (this._afid) {
			_CAF(this._afid);
			this._afid = null;
		}
	}
}

Damoo.prototype.synctime = function(time) {
	this._curtimeBase = time;
	this._curtimeStart = Date.now();
}

Damoo.prototype.suspend = function() {
	if (this.playing) {
		this.playing = false;
		this.updateState();
	}
};

Damoo.prototype.resume = function() {
	if (!this.playing) {
		this.playing = true;
		this.updateState();
	}
};

Damoo.prototype.show = function() {
	if (!this.visible) {
		this.visible = true;
		this.canvas.container.appendChild(this.canvas.layer);
		this.updateState();
	}
};

Damoo.prototype.hide = function() {
	if (this.visible) {
		this.visible = false;
		this.canvas.container.removeChild(this.canvas.layer);
		this.updateState();
	}
};

var Canvas = function(container, fontSize, fontFamily) {
	this.container = container;
	this.font = new Font(fontSize, fontFamily);
	this.layer = document.createElement('canvas');
	this.layer.style.position = 'absolute';
	this.layer.style.left = 0;
	this.layer.style.top = 0;
	this.context = this.layer.getContext('2d');
	let resize = () => {
		this.width = container.offsetWidth;
		this.height = container.offsetHeight;
		this.layer.width = this.width;
		this.layer.height = this.height;
	}
	window.addEventListener('resize', resize);
	resize();
};

Canvas.prototype.clear = function() {
	this.context.clearRect(0, 0, this.width, this.height);
};

var Font = function(s, f) {
	this.size = s;
	this.family = f || "sans-serif";
};

Font.prototype.toString = function() {
	return this.size + "px " + this.family;
};

var Thread = function(rows) {
	this.index = 0;
	this.rows = rows;
	this.pool = [];
};

Thread.prototype.push = function(d) {
	this.index++;
	if (this.index >= this.rows()) {
		this.index = 0;
	}
	this.pool.push(d);
};

Thread.prototype.get = function(d) {
	return this.pool[d];
};

Thread.prototype.remove = function(d) {
	var i = this.get(d).index;
	if (this.index > i) {
		this.index = i;
	}
	this.pool.splice(d, 1);
};

Thread.prototype.empty = function() {
	this.index = 0;
	this.pool = [];
};

module.exports = Damoo;

