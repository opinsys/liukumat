export PATH := node_modules/.bin:$(PATH)

all: npm js

npm:
	npm i

js:
	browserify index.js > bundle.js

js-watch:
	watchify --debug index.js -o bundle.js

deploy: js
	git commit -m "Commit assets" bundle.js || true
	git push origin master:gh-pages -f

server:
	node_modules/.bin/live-server
