# @soroslo/cli

Operator CLI package for SoroSLO.

The v0.1 repository keeps the CLI surface intentionally minimal while the API, runner, dashboard, configuration, persistence, and Stellar probe layers provide the operational product.

The next contributor-ready CLI milestone is tracked in [issue #8](https://github.com/SoroSLO/soroslo/issues/8): config validation plus one-shot check execution. Contributors should use the existing package APIs rather than duplicating probe/configuration logic in the CLI.
