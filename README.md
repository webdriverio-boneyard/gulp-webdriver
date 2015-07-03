gulp-webdriver [![Build Status](https://travis-ci.org/webdriverio/gulp-webdriver.svg?branch=master)](https://travis-ci.org/webdriverio/gulp-webdriver)
==============

> gulp-webdriver is a gulp plugin to run Selenium tests with Mocha and [WebdriverIO](http://webdriver.io)

## Install

```shell
npm install gulp-webdriver --save-dev
```

## Usage

You can run WebdriverIO locally running this simple task:

```js
gulp.task('test:local', function() {
    return gulp.src('test/*.js', {
        read: false
    }).pipe(webdriver({
        desiredCapabilities: {
            browserName: 'chrome'
        }
    }));
});
```

If you pass some additional attributes (`host`, `port`, `user` and `key`) you can run your test in any
cloud service you want to gain access to even more browser and devices. The following example shows
how to run tests on [Sauce Labs](https://saucelabs.com/):

```js
gulp.task('test:chrome_ci', function() {
    return gulp.src('test/*.js', {
        read: false
    }).pipe(webdriver({
        updateSauceJob: true,
        user: process.env.SAUCE_USERNAME,
        key: process.env.SAUCE_ACCESS_KEY,
        host: 'ondemand.saucelabs.com',
        port: 80,
        desiredCapabilities: {
            browserName: 'chrome',
            platform: 'Windows 8',
            version: '31',
        }
    }));
});
```

gulp-webdriver automatically detects if a `tunnel-identifier` is defined and starts a Sauce Tunnel for
you.

### Options

All options get passed into the WebdriverIO `remote` function. So this is the place where
you can define your driver instance. You'll find more informations about all WebdriverIO
options [here](https://github.com/webdriverio/webdriverio#options). Also you have to define
all Mocha and selenium-standalone options here. The following are supported:

#### bail
Type: `Boolean`<br>
Default: *false*<br>

If true you are only interested in the first execption

#### ui
Type: `String`<br>
Default: *bdd*<br>
Options: *bdd* | *tdd* | *qunit* | *exports*

Specify the interface to use.

#### reporter
Type: `String`<br>
Default: *spec*<br>
Options: *Base* | *Dot* | *Doc* | *TAP* | *JSON* | *HTML* | *List* | *Min* | *Spec* | *Nyan* | *XUnit* | *Markdown* | *Progress* | *Landing* | *JSONCov* | *HTMLCov* | *JSONStream*

Allows you to specify the reporter that will be used.

#### slow
Type: `Number`<br>
Default: *75*

Specify the "slow" test threshold, defaulting to 75ms. Mocha uses this to highlight test-cases that are taking too long.

#### timeout
Type: `Number`<br>
Default: *1000000*

Specifies the test-case timeout.

#### grep
Type: `String`

When specified will trigger mocha to only run tests matching the given pattern which is internally compiled to a `RegExp`.

#### updateSauceJob
Type: `Boolean`<br>
Default: *false*

If true it will automatically update the current job and does publish it.

#### quiet
Type: `Boolean`
Default: *false*

If true it prevents the original process.stdout.write from executing - no output at all

#### nospawn
Type: `Boolean`<br>
Default: *false*

If true it will not spawn a new selenium server process (useful if you use Sauce Labs without Sauce Tunnel)

#### seleniumOptions
Type: `Object`<br>
Default: `{}`

Options for starting the Selenium server. For more information check out the [selenium-standalone](https://github.com/vvo/selenium-standalone#seleniumstartopts-cb) project.

#### seleniumInstallOptions
Type: `Object`<br>
Default: `{}`

Options for installing Selenium dependencies. For more information check out the [selenium-standalone](https://github.com/vvo/selenium-standalone#seleniuminstallopts-cb) project.


## Contributing
Please fork, add specs, and send pull requests! In lieu of a formal styleguide, take care to
maintain the existing coding style.

## Release History
* 2015-06-22   v0.1.0   first release
* 2015-06-22   v0.1.1   fixed package.json
