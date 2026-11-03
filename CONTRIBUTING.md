# Contributing

Mossgrove is a sample app for testing with NthCase. It is published so you can build it, read it and test it.

- **Bugs:** open an issue. Say what you did, what you expected, and what happened, with the device, emulator or
  simulator and its OS version.
- **Pull requests** are welcome for bugs and accessibility fixes. A change to a screen, a text, an id or the data
  changes the shared spec, and so all five Mossgrove apps (Android, iOS, Flutter, React Native, Ionic). Open an issue
  first, so the spec moves before the apps do.
- Before you open a pull request, run `npm run typecheck`, `npm run lint`, `npm test`, then `npm run build` and
  `npm run e2e`. If a screen changed, `npm run e2e` also redraws `docs/screenshots`: commit the new pictures.
- Keep the rules in [SPEC.md](SPEC.md) §2: no network, no analytics, no third-party SDKs, original art only.

By contributing you agree that your contribution is licensed under the Apache License 2.0.
