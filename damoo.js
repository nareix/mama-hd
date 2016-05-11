/*!
 * Damoo - HTML5 Danmaku Engine v2.1.9
 * https://github.com/jamesliu96/Damoo
 *
 * Copyright (c) 2015-2016 James Liu
 * Released under the MIT license
 */

// m=DOMNode
// n=ID
// r=Rows
// t=FontFamily
var Damoo = function(m, n, r, t) {
		if (!(this instanceof Damoo)) {
				return new Damoo(m, n, r, t);
		}
		this.canvas = new Canvas(m, n, r, t);
		this.thread = new Thread(r);
};

Damoo.version = "v2.1.9";

Damoo.dom = window.document;

var _preload = function(d, f) {
		var cvs = Damoo.dom.createElement('canvas'),
				ctx = cvs.getContext('2d');
		ctx.font = f;
		cvs.width = ctx.measureText(d.text).width;
		cvs.height = f.size * 1.5;
		ctx.font = f;
		ctx.textAlign = "start";
		ctx.textBaseline = "top";
		if (d.shadow) {
				ctx.shadowOffsetX = 1;
				ctx.shadowOffsetY = 1;
				ctx.shadowColor = "#fff";
				ctx.shadowColor = d.shadow.color;
		}
		ctx.fillStyle = "#fff";
		ctx.fillStyle = d.color;
		ctx.fillText(d.text, 0, 0);
		return cvs;
};

var _RAF = window.requestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.msRequestAnimationFrame ||
		window.oRequestAnimationFrame ||
		function(cb) { return setTimeout(cb, 17); };

var _CAF = window.cancelAnimationFrame ||
		window.mozCancelAnimationFrame ||
		window.webkitCancelAnimationFrame ||
		window.webkitCancelRequestAnimationFrame ||
		window.msCancelAnimationFrame ||
		window.oCancelAnimationFrame ||
		function(id) { clearTimeout(id); };

Damoo.prototype.show = function() {
		this.canvas.parent.appendChild(this.canvas.layer);
		return this;
};

Damoo.prototype.hide = function() {
		this.canvas.parent.removeChild(this.canvas.layer);
		return this;
};

Damoo.prototype.emit = function(d) {
		if ("string" === typeof d) {
				d = { text: d };
		}
		var cvs = _preload(d, this.canvas.font);
		this.thread.push({
				canvas: cvs,
				fixed: d.fixed,
				index: this.thread.index,
				speed: Math.pow(cvs.width, 0.7)*0.2,
				offset: {
						x: this.canvas.width,
						y: this.canvas.font.size * this.thread.index
				}
		});
		return this;
};

Damoo.prototype.clear = function() {
		this.thread.empty();
		return this;
};

var _afid;

var _render = function() {
		this.canvas.clear();
		for (var i = 0; i < this.thread.pool.length; i++) {
				var d = this.thread.get(i),
						x = d.offset.x,
						y = d.offset.y;
				this.canvas.draw(d, x, y);
				d.offset.x -= d.speed;
				if (x <= -d.canvas.width) {
						this.thread.remove(i);
				}
		}
		_afid = _RAF(function(self) {
				return function() {
						_render.call(self);
				};
		}(this));
};

Damoo.prototype.start = function() {
		if (this.state === void 0) {
				this.clear().show();
		}
		if (!this.state) {
				_render.call(this);
				this.state = 1;
		}
		return this;
};

Damoo.prototype.suspend = function() {
		if (this.state === void 0) {
				return this;
		}
		_CAF(_afid);
		this.state = 0;
		return this;
};

Damoo.prototype.resume = function() {
		return this.start();
};

var Canvas = function(m, n, r, t) {
		this.parent = m.nodeType == 1 ? m : Damoo.dom.getElementById(m);
		this.id = n;
		this.rows = r;
		this.width = this.parent.offsetWidth;
		this.height = this.parent.offsetHeight;
		if (this.height / this.rows < 12) {
				this.rows = this.height / 12;
		}
		this.font = new Font(this.height / this.rows, t);
		this.layer = Damoo.dom.createElement('canvas');
		this.context = this.layer.getContext('2d');
		this.layer.id = this.id;
		this.layer.width = this.width;
		this.layer.height = this.height;
		this.layer.style.display = "block";
		this.layer.style.backgroundColor = "transparent";
		if (this.parent.style.position) {
				this.layer.style.position = "fixed";
				this.layer.style.left = this.parent.offsetLeft;
				this.layer.style.top = this.parent.offsetTop;
		} else {
				this.parent.style.position = "relative";
				this.layer.style.position = "absolute";
				this.layer.style.left = 0;
				this.layer.style.top = 0;
		}
		this.layer.style.zIndex = 99999;
};

Canvas.prototype.clear = function() {
		this.context.clearRect(0, 0, this.width, this.height);
};

Canvas.prototype.draw = function(t, x, y) {
		if (t.fixed) {
				x = (this.width - t.canvas.width) / 2;
		}
		this.context.drawImage(t.canvas, x, y);
};

var Font = function(s, f) {
		this.size = s;
		this.family = f || "sans-serif";
};

Font.prototype.toString = function() {
		return this.size + "px " + this.family;
};

var Thread = function(r) {
		this.index = 0;
		this.rows = r;
		this.pool = [];
};

Thread.prototype.push = function(d) {
		this.index++;
		if (this.index >= this.rows) {
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

