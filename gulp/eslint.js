import gulp from 'gulp'
import eslint from 'gulp-eslint'

function eslinter (cb) {
    gulp.src(['**/*.js', '!node_modules/**', '!build/**'])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError())
    cb()
}

module.exports = options => {
    let module = {}
    module.default = eslinter
    module.eslint = eslinter
    return module
}
