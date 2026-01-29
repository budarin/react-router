#!/bin/sh

set -e;

pnpm up --latest -i;

# DESIRED_VERSION="1.13.3";
# CURRENT_VERSION=$(node -p "require('./package.json').dependencies['mapbox-gl']");

# if [ "$CURRENT_VERSION" != "$DESIRED_VERSION" ]; then
#   echo " ";
#   echo "Установка mapbox-gl@$DESIRED_VERSION ...";
#   pnpm add mapbox-gl@$DESIRED_VERSION;
# fi

echo " ";
echo "Дедупликация пакетов ...";
pnpm dedupe;
echo " ";
