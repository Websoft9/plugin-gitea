#!/bin/bash
cd /data/plugin-cockpit/plugin-gitea/build
yarn build
while [ ! -d "/usr/share/cockpit/gitea" ]; do
  sleep 1
done
cp -r ./* /usr/share/cockpit/gitea/