# 妈妈再也不用担心我的 MacBook 发热了计划之 1080P

```
> 妈妈计划用于解决在看视频网站时 MacBook 发热严重的问题。使用video来替换原来的flash播放器。
```

本插件支持在 Chrome 里用原生 video 标签播放 Bilibili/土豆/优酷 的 1080P 视频，不发热！

![](https://raw.githubusercontent.com/nareix/mama-hd/master/screenshot.png)

# 安装使用

下载crx文件（点击 Chrome 右上角选择设置->扩展程序->把刚下载的crx文件拖拽进去）

打开一个视频页面，点击右上角的 ![](https://raw.githubusercontent.com/nareix/mama-hd/master/mama-hd/icon48.png) 图标就可以播放了

播放器 <kbd>⌘+Enter</kbd>全屏 <kbd>↑↓</kbd>音量 <kbd>←→</kbd>快进快退

# 技术原理

自从用了妈妈计划幸福感提升了很多，可惜不支持 1080P，这是因为国内的大多数视频网站对于 1080P 的片源仍然采用分段 flv 来存放，默认方法没法播放。偶尔忍不住高清诱惑打开 flash 看一会儿，MacBook 又开始发热了！Bilibili 都被人 fuck 了无数次了，能不能改改？人家百度盘用的也是 flash 但就不发热！还有土豆的弹幕打开何止是发热，简直要冒烟！妈妈又要担心了！

有一天妈妈突然告诉我：w3c 标准里面有一个东西叫做 Media Source Extensions，已经被 Chrome 支持了，它能播放 fmp4（Fragmented MP4），这种 mp4 可以随意取一个片段播放，不需要全局的索引信息，dash.js 就是基于它做的视频直播。而 Chrome 里也有速度很快的二进制操作（Uint8Array，底层是零拷贝），所以只要把 flv 在浏览器里面实时转换成 fmp4 就可以了。

经过实测，平均转码 10s 的视频只需要 20ms 左右（i5 2.9G），CPU 占用与播放相比可以忽略。

**注意**：低于 1080P 的视频推荐使用原版妈妈计划

# 特性

- [x] 支持 Bilibili
- [x] 支持土豆/优酷
- [x] 快速启动（不等待全部 flv metadata 加载完毕，只加载完第一段就开始播放）
- [x] 优化进度条拖动
- [ ] 支持 mp4demux（少量 B 站视频和搜狐视频是分段 mp4）
- [ ] 支持视频下载
- [ ] 支持 Bilibili 弹幕
- [ ] 支持土豆弹幕
- [ ] 优化转码速度

# 感谢

妈妈计划（等测试稳定了求合并到主分支）

you-get

mux.js
