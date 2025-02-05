import {Module} from './lib.js';

const initialized = (() =>
	new Promise((resolve) => {
		Module.onRuntimeInitialized = resolve;
	})
)();

export const waitInitialized = async () => {
  await initialized;
};

export { Module };