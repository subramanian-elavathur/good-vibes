Scripts used by the test suite. Each one registers tests with good-vibes and
calls `run()`, which exits the process, so the tests in `test/*.test.mts`
execute every fixture in a child process and assert on its exit code, output
and any files it writes.

Options for `run()` can be passed as JSON in the `GOOD_VIBES_OPTIONS`
environment variable.
