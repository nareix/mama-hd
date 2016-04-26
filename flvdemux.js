
'use strict'

class ByteReader {
	constructor(buf) {
		this.buf = buf;
		this.pos = 0;
	}

	len() {
		return this.buf.byteLength-this.pos;
	}

	readBEUint(len) {
		if (this.pos >= this.buf.byteLength)
			throw new Error('EOF');
		let v = 0;
		for (let i = this.pos; i < this.pos+len; i++) {
			v <<= 8;
			v |= this.buf[i];
		}
		this.pos += len;
		return v;
	}

	readBEInt(len) {
		let i = this.readBEUint(len);
		let topbit = 1<<(len*8-1);
		if (i & topbit) {
			return -((topbit<<1)-i);
		} else {
			return i;
		}
	}

	readBuf(len) {
		if (this.pos >= this.buf.byteLength)
			throw new Error('EOF');
		let b = this.buf.slice(this.pos, this.pos+len);
		this.pos += len;
		return b;
	}

	skip(len) {
		if (this.pos >= this.buf.byteLength)
			throw new Error('EOF');
		this.pos += len;
	}
}

const TAG_SCRIPTDATA = 18;
const TAG_AUDIO = 8;
const TAG_VIDEO = 9;

const AMF_NUMBER      = 0x00;
const AMF_BOOL        = 0x01;
const AMF_STRING      = 0x02;
const AMF_OBJECT      = 0x03;
const AMF_NULL        = 0x05;
const AMF_UNDEFINED   = 0x06;
const AMF_REFERENCE   = 0x07;
const AMF_MIXEDARRAY  = 0x08;
const AMF_OBJECT_END  = 0x09;
const AMF_ARRAY       = 0x0a;
const AMF_DATE        = 0x0b;
const AMF_LONG_STRING = 0x0c;

let readAMFString = br => {
	let length = br.readBEUint(2);
	let buf = br.readBuf(length);
	return String.fromCharCode.apply(null, buf);
}

let readAMFObject = br => {
	let type = br.readBEUint(1);

	switch (type) {
		case AMF_NUMBER: {
			var b = br.readBuf(8);
			return new DataView(b.buffer).getFloat64(0);
		}

		case AMF_BOOL: {
			return br.readBEUint(1) != 0;
		}

		case AMF_STRING: {
			return readAMFString(br);
		}

		case AMF_OBJECT: {
			let map = {};
			for (;;) {
				let str = readAMFString(br);
				if (str.length == 0)
					break;
				let obj = readAMFObject(br);
				map[str] = obj;
			}
			br.skip(1);
			return map;
		}

		case AMF_DATE: {
			br.skip(10);
			return;
		}

		case AMF_ARRAY: {
			let arr = [];
			let len = br.readBEUint(4);
			for (let i = 0; i < len; i++) {
				let obj = readAMFObject(br);
				arr.push(obj);
			}
			return arr;
		}

		case AMF_MIXEDARRAY: {
			let map = {};
			br.skip(4);
			for (;;) {
				let str = readAMFString(br);
				if (str.length == 0)
					break;
				let obj = readAMFObject(br);
				map[str] = obj;
			}
			br.skip(1);
			return map;
		}
	}
}

let parseScriptData = uint8arr => {
	let br = new ByteReader(uint8arr);
	let type = br.readBEUint(1);
	let str = readAMFString(br);
	if (str == 'onMetaData') {
		return readAMFObject(br);
	}
}

let parseVideoPacket = (uint8arr, dts) => {
	let br = new ByteReader(uint8arr);
	let flags = br.readBEUint(1);
	let frameType = (flags>>4)&0xf;
	let codecId = flags&0xf;
	let pkt = {type:'video', dts:dts/1e3};

	if (codecId == 7) { // h264
		let type = br.readBEUint(1);
		let cts = br.readBEInt(3);
		pkt.cts = cts/1e3;
		pkt.pts = dts+cts;
		if (type == 0) {
			// AVCDecoderConfigurationRecord
			pkt.AVCDecoderConfigurationRecord = br.readBuf(br.len());
		} else if (type == 1) {
			// NALUs
			pkt.NALUs = br.readBuf(br.len());
			pkt.isKeyFrame = frameType==1;
		} else if (type == 2) {
			throw new Error('type=2');
		}
	}
	return pkt;
}

let parseAudioPacket = (uint8arr, dts) => {
	let br = new ByteReader(uint8arr);
	let flags = br.readBEUint(1)
	let fmt = flags>>4;
	let pkt = {type: 'audio', dts:dts/1e3}
	if (fmt == 10) {
		// AAC
		let type = br.readBEUint(1);
		if (type == 0) {
			pkt.AudioSpecificConfig = br.readBuf(br.len());
			pkt.sampleRate = [5500,11000,22000,44000][(flags>>2)&3];
			pkt.sampleSize = [8,16][(flags>>1)&1];
			pkt.channelCount = [1,2][(flags)&1];
		} else if (type == 1)
			pkt.frame = br.readBuf(br.len());
	}
	return pkt;
};

let parseMediaSegment = uint8arr => {
	let br = new ByteReader(uint8arr);
	let packets = [];

	while (br.len() > 0) {
		let tagType = br.readBEUint(1);
		let dataSize = br.readBEUint(3);
		let dts = br.readBEUint(3);
		br.skip(4);
		let data = br.readBuf(dataSize);

		switch (tagType) {
		case TAG_SCRIPTDATA:
			break;

		case TAG_VIDEO:
			packets.push(parseVideoPacket(data, dts));
			break;

		case TAG_AUDIO:
			packets.push(parseAudioPacket(data, dts));
			break;

		default:
			//throw new Error(`unknown tag=${tagType}`);
		}

		br.skip(4);
	}

	return packets;
}

class InitSegmentParser {
	constructor() {
		let meta, firsta, firstv;
		this._readloop = (function *() {
			yield 5;
			let dataOffset = yield 4;
			yield dataOffset-9+4;

			for (;;) {
				let tagType = yield 1;
				let dataSize = yield 3;
				let timeStamp = yield 3;
				yield 4;
				let data = yield {len:dataSize};
				if (tagType == TAG_SCRIPTDATA) {
					meta = parseScriptData(data);
				} else if (tagType == TAG_VIDEO && firstv == null) {
					firstv = parseVideoPacket(data);
				} else if (tagType == TAG_AUDIO && firsta == null) {
					firsta = parseAudioPacket(data);
				}
				if (meta && firsta && firstv) {
					return {meta,firstv,firsta};
				}
				yield 4;
			}
		})();
		this._next();
	}

	_next() {
		let r = this._readloop.next(this._val);
		if (r.done) {
			this._done = r.value;
		} else {
			if (typeof(r.value) == 'number') {
				this._left = r.value;
				this._val = 0;
			} else {
				this._left = r.value.len;
				if (this._left > 1024*1024*16)
					throw new Error('buf too big')
				this._val = new Uint8Array(this._left);
			}
		}
	}

	push(input) {
		let pos = 0;
		while (!this._done && pos < input.byteLength) {
			if (typeof(this._val) == 'number') {
				while (this._left > 0 && pos < input.byteLength) {
					this._val <<= 8;
					this._val |= input[pos];
					this._left--;
					pos++;
				}
			} else {
				while (this._left > 0 && pos < input.byteLength) {
					let len = Math.min(this._left, input.byteLength-pos);
					this._val.set(input.slice(pos,pos+len), this._val.byteLength-this._left);
					this._left -= len;
					pos += len;
				}
			}
			if (this._left == 0) {
				this._next();
			}
		}
		return this._done;
	}
}

let parseInitSegment = uint8arr => {
	try {
		let br = new ByteReader(uint8arr);
		br.skip(5);
		let dataOffset = br.readBEUint(4);
		let skip = dataOffset-9+4;
		br.skip(skip);

		let meta;
		let firsta, firstv;

		for (let i = 0; i < 4; i++) {
			let tagType = br.readBEUint(1);
			let dataSize = br.readBEUint(3);
			let timeStamp = br.readBEUint(3);
			br.skip(4);
			let data = br.readBuf(dataSize);

			if (tagType == TAG_SCRIPTDATA) {
				meta = parseScriptData(data);
			} else if (tagType == TAG_VIDEO && firstv == null) {
				firstv = parseVideoPacket(data);
			} else if (tagType == TAG_AUDIO && firsta == null) {
				firsta = parseAudioPacket(data);
			}

			if (meta && firsta && firstv) {
				return {meta,firstv,firsta};
			}
			br.skip(4);
		}
	} catch (e) {
		console.error(e.stack);
	}
}

exports.InitSegmentParser = InitSegmentParser;
exports.parseInitSegment = parseInitSegment;
exports.parseMediaSegment = parseMediaSegment;

