var assert = require('assert');

describe('grunt-webdriverjs test', function () {

    it('should have right options', function() {
        assert.strictEqual(browser.options.waitforTimeout, 12345);
        assert.strictEqual(browser.options.coloredLogs, true);
        assert.strictEqual(browser.options.updateJob, true);
        assert.strictEqual(browser.options.logLevel, 'command');
        assert.strictEqual(browser.options.cucumberOpts.require[0], 'nothing');
    });

    it('checks if title contains the search query', function() {
        return browser
            .url('/')
            .getTitle(function(err,title) {
                assert.strictEqual(title, 'WebdriverJS Testpage');
            });
    });
});