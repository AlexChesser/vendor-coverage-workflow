# gulp-dotnet-watch

dotnet-watch plugin for [Gulp](https://github.com/gulpjs/gulp) (but, not really)

## Install

```
npm install gulp-dotnet-watch --save-dev
```

## Basic Usage

```javascript
var gulp = require('gulp'),
	DotnetWatch = require('gulp-dotnet-watch');

gulp.task('watch-server', function () {
	DotnetWatch.watch('run');
});
```

## Advanced Usage

```javascript
var gulp = require('gulp'),
	DotnetWatch = require('gulp-dotnet-watch');

gulp.task('watch-server', function () {
	var watcher = new DotnetWatch({
		project: './WebFull',
		verbose:, 'true',
		options: [ 'no-launch-profile' ],
		arguments: {
			environment: 'Development',
			"server.urls": 'https://localhost:6000;http://localhost:6001'
		},
		special: {
			arguments: {
				customArg1: 'Custom Value 1'
			}
		}
	});

	watcher.watch('run', function() {
		console.log('Application has started.');
	}});
});
```

## Options

#### cwd

The `cwd` option is based through to the child process.

**Default:** `'./'`

#### project

The project to be watched.

**Default:** `null`

#### quiet

Suppresses all output except warnings and errors.

**Default:** `false`

#### verbose

Show verbose output.

**Default:** `false`

#### observe

Value will override the detection string for triggering the `loaded` function from `Application Started` to the string specified. Note that under dotnetcore 3.1 this value is `App startup configuration COMPLETE`
* value added by Alex Chesser, do not use the default version of gulp-dotnet-watch

#### options

Value options that will configure the dotnet task. For example `[ 'no-launch-profile', 'no-build' ]` would result in `--no-launch-profile --no-build`.

**Default:** `null`

#### arguments

Key/value arguments that will configure the dotnet task. For example `{ framework: 'net451', verbosity: 'm' }` would result in `--framework net451 --verbosity m`.

**Default:** `null`

#### special.options

Special value options that will be passed through to the child dotnet process. For example `[ 'custom-flag-1', 'custom-flag-2' ]` would result in `-- --custom-flag-1 --custom-flag-2`.

**Default:** `null`

#### special.arguments

Special Key/value arguments that will be passed through to the child dotnet process. For example `{ customArg1: 'Custom Value 1', customArg2: 'Custom Value 2' }` would result in `-- --customArg1 "Custom Value 1" --customArg2 "Custom Value 2"`.

**Default:** `null`

## Methods

#### DotnetWatch.watch(task [, options [, loaded]])

This static method will start a watch process for the provided `task`, and can be configured by passing an `options` object. The method will return an active watcher instance, and the `loaded` callback will be issued once the watch process has started the application. Supported `task`s include 'run' and 'test', however others may still work.

#### new DotnetWatch([options]).watch(task [, loaded])

This method will start a watch process for the provided `task`. The method will return an active watcher instance, and the `loaded` callback will be issued once the watch process has started the application.

#### new DotnetWatch([options]).kill()

This method will kill the active watch process on the watcher instance.

## Properties

#### isApplicationStarted

This property is `true` when the application is started ready to receive requests, otherwise `false`.

#### options

This property reveals the options that where used to configure the watcher.

## License

MIT