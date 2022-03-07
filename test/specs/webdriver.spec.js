describe('gulp-webdriverjs test', () => {
    it('should have right options', () => {
        expect(browser.config.waitforTimeout).toBe(12345)
        expect(browser.config.logLevel).toBe('info')
    })

    it('checks if title contains the search query', () => {
        browser.url('/')
        expect(browser).toHaveTitle('WebdriverIO · Next-gen browser and mobile automation test framework for Node.js | WebdriverIO')
    })
})
