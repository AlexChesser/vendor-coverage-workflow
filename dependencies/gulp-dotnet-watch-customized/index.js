'use strict';

const assign = require('object-assign')
	, chalk = require('chalk')
	, spawn = require('child_process').spawn;

const ServiceName = 'dotnet-watch';

const Defaults = {
	cwd: './',
	project: null, // [-p | --project <PROJECT>]; The project to watch
	quiet: false, // [-q | --quiet]; Suppresses all output except warnings and errors
	verbose: false, // [-v | --verbose]; Show verbose output
	observe: "Application Started", // a value representing the string to listen for in order to execute the loaded callback
	options: null, // [<arg>...]; Value options that will configure the dotnet task. ie. [ 'no-launch-profile', 'no-build' ]
	arguments: null, // [<arg>...]; Key/value arguments that will configure the dotnet task. ie. { framework: 'net451', verbosity: 'm' }
	special: {
		options: null, // [-- <arg>...]; Special value options that will be passed through to the child dotnet process. ie. [ 'verbose', 'no-build' ]
		arguments: null // [-- <arg>...]; Special key/value arguments that will be passed through to the child process. ie. { customArg1: 'Custom Value 1' }
	}
};

const LogLevels = {
	info: 1,
	warning: 2,
	error: 3
};

const Log = (logLevel, msg, quiet = false) => {
	if (!quiet || logLevel > LogLevels.info) {
		msg = msg.toString().trim();

		if (msg.length > 0) {
			let color = logLevel === LogLevels.error
				? chalk.red
				: logLevel === LogLevels.warning
					? chalk.yellow
					: chalk.blue;

			console.log(`[${color(ServiceName)}] ${msg}`);
		}
	}
}

const BuildCommand = (task, config, opts, args, specOpts, specArgs) => {
	let output = ['watch'];

	// @dotnet watch: <quiet> configures watch
	if (config.queit) {
		output.push('--queiet');
	}

	// @dotnet watch: <verbose> configures watch
	if (config.verbose) {
		output.push('--verbose');
	}

	// @dotnet watch: <project> configures watch
	if (config.project !== null) {
		output.push('--project', config.project);
	}

	output.push(task);

	if (opts !==null) {
		for (let opt of opts) {
			output.push('--' + opt);
		}
	}

	for (let arg in args) {
		output.push('--' + arg, args[arg]);
	}

	//@dotnet run || @dotnet test: following <options> and <arguments> configures the child process of run or test
	if (specOpts !== null && specOpts.length > 0 || specArgs !== null && Object.keys(specArgs).length > 0) {
		output.push('--');
	}

	if (specOpts !==null) {
		for (let opt of specOpts) {
			output.push('--' + opt);
		}
	}

	for (let arg in specArgs) {
		output.push('--' + arg, specArgs[arg]);
	}

	return output;
}

class DotnetWatch {

	static watch(task, options, loaded) {
		return new DotnetWatch(options).watch(task, loaded);
	}

	constructor(options) {
		this.options = assign({}, Defaults, options);
		this.isApplicationStarted = false;
	}

	watch(task, loaded) {
		if (this._child) {
			Log(LogLevels.warn, 'Already watching', this.options.quiet);
		}
		else {
			if (!this._child) {
				process.on('exit', () => this.kill());
			}
			let args = BuildCommand(task, this.options, this.options.options, this.options.arguments, this.options.special.options, this.options.special.arguments);
			this._child = spawn('dotnet', args, {
				cwd: this.options.cwd
			});

			this._child.stdout.on('data', (data) => {
				Log(LogLevels.info, data);
				if (data.indexOf(this.options.observe) > -1) {
					this.isApplicationStarted = true;
					if (loaded) {
						loaded();
					}
				}
				else if (data.indexOf('Running dotnet with the following arguments') > -1) {
					this.isApplicationStarted = false;
				}
			});

			this._child.stderr.on('data', (data) => {
				this.isApplicationStarted = false;
				Log(LogLevels.error, data);
			});

			this._child.on('close', () => {
				this.isApplicationStarted = false;
			});

			this._child.on('error', (error) => {
				this.isApplicationStarted = false;
				Log(LogLevels.error, error.stack);
			});
		}

		return this;
	}

	kill() {
		if (this._child) {
			this.isApplicationStarted = false;
			this._child.kill();
		}

		return this;
	}
}

module.exports = DotnetWatch;