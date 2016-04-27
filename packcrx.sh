#!/bin/bash

rm -rf mama-hd.crx mama-hd.zip
webpack -d
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --pack-extension=`pwd`/mama-hd --pack-extension-key=`pwd`/mama-hd.pem
zip mama-hd.zip -r mama-hd

