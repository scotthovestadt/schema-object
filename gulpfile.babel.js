const gulp = require('gulp');
const _gulp = require('load-plugins')('gulp-*');
const argv = require('minimist')(process.argv.slice(2));

gulp.task('test-node', ['build'], () => {
  return gulp.src('test/tests.js', { read: false })
    .pipe(_gulp.mocha({
      reporter: 'spec',
      grep: argv.grep
    }));
});

gulp.task('test-browser', ['build'], () => {
  return gulp.src('test/browser.html')
    .pipe(_gulp.mochaPhantomjs({
      reporter: 'spec',
      mocha: {
        grep: argv.grep
      },
      phantomjs: {
        useColors: true
      }
    }));
});

gulp.task('build', () => {
  return gulp.src('lib/*.js')
    .pipe(_gulp.babel())
    .pipe(gulp.dest('dist'));
});

gulp.task('default', ['build']);