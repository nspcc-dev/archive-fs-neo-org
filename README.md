<p align="center">
<img src="./.github/logo.svg" width="500px" alt="NeoFS">
</p>
<p align="center">
  <a href="https://fs.neo.org">NeoFS</a> is a decentralized distributed object storage integrated with the <a href="https://neo.org">Neo Blockchain</a>.
</p>

---
![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/nspcc-dev/archive-fs-neo-org?sort=semver)
![License](https://img.shields.io/github/license/nspcc-dev/archive-fs-neo-org.svg?style=popout)

# Overview

Archive.NeoFS – Offline Synchronization Package. Download an offline block dump up to a certain block height. This web application is built on the React framework.

# Requirements

- docker
- make
- node (`14+`)

# Make instructions

* Compile the build using `make` (will be generated in `archive-fs-neo-org` dir)
* Start app using `make start PORT=3000` (PORT=3000 by default)
* Clean up cache directories using `make clean`
* Get release directory with tar.gz using `make release`

# License

- [GNU General Public License v3.0](LICENSE)
