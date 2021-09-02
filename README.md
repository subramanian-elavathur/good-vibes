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
// defined in ./code.test.js
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

## Lets now explain what the above code does

### `test`

The `test` function allows you to define a test. It has the following signature:

```javascript
test("name", testFunction, "groupName");
```

#### `name`

Name of your test

#### `testFunction`

Expects a function with the following signature:

```javascript
const testFunction = (verify, log) => {
  // run your code
  // make assertions using verify.check(expected, actual)
  // mark test as complete using verify.done()
};
```

##### `verify`

A simple assertion framework that provides the following api's:

1. `check(expected, actual)`: uses [lodash.isEqual](https://lodash.com/docs/#isEqual) to perform deep equality checks on primitives and objects and more
2. `done()`: marks test as complete
3. `snapshot(name, actual)`: allows for snapshot testing, discussed later in this guide

##### `log(message)`

log provides a simple wrapper over `console.log` with the test name prefixed to your message to make them easier to find in the logs

#### `groupName`

Allows you to create a group of tests. More on this below. If not specified the test is assiged to the `Default` group.

## Asynchronous Testing

All tests defined using `test` are considered to be asynchronous function. This is the reason you need to tell good-vibes that your test is complete by calling the `verify.done()` api.

Here is an example of an asynchronous test

```javascript
// defined in ./async.test.js
import { test, run } from "good-vibes";

const sayGreeting = async (message) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(`Hello, ${message}`), 2000); // resolve value after 2 seconds
  });
};

test("Async Test", async (verify) => {
  // note the async declaration
  const actual = await sayGreeting("World!"); // waiting for result
  verify.check("Hello, World!", actual);
  verify.done(); // mark test as complete
});

run(); // runs all your tests defined using the `test` api
```

## Grouping tests

The `test` api supports `groupName` as the third argument which allows you to groups similar tests together. Groups have the following features:

1. Groups always run sequentially one after the other
   1. All tests inside the group must finish before next group starts
   2. Tests inside a group run concurrently (unless `sync` is called)
2. Groups can have setup and teardown code defined using `before` and `after` api

### Example

```javascript
import { before, test, after, run } from "good-vibes";

const MY_GROUP = "My Group";

let numbers;
let strings;

before((done, log) => {
  numbers = [1, 2, 3, 4, 5];
  setTimeout(() => {
    strings = ["this", "value", "is", "set", "after", "2", "seconds"];
    done(); // dont forget to call done
  }, 2000);
}, MY_GROUP);

test(
  "My Test",
  (v) => {
    v.check(5, numbers.length)
      .check("1,2,3,4,5", numbers.join(","))
      .check(7, strings.length)
      .check("this value is set after 2 seconds", strings.join(" "))
      .done();
  },
  MY_GROUP
);

after((done, log) => {
  numbers = undefined;
  strings = undefined;
  done();
}, MY_GROUP); // group name is important so dont forget it :)

run();
```

### `before`

`before` function runs once before all tests and has the following signature

```javascript
before(beforeFunction, groupName); // groupName defaults to 'Default' group
```

#### beforeFunction

`beforeFunction` has the following signature

```javascript
const beforeFunction = async (done, log) => {
  // perform your test setup here
  // call done() once complete
};
```

### `after`

`after` function runs once before after tests and has the same signature as `before`

### Concise Groups

It can sometimes be verbose to have to specify the group name in each of `before`, `after` and `test` api calls. To make this easier good-vibes provides the `group` api which wraps all api's with the specified group name.

Lets rewrite the above example now using the `group` api.

```javascript
import { group } from "good-vibes";

const MY_GROUP = "My Group";

const { before, test, after } = group(MY_GROUP); // wrap good-vibes api's with MY_GROUP groupName

let numbers;
let strings;

before((done, log) => {
  numbers = [1, 2, 3, 4, 5];
  setTimeout(() => {
    strings = ["this", "value", "is", "set", "after", "2", "seconds"];
    done();
  }, 2000);
});

test("My Test", (v) => {
  v.check(5, numbers.length)
    .check("1,2,3,4,5", numbers.join(","))
    .check(7, strings.length)
    .check("this value is set after 2 seconds", strings.join(" "))
    .done();
});

after((done, log) => {
  numbers = undefined;
  strings = undefined;
  done();
});

run();
```

## Snapshot Testing

Sometimes the output of a function can be very large - making it cumbersome to test using the `verify.check` api. To help with this good-vibes supports snapshot testing.

Snapshot tests allow you test for changes in the expected output. They do this by maintaining a `baseline` file with the expected output. Then whenever you run your test the actual output is compared against this baseline file and if they don't match the differences are reported as shown below:

### Creating a baseline (or updating existing baseline)

### Snapshots directory structure

### Running your test

## Synchronous Testing

## Timeout

## Debugging

## Code Coverage

## Examples

- Simple tests can be found in [test/simple.test.js](./test/simple.test.js)
- Test grouping with use of `before` and `after` can be found in [test/groups.test.js](./test/groups.test.js)
- Exmaple of `snapshot` tests can be found in [test/snapshot.test.js](./test/snapshot.test.js)
- A concise example of groups using the `group` api can be found in [test/concise-groups.test.js](./test/concise-groups.test.js)
- Examples of `sync` tests can be found in [test/synchronous.test.js](./test/synchronous.test.js)
- Examples of failing tests can be found in [test/failing.test.js](./test/failing.test.js)
- Example of how `debug` mode works can be found in [test/debug.test.js](./test/debug.test.js)
