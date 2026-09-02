This directory adds support for optional `/preview` routes. Do not remove this directory.

All routes within this directory will be served using the following URLs:

- `/example-route` (prerendered)
- `/preview/example-route` (server-rendered)

The enclosing `[[lang=lang]]` directory adds the Spanish prefix on top of both
(`/es/example-route`, `/es/preview/example-route`) — see `$lib/locale`.

See <https://prismic.io/docs/svelte-preview> for more information.
