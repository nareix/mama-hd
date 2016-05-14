
class Damoo {
	constructor({container, fontSize, maxCount}) {
		this.container = container;
		this.fontSize = fontSize;
		this.freelist = new Set();
		this.busylist = new Set();
		this.curRow = 0;
		this.measureCtx = document.createElement('canvas').getContext('2d');
		this.measureCtx.font = `${this.fontSize}px Arail`;

		maxCount = maxCount || 300;

		for (let i = 0; i < maxCount; i++) {
			let p = document.createElement('canvas');
			p.style.position = 'absolute';
			p.style.backgroundColor = 'transparent';
			let ctx = p.getContext('2d');
			container.appendChild(p);
			this.freelist.add({p, ctx});
		}
	}

	emit({text, color, pos, shadow, time}) {
		if (this.container.style.display == 'none')
			return;

		let next = this.freelist.values().next();
		let item;
		if (next && next.value) 
			item = next.value;
		if (item == null)
			return;
		this.freelist.delete(item);
		let {p, ctx} = item;

		// 不挡字幕
		const rows = Math.max((this.container.offsetHeight/this.fontSize)-4, 8);
		this.curRow++;
		if (this.curRow > rows)
			this.curRow = 0;

		color = color || '#fff';
		shadow = shadow || {color: '#000'};
		pos = pos || 'normal';

		p.width = this.measureCtx.measureText(text).width;
		p.height = this.fontSize*1.5;

		ctx.font = `${this.fontSize}px Arail`;
		ctx.fillStyle = color;
		ctx.textAlign = "start";
		ctx.textBaseline = "top";
		if (shadow) {
			ctx.shadowOffsetX = 1;
			ctx.shadowOffsetY = 1;
			ctx.shadowColor = shadow.color;
		}
		ctx.clearRect(0, 0, p.width, p.height);
		ctx.fillText(text, 0, 0);

		time = time || 8;
		let movew = this.container.offsetWidth+p.width;

		p.style.top = `${this.curRow*this.fontSize}px`;
		if (pos == 'top') {
			p.style.left = `${(this.container.offsetWidth-p.width)/2}px`;
			delete p.style.right;
		} else {
			delete p.style.left;
			p.style.right = `${-p.width}px`;
		}

		p.style.transition = `none`;
		p.style.transform = `none`;
		p.style.display = 'block';

		setTimeout(() => {
			p.style.display = 'none';
			this.freelist.add(item);
		}, time*1000);

		if (pos == 'normal') {
			setTimeout(() => {
				p.style.transition = `transform ${time}s linear`;
				p.style.transform = `translate(-${movew}px,0)`;
			}, 50);
		}
	}

	clear() {
	}

	hide() {
		this.container.style.display = 'none';
	}

	show() {
		this.container.style.display = 'block';
	}

	suspend() {
	}

	resume() {
	}
}

module.exports = Damoo;

