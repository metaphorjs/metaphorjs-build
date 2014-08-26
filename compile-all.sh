#!/bin/sh

SELF=${BASH_SOURCE[0]}

if [ -h $SELF ]; then
    SELF=`readlink "$SELF"`
fi

SELFDIR=`dirname "$SELF"`
SCRIPT="$SELFDIR"/compile-all.js

node $SCRIPT