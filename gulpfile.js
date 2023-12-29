import gulp from 'gulp';
import ejs from 'gulp-ejs';
import rename from 'gulp-rename';
import dartSass from 'gulp-dart-sass';
import autoprefixer from 'gulp-autoprefixer';
import plumber from 'gulp-plumber';
import notify from 'gulp-notify';
import uglify from 'gulp-uglify';
import browserSync from 'browser-sync';
import fs from 'fs';

const { series, parallel, watch, src, dest } = gulp;
const { reload } = browserSync;

const createResetCSSFile = () => {
	fs.writeFileSync(
		'./src/scss/base/_reset.scss',
		fs.readFileSync('./node_modules/reset-css/reset.css'),
	);
	return Promise.resolve();
};

// const resetCSSFile = () => {
// 	return src('./src/scss/_reset.scss').pipe(dest('./dest/css'));
// };

const copyHtml = () => {
	return src('./src/html/**/*.html').pipe(dest('./dest'));
};

const compileEjs = () => {
	return src('./src/ejs/**/*.ejs')
		.pipe(
			plumber({ errorHandler: notify.onError('Error: <%= error.message %>') }),
		)
		.pipe(ejs())
		.pipe(rename({ extname: '.html' }))
		.pipe(dest('./dest'));
};

const compileSass = () => {
	return src('./src/scss/**/*.scss', { sourcemaps: true })
		.pipe(
			plumber({ errorHandler: notify.onError('Error: <%= error.message %>') }),
		)
		.pipe(
			dartSass.sync({ outputStyle: 'compressed' }).on('error', dartSass.logError),
		)
		.pipe(
			autoprefixer({
				cascade: false,
			}),
		)
		.pipe(dest('./dest/css', { sourcemaps: '.' }));
};

const minifyJs = () => {
	return src('./src/js/*.js', { sourcemaps: true })
		.pipe(uglify())
		.pipe(dest('./dest/js', { sourcemaps: '.' }));
};

const watchFiles = () => {
	watch('./src/ejs/**/*.ejs', { ignoreInitial: false }, compileEjs).on(
		'change',
		reload,
	);
	watch('./src/scss/**/*.scss', { ignoreInitial: false }, compileSass).on(
		'change',
		reload,
	);
	watch('./src/js/*.js', { ignoreInitial: false }, minifyJs).on(
		'change',
		reload,
	);
	watch('./src/html/**/*.html', { ignoreInitial: false }, copyHtml).on(
		'change',
		reload,
	);

	browserSync.init({
		server: {
			baseDir: './dest',
		},
	});
};

const deleteFiles = async (cb) => {
	const filesToDelete = ['./dest/css/style.css.map', './dest/js/script.js.map'];

	let deletedCount = 0;

	filesToDelete.forEach((filePath) => {
		fs.unlink(filePath, (err) => {
			if (err) {
				console.error(err);
			} else {
				console.log(`Deleted file: ${filePath}`);
				deletedCount++;
				if (deletedCount === filesToDelete.length) {
					console.log('All files deleted successfully');
					cb();
				}
			}
		});
	});
};

// 開発用のタスク
export const dev = series(
	createResetCSSFile,
	parallel(compileEjs, compileSass),
	watchFiles,
);

// ビルド用のタスク
export const build = series(
	createResetCSSFile,
	deleteFiles,
	parallel(compileEjs, compileSass, minifyJs),
);

export default dev;
