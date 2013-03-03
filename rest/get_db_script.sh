#!/bin/sh

exec mysqldump --skip-comments --no-data -p test | grep -v '^/\*.*SET' | grep -ve '^\s*$' > init.sql
