import { Module, waitInitialized } from './mod.js';

export const isError = (code) => {
	const _isError = Module['_ZSTD_isError'];
	return _isError(code);
};

const compressBound = (size) => {
	const bound = Module['_ZSTD_compressBound'];
	return bound(size);
};

export const compress = (buf, level = 1) => {
	const bound = compressBound(buf.byteLength);
	const malloc = Module["_malloc"];
	const compressed = malloc(bound);
	const src = malloc(buf.byteLength);
	Module.HEAP8.set(buf, src);
	const free = Module["_free"];
	try {
	  /*
		@See https://zstd.docsforge.com/dev/api/ZSTD_compress/
		size_t ZSTD_compress( void* dst, size_t dstCapacity, const void* src, size_t srcSize, int compressionLevel);
		Compresses `src` content as a single zstd compressed frame into already allocated `dst`.
		Hint : compression runs faster if `dstCapacity` >=  `ZSTD_compressBound(srcSize)`.
		@return : compressed size written into `dst` (<= `dstCapacity),
				  or an error code if it fails (which can be tested using ZSTD_isError()).
	  */
	  const _compress = Module["_ZSTD_compress"];
	  const sizeOrError = _compress(
		compressed,
		bound,
		src,
		buf.byteLength,
		level ?? 3
	  );
	  if (isError(sizeOrError)) {
		throw new Error(`Failed to compress with code ${sizeOrError}`);
	  }
	  // // Copy buffer
	  // // Uint8Array.prototype.slice() return copied buffer.
	  const data = new Uint8Array(
		Module.HEAPU8.buffer,
		compressed,
		sizeOrError
	  ).slice();
	  free(compressed, bound);
	  free(src, buf.byteLength);
	  return data;
	} catch (e) {
	  free(compressed, bound);
	  free(src, buf.byteLength);
	  throw e;
	}
  };
const getFrameContentSize = (src, size) => {
	const getSize = Module['_ZSTD_getFrameContentSize'];
	return getSize(src, size);
  };
  
  // export type DecompressOption = {
  //   defaultHeapSize?: number;
  // };
  
  export const decompress = (
	buf,
	opts = { defaultHeapSize: 1024 * 1024 } // Use 1MB on default if it is failed to get content size.
  ) => {
	const malloc = Module["_malloc"];
	const src = malloc(buf.byteLength);
	Module.HEAP8.set(buf, src);
	const contentSize = getFrameContentSize(src, buf.byteLength);
	const size = contentSize === -1 ? opts.defaultHeapSize : contentSize;
	const free = Module["_free"];
	const heap = malloc(size);
	try {
	  /*
		@See https://zstd.docsforge.com/dev/api/ZSTD_decompress/
		compressedSize : must be the exact size of some number of compressed and/or skippable frames.
		dstCapacity is an upper bound of originalSize to regenerate.
		If user cannot imply a maximum upper bound, it's better to use streaming mode to decompress data.
		@return: the number of bytes decompressed into dst (<= dstCapacity), or an errorCode if it fails (which can be tested using ZSTD_isError()).
	  */
	  const _decompress = Module["_ZSTD_decompress"];
	  const sizeOrError = _decompress(heap, size, src, buf.byteLength);
	  if (isError(sizeOrError)) {
		throw new Error(`Failed to compress with code ${sizeOrError}`);
	  }
	  // Copy buffer
	  // Uint8Array.prototype.slice() return copied buffer.
	  const data = new Uint8Array(
		Module.HEAPU8.buffer,
		heap,
		sizeOrError
	  ).slice();
	  free(heap, size);
	  free(src, buf.byteLength);
	  return data;
	} catch (e) {
	  free(heap, size);
	  free(src, buf.byteLength);
	  throw e;
	}
  };
await (async () => {
	const wasm_url = new URL('zstd.wasm', import.meta.url);
	let wasmCode = '';
	switch (wasm_url.protocol) {
		case 'file:':
		wasmCode = await Deno.readFile(wasm_url);
		break
		case 'https:':
		case 'http:':
		wasmCode = await (await fetch(wasm_url)).arrayBuffer();
		break
		default:
		throw new Error(`Unsupported protocol: ${wasm_url.protocol}`);
		break
	}
	Module['init'](wasmCode);
	await waitInitialized();
})();