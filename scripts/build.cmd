@echo off
@rmdir /Q/S dist
set NODE_ENV=production
babel src/lib --out-dir dist --copy-files --ignore __tests__,spec.js,test.js,__snapshots__
