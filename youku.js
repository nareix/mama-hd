/*  youku 
 *  @朱一
 */

var querystring = require('querystring');
var canPlayM3U8 = false
var jsonp = require('./jsonp')

exports.testUrl = function (url) {
  return url.match(/v\.youku\.com/)
}

function D(a) {
	if (!a) return "";
	var a = a.toString(),
		c, b, f, e, g, h;
		f = a.length;
		b = 0;
		for (c = ""; b < f;) {
			e = a.charCodeAt(b++) & 255;
			if (b == f) {
				c += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".charAt(e >> 2);
				c += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".charAt((e & 3) << 4);
				c += "==";
				break
			}
			g = a.charCodeAt(b++);
			if (b == f) {
				c += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".charAt(e >> 2);
				c += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".charAt((e & 3) << 4 | (g & 240) >> 4);
				c += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".charAt((g &
																																												15) << 2);
																																												c += "=";
																																												break
			}
			h = a.charCodeAt(b++);
			c += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".charAt(e >> 2);
			c += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".charAt((e & 3) << 4 | (g & 240) >> 4);
			c += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".charAt((g & 15) << 2 | (h & 192) >> 6);
			c += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".charAt(h & 63)
		}
		return c
}

function E(a, c) {
	for (var b = [], f = 0, i, e = "", h = 0; 256 > h; h++) b[h] = h;
	for (h = 0; 256 > h; h++) f = (f + b[h] + a.charCodeAt(h % a.length)) % 256, i = b[h], b[h] = b[f], b[f] = i;
	for (var q = f = h = 0; q < c.length; q++) h = (h + 1) % 256, f = (f + b[h]) % 256, i = b[h], b[h] = b[f], b[f] = i, e += String.fromCharCode(c.charCodeAt(q) ^ b[(b[h] + b[f]) % 256]);
	return e
}

function F(a, c) {
	for (var b = [], f = 0; f < a.length; f++) {
		for (var i = 0, i = "a" <= a[f] && "z" >= a[f] ? a[f].charCodeAt(0) - 97 : a[f] - 0 + 26, e = 0; 36 > e; e++)
			if (c[e] == i) {
				i = e;
				break
			}
			b[f] = 25 < i ? i - 26 : String.fromCharCode(i + 97)
	}
	return b.join("")
}

function generate_ep(no,streamfileid,sid,token) {
	var number = no.toString(16).toUpperCase();
	if (number.length == 1) {
		number = '0'+number;
	}
	var fcode2 = 'bf7e5f01';
	var fileid = streamfileid.slice(0,8)+number+streamfileid.slice(10);
	var ep = encodeURIComponent(btoa(E(fcode2, sid+'_'+fileid+'_'+token)));
	return [fileid, ep];
}

exports.testEncryptFuncs = function() {
	{
		var ep = "PgXWTwkcJbvS1fTE/OJxANKivhFo1w7OWhs=";
		var f_code_1 = 'becaf9be';

		let [sid, token] = E(f_code_1, atob(ep)).split('_');
		console.log(sid, token)
	}

	{
		let assert = (r1, r2) => {
			console.log(r1[0]==r2[0],r1[1]==r2[1]);
		}
		assert(generate_ep(0,"03008002005715DFD766A500E68D4783E81E57-3E8D-DABF-8542-460ADBBC66A5","24614839104951215057d","1329"),["03008002005715DFD766A500E68D4783E81E57-3E8D-DABF-8542-460ADBBC66A5","cCaSG02FVccB5SfWjT8bZinicXBbXP4J9h%2BNgdJgALshT%2Bm67UilwJu2P%2FpCFowfelYCF%2BPy3tjmH0UTYfM2oRwQqz%2FaT%2Fro%2B%2FTh5alVxOF0FGtFdMumsVSfQDL4"])
	}

	{
		({"K": "1b5e0cd6a70360d9282b5cae", "ep": "eiaSG02FUswA4SvZjj8bbi7jIXQNXP4J9h+NgdJgALshT+m67UilwJu2P/pCFowfelYCF+Py3tjmH0UTYfM2oRwQqz/aT/ro+/Th5alVxOF0FGtFdMumsVSdRDP1", "oip": "1932302622", "yxon": 1, "ev": 1, "ctype": 12, "token": "3734"})
	}

	{
		console.log('his',querystring.parse("ev=1&K=87f5fe0d27970f4b282b5cb5&ctype=12&token=0924&yxon=1&oip=1932302622&ep=cyaSG02FUcoJ5ifajD8bYijhfCENXP4J9h%2BNgdJgALshT%2Bm67UilwJu2P%2FpCFowfelYCF%2BPy3tjmH0UTYfM2oRwQqz%2FaT%2Fro%2B%2FTh5alVxOF0FGtFdMumsVSeSjL1"))
		console.log('mine',querystring.parse("ctype=12&ev=1&K=fb5cd30b897d0949261ef913&ep=cSaSG02FUcoC5yfZij8bZH%2FjIHMLXP4J9h%2BNgdJhALshT%2BnNnzrSxJXFS41CFv5oBid1Y5rzrNSTY0ARYfU2qG4Q2kqtSPrni4Ti5apWzZMAFxk2AMnTxVSaRDP3&oip=1932302622&token=4736&yxon=1"))
	}
}

var extractFlvPath = exports.extractFlvPath = function(rs, stream) {
	var ep = rs.data.security.encrypt_string;
	var ip = rs.data.security.ip;
	var f_code_1 = 'becaf9be';
	let [sid, token] = E(f_code_1, atob(ep)).split('_');

	return stream.segs.map((seg, no) => {
		let [fileid, ep] = generate_ep(no, stream.stream_fileid, sid, token);
		var q = querystring.stringify({ctype:12, ev:1, K:seg.key, ep:decodeURIComponent(ep), oip:ip, token, yxon:1});
		var container = {
			mp4hd3:'flv', hd3:'flv', mp4hd2:'flv',
			hd2:'flv', mp4hd:'mp4', mp4:'mp4',
			flvhd:'flv', flv:'flv', '3gphd':'3gp',
		}[stream.stream_type];
		var url = `http://k.youku.com/player/getFlvPath/sid/${sid}_00/st/${container}/fileid/${fileid}?${q}`;
		return url;
	});
}

var parseYoukuCode = exports.parseYoukuCode = function (_id) {
  //log('开始解析youku视频地址')  
  var mk_a3 = 'b4et';
  var mk_a4 = 'boa4';
  var userCache_a1 = '4';
  var userCache_a2 = '1';
  var rs;
  var sid;
  var token;
  
  var PlayListData = function(a, b, c) {
      var d = this;
      new Date;
      this._sid = sid, this._fileType = c, this._videoSegsDic = {};
      this._ip = a.security.ip;
      var e = (new RandomProxy, []),
        f = [];
      f.streams = {}, f.logos = {}, f.typeArr = {}, f.totalTime = {};
      for (var g = 0; g < b.length; g++) {
        for (var h = b[g].audio_lang, i = !1, j = 0; j < e.length; j++)
          if (e[j] == h) {
            i = !0;
            break
          }
        i || e.push(h)
      }
      for (var g = 0; g < e.length; g++) {
        for (var k = e[g], l = {}, m = {}, n = [], j = 0; j < b.length; j++) {
          var o = b[j];
          if (k == o.audio_lang) {
						console.log('stream_type', o.stream_type)
            if (!d.isValidType(o.stream_type))
              continue;
            var p = d.convertType(o.stream_type),
              q = 0;
            "none" != o.logo && (q = 1), m[p] = q;
            var r = !1;
            for (var s in n)
              p == n[s] && (r = !0);
            r || n.push(p);
            var t = o.segs;
            if (null == t)
              continue;
            var u = [];
            r && (u = l[p]);
            for (var v = 0; v < t.length; v++) {
              var w = t[v];
              if (null == w)
                break;
              var x = {};
              x.no = v, 
              x.size = w.size, 
              x.seconds = Number(w.total_milliseconds_video) / 1e3, 
              x.milliseconds_video = Number(o.milliseconds_video) / 1e3, 
              x.key = w.key, x.fileId = this.getFileId(o.stream_fileid, v), 
              x.src = this.getVideoSrc(j, v, a, o.stream_type, x.fileId), 
              x.type = p, 
							x.height = o.height,
							x.width = o.width,
              u.push(x)
            }
            l[p] = u
          }
        }
        var y = this.langCodeToCN(k).key;
        f.logos[y] = m, f.streams[y] = l, f.typeArr[y] = n        
      }
      this._videoSegsDic = f, this._videoSegsDic.lang = this.langCodeToCN(e[0]).key
    },
    RandomProxy = function(a) {
      this._randomSeed = a, this.cg_hun()
    };
  RandomProxy.prototype = {
    cg_hun: function() {
      this._cgStr = "";
      for (var a = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ/\\:._-1234567890", b = a.length, c = 0; b > c; c++) {
        var d = parseInt(this.ran() * a.length);
        this._cgStr += a.charAt(d), a = a.split(a.charAt(d)).join("")
      }
    },
    cg_fun: function(a) {
      for (var b = a.split("*"), c = "", d = 0; d < b.length - 1; d++)
        c += this._cgStr.charAt(b[d]);
      return c
    },
    ran: function() {
      return this._randomSeed = (211 * this._randomSeed + 30031) % 65536, this._randomSeed / 65536
    }
  }, PlayListData.prototype = {
    getFileId: function(a, b) {
      if (null == a || "" == a)
        return "";
      var c = "",
        d = a.slice(0, 8),
        e = b.toString(16);
      1 == e.length && (e = "0" + e), e = e.toUpperCase();
      var f = a.slice(10, a.length);
      return c = d + e + f
    },
    isValidType: function(a) {
      return "3gphd" == a || "flv" == a || "flvhd" == a || "mp4hd" == a || "mp4hd2" == a || "mp4hd3" == a ? !0 : !1
    },
    convertType: function(a) {
      var b = a;
      switch (a) {
        case "m3u8":
          b = "mp4";
          break;
        case "3gphd":
          b = "3gphd";
          break;
        case "flv":
          b = "flv";
          break;
        case "flvhd":
          b = "flv";
          break;
        case "mp4hd":
          b = "mp4";
          break;
        case "mp4hd2":
          b = "hd2";
          break;
        case "mp4hd3":
          b = "hd3"
      }
      return b
    },
    langCodeToCN: function(a) {
      var b = "";
      switch (a) {
        case "default":
          b = {
            key: "guoyu",
            value: "国语"
          };
          break;
        case "guoyu":
          b = {
            key: "guoyu",
            value: "国语"
          };
          break;
        case "yue":
          b = {
            key: "yue",
            value: "粤语"
          };
          break;
        case "chuan":
          b = {
            key: "chuan",
            value: "川话"
          };
          break;
        case "tai":
          b = {
            key: "tai",
            value: "台湾"
          };
          break;
        case "min":
          b = {
            key: "min",
            value: "闽南"
          };
          break;
        case "en":
          b = {
            key: "en",
            value: "英语"
          };
          break;
        case "ja":
          b = {
            key: "ja",
            value: "日语"
          };
          break;
        case "kr":
          b = {
            key: "kr",
            value: "韩语"
          };
          break;
        case "in":
          b = {
            key: "in",
            value: "印度"
          };
          break;
        case "ru":
          b = {
            key: "ru",
            value: "俄语"
          };
          break;
        case "fr":
          b = {
            key: "fr",
            value: "法语"
          };
          break;
        case "de":
          b = {
            key: "de",
            value: "德语"
          };
          break;
        case "it":
          b = {
            key: "it",
            value: "意语"
          };
          break;
        case "es":
          b = {
            key: "es",
            value: "西语"
          };
          break;
        case "po":
          b = {
            key: "po",
            value: "葡语"
          };
          break;
        case "th":
          b = {
            key: "th",
            value: "泰语"
          }
      }
      return b
    },

    getVideoSrc: function(a, b, c, d, e, f, g) {
      var h = c.stream[a],
        i = c.video.encodeid;
      if (!i || !d)
        return "";
      var j = {
          flv: 0,
          flvhd: 0,
          mp4: 1,
          hd2: 2,
          "3gphd": 1,
          "3gp": 0
        },
        k = j[d],
        l = {
          flv: "flv",
          mp4: "mp4",
          hd2: "flv",
          mp4hd: "mp4",
          mp4hd2: "mp4",
          "3gphd": "mp4",
          "3gp": "flv",
          flvhd: "flv"
        },
        m = l[d],
        n = b.toString(16);
      1 == n.length && (n = "0" + n);
      var o = h.segs[b].total_milliseconds_video / 1e3,
        p = h.segs[b].key;
      ("" == p || -1 == p) && (p = h.key2 + h.key1);
      var q = "";
      c.show && (q = c.show.pay ? "&ypremium=1" : "&ymovie=1");
      var r = "/player/getFlvPath/sid/" + sid + "_" + n + "/st/" + m + "/fileid/" + e + "?K=" + p + "&hd=" + k + "&myp=0&ts=" + o + "&ypp=0" + q,
        s = [19, 1, 4, 7, 30, 14, 28, 8, 24, 17, 6, 35, 34, 16, 9, 10, 13, 22, 32, 29, 31, 21, 18, 3, 2, 23, 25, 27, 11, 20, 5, 15, 12, 0, 33, 26],
        t = encodeURIComponent(btoa(E(F(mk_a4 + "poz" + userCache_a2, s).toString(), sid + "_" + e + "_" + token)));
      return r += "&ep=" + t, r += "&ctype=12", r += "&ev=1", r += "&token=" + token, r += "&oip=" + this._ip, r += (f ? "/password/" + f : "") + (g ? g : ""), r = "http://k.youku.com" + r
    }
  };

  return jsonp('http://play.youku.com/play/get.json?vid=' + _id + '&ct=12').then(param => {
		return param;
		rs = param;
		a = param.data;
		c = E(F(mk_a3 + "o0b" + userCache_a1, [19, 1, 4, 7, 30, 14, 28, 8, 24,
				17, 6, 35, 34, 16, 9, 10, 13, 22, 32, 29, 31, 21, 18, 3, 2, 23, 25, 27, 11, 20, 5, 15, 12, 0, 33, 26
			]).toString(), atob(a.security.encrypt_string));
		c     = c.split("_");
		sid   = c[0];
		token = c[1];

		var t = new PlayListData(a, a.stream, 'mp4')
		var source = [
			['标清', t._videoSegsDic.streams['guoyu']['3gphd'][0].src]
		];

		return source;
	})
}

exports.getVideos = function (url) {
	if (window.videoId)
		return parseYoukuCode(window.videoId);
	else return fetch(url).then(res => res.text()).then(res => {
		var parser = new DOMParser();
		var doc = parser.parseFromString(res, 'text/html');
		var scripts = Array.prototype.slice.call(doc.querySelectorAll('script')).map(script => script.textContent);
		var videoId = scripts.filter(x => x.match(/var videoId =/));
		if (videoId) {
			videoId = videoId[0].match(/videoId = '(\d+)'/);
			if (videoId)
				return parseYoukuCode(videoId[1]);
		}
		throw new Error(`parse ${url} failed`);
	}).then(param => {
		console.log(param)
		var hd = param.data.stream.sort((a,b) => a.height<b.height)[0];
		return extractFlvPath(param, hd);
	})
}

