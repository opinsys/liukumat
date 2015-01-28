export PATH := node_modules/.bin:$(PATH)

all: npm js

npm:
	npm i

js:
	browserify index.js > bundle.js

js-watch:
	watchify --debug index.js -o bundle.js

deploy: js
	git commit -f -m "Commit assets" bundle.js
	git push origin master:gh-pages -f
