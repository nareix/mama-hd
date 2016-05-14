# 妈妈再也不用担心我的 MacBook 发热了计划之 1080P

『[妈妈计划](https://github.com/zythum/mama2/)』用于解决在看视频网站时 MacBook 发(guang)热(gao)严(tai)重(duo)的问题，使用 video 来替换原来的 flash 播放器（对 Windows 下的 Flash 也有用）

本分支计划实现了用原生 video 实时转码播放 Bilibili/土豆/优酷 的 1080P flv 格式视频：

![](https://raw.githubusercontent.com/nareix/mama-hd/master/screenshot.png)

# 使用

[Chrome 商店](https://chrome.google.com/webstore/detail/mama-hd/hoihfdmeofbkbbjpieicemdhmjgfdihm?hl=zh-CN&gl=ID)

要求 Chrome 版本大于 48

打开一个视频页面，点击右上角的图标就可以播放了

 <kbd>⌘ + Enter</kbd> 全屏 / <kbd>↑ ↓</kbd> 音量 / <kbd>← →</kbd> 快进快退 / <kbd>M</kbd> 静音 / <kbd>Space</kbd> 暂停 / <kbd>D</kbd> 打开弹幕

非 Flv 视频建议使用[妈妈计划](https://github.com/zythum/mama2/)

# 原理

自从用了妈妈计划幸福感提升了很多，可惜不支持 1080P，这是因为国内的大多数视频网站对于 1080P 的片源仍然采用分段 flv 来存放，默认方法没法播放。偶尔忍不住高清诱惑打开 flash 看一会儿，MacBook 又开始发热了！Bilibili 都被人 FUCK 了无数次了，官方能不能改改？妈妈又开始担心了！

妈妈说：w3c 标准里面有一个东西叫做 Media Source Extensions，已经被 Chrome 支持了，它能播放 fmp4（Fragmented MP4），这种 mp4 可以随意取一个片段播放，不需要全局的索引信息，dash.js 就是基于它做的视频直播。而 Chrome 里也有速度很快的二进制操作（Uint8Array，底层是零拷贝），所以只要把 flv 在浏览器里面实时转换成 fmp4 就可以了。

**经过实测，平均转码 10s 的视频只需要 20~40ms 左右（i5 2.9G），CPU 占用与播放相比可以忽略。**

弹幕用 canvas + css transition 实现，CPU 占用同样很低。

# 特性

- [x] 支持 Bilibili
- [x] 支持土豆/优酷
- [x] 快速启动（不等待全部 flv metadata 加载完毕，只加载完第一段就开始播放）
- [x] 优化进度条拖动
- [ ] 支持 mp4demux（少量 B 站视频和搜狐视频是分段 mp4）
- [ ] 支持视频下载
- [x] 支持 Bilibili 弹幕
- [x] 支持土豆弹幕
- [ ] 优化转码速度

# ChangeLog

0.91

修复了各种播放不能/卡死的 BUG，实现了弹幕

# 感谢

妈妈计划（等测试稳定了求合并到主分支）

you-get

mux.js

[Vczh]粉丝群 [咸鱼]Square 的建议

@zsxsoft 的建议以及弹幕实现（https://github.com/zsxsoft/danmu-client）

@jamesliu96 的弹幕实现（https://github.com/jamesliu96/Damoo）

## License

MIT