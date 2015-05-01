var assert = require('assert');

describe('grunt-webdriverjs test', function () {

    it('checks if title contains the search query', function(done) {

        browser
            .url('http://webdriverjs.christian-bromann.com/')
            .getTitle(function(err,title) {
                assert.strictEqual(title,'WebdriverJS Testpage');
            })
            .call(done);

    });

});
