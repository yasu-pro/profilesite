import gulp from 'gulp';
import ejs from 'gulp-ejs';
import rename from 'gulp-rename';
import dartSass from 'gulp-dart-sass';
import autoprefixer from 'gulp-autoprefixer';
import imagemin from 'gulp-imagemin';
import mozjpeg from 'imagemin-mozjpeg';
import pngquant from 'imagemin-pngquant';
import gulpif from 'gulp-if';
import plumber from 'gulp-plumber';
import notify from 'gulp-notify';
import uglify from 'gulp-uglify';
import browserSync from 'browser-sync';
import download from 'gulp-download';
import ttf2woff2 from 'gulp-ttf2woff2';
import fs from 'fs';
import changed from 'gulp-changed';
import { deleteSync } from 'del';

const isDevelopment = process.env.NODE_ENV === 'development';
// Font指定
const fontUrl =
	'https://fonts.googleapis.com/css2?family=Lato&family=Shippori+Mincho+B1&display=swap';

const { series, parallel, watch, src, dest } = gulp;
const { reload } = browserSync;

const createResetCSSFile = () => {
	fs.writeFileSync(
		'./src/scss/base/_reset.scss',
		fs.readFileSync('./node_modules/destyle.css/destyle.css'),
	);
	return Promise.resolve();
};

const copyHtml = () => {
	return src('./src/html/**/*.html').pipe(dest('./dest'));
};

const compileEjs = () => {
	return src('./src/ejs/**/*.ejs')
		.pipe(
			plumber({ errorHandler: notify.onError('Error: <%= error.message %>') }),
		)
		.pipe(changed('./dest', { extension: '.html' }))
		.pipe(ejs())
		.pipe(rename({ extname: '.html' }))
		.pipe(dest('./dest'));
};

const compileSass = () => {
	return src('./src/scss/**/*.scss', { sourcemaps: true })
		.pipe(
			plumber({ errorHandler: notify.onError('Error: <%= error.message %>') }),
		)
		.pipe(changed('./dest/css', { extension: '.css' }))
		.pipe(
			dartSass.sync({ outputStyle: 'compressed' }).on('error', dartSass.logError),
		)
		.pipe(
			autoprefixer({
				cascade: false,
				grid: 'autoplace',
			}),
		)
		.pipe(dest('./dest/css', { sourcemaps: '.' }));
};

const minifyJs = () => {
	return src('./src/js/**/*.js', { sourcemaps: true })
		.pipe(uglify())
		.pipe(gulp.dest('./dest/js'))
		.pipe(dest('./dest/js', { sourcemaps: '.' }));
};

/*========================
// build時 mapファイル 削除
========================*/
const deleteFiles = async () => {
	try {
		await deleteSync(['./dest/css/**/*.css.map', './dest/js/**/*.js.map'], {
			force: true,
		});
		console.log('All files deleted successfully');
	} catch (err) {
		console.error(err);
	}
};

/*========================
// 画像
========================*/
const imageTask = () => {
	return (
		gulp
			.src('./src/img/**/*.{png,jpg}', { base: './src' })
			// .pipe(
			// 	gulpif(
			// 		!isDevelopment,
			// 		imagemin([mozjpeg({ quality: 80 }), pngquant({ quality: [0.8, 0.9] })]),
			// 	),
			// )
			.pipe(gulp.dest('./dest'))
			.pipe(reload({ stream: true }))
	);
};

/*========================
// Google fonts ダウンロード
========================*/
const downloadFonts = () => {
	// ダウンロードして`src/fonts`に保存
	return download(fontUrl)
		.pipe(rename('fonts.css'))
		.pipe(gulp.dest('./src/fonts'));
};

const convertFonts = () => {
	// `src/fonts`からTTFフォントを取得し、WOFF2に変換して`dest/fonts`に保存
	return gulp
		.src('./src/fonts/*.ttf')
		.pipe(ttf2woff2())
		.pipe(gulp.dest('./dest/fonts'));
};

const convertAndEmbedFonts = () => {
	// `src/fonts`からTTFフォントを取得し、Base64エンコードしてCSSに埋め込む
	const fonts = fs.readFileSync('./src/fonts/fonts.css', 'utf8');
	const regex = /url\('(.*?)'\)/g;
	let match;
	let promises = [];

	while ((match = regex.exec(fonts))) {
		const fontPath = match[1];
		const fontName = fontPath.match(/\/([^\/?#]+)[^\/]*$/)[1];

		promises.push(
			new Promise((resolve) => {
				fs.readFile(`./src/fonts/${fontName}`, (err, data) => {
					if (err) throw err;
					const base64Data = data.toString('base64');
					fs.writeFile(`./src/fonts/${fontName}.txt`, base64Data, () => {
						resolve();
					});
				});
			}),
		);
	}

	return Promise.all(promises);
};

/*========================
// Watch
========================*/
const watchFiles = () => {
	watch('./src/ejs/**/*.ejs', { ignoreInitial: false }, compileEjs).on(
		'change',
		reload,
	);
	watch('./src/scss/**/*.scss', { ignoreInitial: false }, compileSass).on(
		'change',
		reload,
	);
	watch('./src/js/**/*.js', { ignoreInitial: false }, minifyJs).on(
		'change',
		reload,
	);
	watch('./src/html/**/*.html', { ignoreInitial: false }, copyHtml).on(
		'change',
		reload,
	);
	watch(
		'./src/img/**/*.{png,jpg}',
		{ events: ['add', 'change'], ignoreInitial: false },
		imageTask,
	).on('change', reload);

	browserSync.init({
		server: {
			baseDir: './dest',
		},
	});
};

// 開発用のタスク
export const dev = series(
	createResetCSSFile,
	parallel(
		compileEjs,
		compileSass,
		downloadFonts,
		convertFonts,
		convertAndEmbedFonts,
		imageTask,
	),
	watchFiles,
);

// ビルド用のタスク
export const build = series(parallel(minifyJs), deleteFiles);

export default dev;
