# good-vibes

Good Vibes is a simple Node.js testing library designed to make writing and executing tests easy and fun.

It was inspired by, and written primarily while listening to, [Alicia Keys' Tiny Desk Concert](https://www.youtube.com/watch?v=uwUt1fVLb3E)

## Installation

```bash
$ npm install good-vibes --save-dev
```

## Getting started

Lets say you wanted to test the following function defined in `code.js`

```javascript
// defined in ./code.js
const codeToTest = (firstName, lastName, age) => {
    return {
        name: {
            first: firstName,
            last: lastName,
        },
        age: age
    }
}
export codeToTest;
// use the following if you use commonjs style exports
// exports.codeToTest = codeToTest
```

Here is how you would write a test using good-vibes for this function

```javascript
import { codeToTest } from "./code";
import { test, run } from "good-vibes";
// alternatively `const { test, run } = require('good-vibes');

test("My first test", (verify, log) => {
  const expected = {
    name: { first: "Hello", last: "World" },
    age: 999,
  };
  log("Lets do this!");
  verify.check(expected, codeToTest("Hello", "World", 999));
  verify.done();
});

run(); // runs all your tests defined using the `test` api
```

Lets explain what the above code does

The `test` function allows you to define a test. It has the following signature:

```javascript
test("name", testFunction, "groupName");
```

`name` is the name of your test.

`testFunction` expects a function with the following signature:

```javascript
const testFunction = (verify, log) => {
  // run your code
  // make assertions using verify.check(expected, actual)
  // mark test as complete using verify.done()
};
```

`verify` is a simple assertion framework that provides the following api's:

1. `check(expected, actual)`: uses [lodash.isEqual](https://lodash.com/docs/#isEqual) to perform deep equality checks on primitives and objects and more
2. `done()`: marks test as complete
3. `snapshot(name, actual)`: allows for snapshot testing, discussed later in this guide

`log(message)` provides a simple wrapper over `console.log` with the test name prefixed to your message to make them easier to find in the logs

`groupName` allows you to create a group of tests. More on this below. If not specified the test is assiged to the `Default` group.

## Examples

- Simple tests can be found in [test/simple.test.js](./test/simple.test.js)
- Test grouping with use of `before` and `after` can be found in [test/groups.test.js](./test/groups.test.js)
- Exmaple of `snapshot` tests can be found in [test/snapshot.test.js](./test/snapshot.test.js)
- A concise example of groups using the `group` api can be found in [test/concise-groups.test.js](./test/concise-groups.test.js)
- Examples of `sync` tests can be found in [test/synchronous.test.js](./test/synchronous.test.js)
- Examples of failing tests can be found in [test/failing.test.js](./test/failing.test.js)
- Example of how `debug` mode works can be found in [test/debug.test.js](./test/debug.test.js)
