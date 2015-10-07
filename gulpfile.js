var gulp = require('gulp');
var _gulp = require('load-plugins')('gulp-*');

gulp.task('test', ['build'], function() {
  return gulp.src('test/tests.js', { read: false })
    .pipe(_gulp.mocha({reporter: 'spec'}));
});

gulp.task('build', function() {
  return gulp.src('lib/*.js')
    .pipe(_gulp.babel())
    .pipe(gulp.dest('dist'));
});

gulp.task('default', ['build']);