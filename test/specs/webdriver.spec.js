import assert from 'assert'

describe('gulp-webdriverjs test', () => {
    it('should have right options', () => {
        assert.strictEqual(browser.config.waitforTimeout, 12345)
        assert.strictEqual(browser.config.coloredLogs, true)
        assert.strictEqual(browser.config.logLevel, 'info')
        assert.strictEqual(browser.config.cucumberOpts.require, 'nothing')
    })

    it('checks if title contains the search query', () => {
        browser.url('/')
        var title = browser.getTitle()
        assert.strictEqual(title, 'WebdriverIO · Next-gen WebDriver test framework for Node.js')
    })
})
