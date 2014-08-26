#!/bin/sh

SELF=${BASH_SOURCE[0]}

if [ -h $SELF ]; then
    SELF=`readlink "$SELF"`
fi

SELFDIR=`dirname "$SELF"`
SCRIPT="$SELFDIR"/build.js

node $SCRIPT $1 $2