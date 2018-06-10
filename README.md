[![Build Status](https://travis-ci.org/levp/try-with.svg?branch=master)](https://travis-ci.org/levp/try-with)

# try-with

**A utility for safe and convenient handling of managed resources in JavasScript.**

The purpose of this utility is to provide a convenient and safe way of using resources that must be manually released, such as remote connections and file handlers.  

Similar concepts:
* [try-with-resource](https://docs.oracle.com/javase/tutorial/essential/exceptions/tryResourceClose.html) in Java
* [using statement](https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/using-statement) in C#. 

## Installing

npm: `npm i try-with`  
yarn: `yarn add try-with`

## Example

A potential resource leak due to stream not being closed:

```js
const stream = fs.createWriteStream(filePath);
// Next line will throw if `data` is not one of the allowed types.
stream.write(data);
// Will never be called if previous line threw and someone caught the error.
stream.close();
```

A safe variant of the above code:

```js
const stream = fs.createWriteStream(filePath);
try {
  stream.write(data);
} finally {
  stream.close();
}
```

Functionally equivalent to the code above but using `try-with`:

```js
const tryWith = require('try-with');

tryWith(fs.createWriteStream(filePath), stream => {
  stream.write(data);
});
```

## API

`tryWith(object, action, [cleanupMethodOrName])`

1. Invokes `action`, passing `object` to it as a parameter.
2. After action is finished try to perform cleanup:  
	1. If third argument was omitted:  
		1. If `dispose` property exists on `object`, try to invoke it.  
		2. Else if `close` property exists on `object`, try to invoke it.  
	2. Else If third argument was provided and is a function, invoke it and pass `object` to it as a paramter.
	3. Else (third argument was provided but is not a function):
		1. If it is a string or a symbol, try to invoke a property with that key on `object`.
		2. Else convert third argument to string and try to invoke a property with that key on `object`.
3. If an error was thrown when `action` was invoked, rethrow it.

## Building and Testing

`npm run build` or `npm run watch` to compile TypeScript.  
`npm test` to run tests, make sure to compile before doing so.

## License
ISC
