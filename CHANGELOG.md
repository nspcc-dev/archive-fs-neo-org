# Changelog

Changelog for NeoFS Archive

## [Unreleased]

## [0.0.5] - 2025-05-29

### Changed

- Migrated to the new search API provided by REST gateway 0.12.0+ (#35)

### Fixed

- Missing version number on the page (#31)

## [0.0.4] - 2025-04-01

### Updated

- Migrate to vite (#24)

### Fixed

- Reset pause state after canceling downloading (#20)
- Add modal closing for click outside in case of ending downloading (#22)
- Do not change value in end block if it is entered by user (#23)

## [0.0.3] - 2025-03-18

### Fixed

- Reset index fetching blocks in case of large start index (#15)
- Close modal window when canceling in pause mode (#16)

## [0.0.2] - 2025-02-27

### Added

- Stop & pause buttons (#8)

### Fixed

- Reverse range handling (#5)
- Allow to input valid border in case of failed getblockcount request (#7)

## [0.0.1] - 2025-02-17

First public release.


[0.0.1]: https://github.com/nspcc-dev/archive-fs-neo-org/tree/v0.0.1
[0.0.2]: https://github.com/nspcc-dev/archive-fs-neo-org/compare/v0.0.1...v0.0.2
[0.0.3]: https://github.com/nspcc-dev/archive-fs-neo-org/compare/v0.0.2...v0.0.3
[0.0.4]: https://github.com/nspcc-dev/archive-fs-neo-org/compare/v0.0.3...v0.0.4
[0.0.5]: https://github.com/nspcc-dev/archive-fs-neo-org/compare/v0.0.4...v0.0.5
[Unreleased]: https://github.com/nspcc-dev/archive-fs-neo-org/compare/v0.0.5...master
