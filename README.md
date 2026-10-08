<a id="readme-top"></a>

<!-- PROJECT SHIELDS -->
[![Astro][astro-shield]][astro-url]
[![Node][node-shield]][node-url]
[![Claude Code][claude-shield]][claude-url]
[![License: MIT][license-shield]][license-url]

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <h1 align="center">astro-agentation</h1>

  <p align="center">
    <em>Point at it. Say what is wrong. Your agent finds the line.</em>
    <br />
    <br />
    An unofficial Astro integration for <a href="https://github.com/benjitaylor/agentation">Agentation</a>, the visual feedback toolbar for coding agents.
    <br />
    <a href="#usage"><strong>See a note »</strong></a>
    <br />
    <br />
    <a href="https://github.com/gautierlp/astro-agentation/issues/new">Report bug</a>
    &middot;
    <a href="https://github.com/gautierlp/astro-agentation/issues/new">Request feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About the project</a>
      <ul>
        <li><a href="#built-with">Built with</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
        <li><a href="#connect-your-agent">Connect your agent</a></li>
        <li><a href="#options">Options</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#how-it-works">How it works</a></li>
    <li><a href="#faq">FAQ</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->
## About the project

You read your site page by page. The third paragraph is too long, the button label is wrong, the photo is cropped badly. Writing each of those down for your agent, with enough context to find it, takes longer than the fix.

[Agentation](https://github.com/benjitaylor/agentation) solves the first half: click an element, type the change, and your agent reads the note over MCP. It is React-only, though, and an Astro page is mostly not React.

This integration adds Agentation to the Astro dev server with one line of config. Each note also gets the `.astro` file and line of the element you clicked, so the agent does not have to grep for the text. `astro build` gets nothing: no toolbar, no React, no source markers.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built with

* [![Astro][astro-shield]][astro-url] integration API
* [Agentation](https://github.com/benjitaylor/agentation) and `agentation-mcp` for the toolbar, the annotation server and the MCP tools
* [code-inspector-plugin](https://github.com/zh-lx/code-inspector) to stamp each element with its source location
* React, only to mount the toolbar on the dev server

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->
## Getting started

### Prerequisites

* Astro 5 or newer (tested on Astro 7)
* Node 20 or newer
* A coding agent that speaks MCP, such as [Claude Code](https://claude.com/claude-code). Without one, the toolbar's Copy button still gives you the notes as Markdown.

### Installation

1. Install it from GitHub
   ```sh
   npm install --save-dev github:gautierlp/astro-agentation
   ```
2. Add it to `astro.config.mjs`
   ```js
   import { defineConfig } from "astro/config";
   import agentation from "astro-agentation";

   export default defineConfig({
     integrations: [agentation()],
   });
   ```
3. Start the dev server
   ```sh
   npm run dev
   ```
   The integration starts Agentation's annotation server on port 4747, or reuses one that already runs there.

### Connect your agent

For Claude Code, add this `.mcp.json` at the root of your project:

```json
{
  "mcpServers": {
    "agentation": {
      "type": "stdio",
      "command": "npx",
      "args": ["--no", "agentation-mcp", "server", "--mcp-only", "--http-url", "http://localhost:4747"]
    }
  }
}
```

`--mcp-only` matters. Without it, the MCP server tries to start a second annotation server on the port the dev server already uses.

### Options

```js
agentation({ port: 4747, path: "/__agentation", source: true, server: true })
```

| Option | Default | What it does |
|---|---|---|
| `port` | `4747` | port of the annotation server |
| `path` | `/__agentation` | dev server path that forwards to the annotation server |
| `source` | `true` | stamp elements with `data-insp-path` and save it in each note |
| `server` | `true` | start the annotation server with the dev server |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- USAGE -->
## Usage

Open your site on the dev server. Click the toolbar in the bottom right corner to start feedback mode, click an element or select some text, and type what should change.

Here is a note from a real review, as the agent reads it (trimmed):

```json
{
  "comment": "Cut the greeting, start with the role",
  "element": "\"Hi, I'm Gautier, a\"",
  "attributes": { "data-insp-path": "src/components/Hero.astro:27:5:span" },
  "nearbyText": "Hi, I'm Gautier, a [after: \"Technical Product Manager.\"]",
  "url": "http://localhost:4321/"
}
```

Then ask your agent to apply the pending notes. In Claude Code, it calls `agentation_get_all_pending`, edits `Hero.astro` at line 27, and marks each note resolved.

### Reviewing from another machine

The dev server can run on one machine while you read on another, for example a home server reached over Tailscale. Start Astro with `--host`, and allow the host name you type in the browser:

```js
export default defineConfig({
  server: { allowedHosts: ["my-server", ".ts.net"] },
  integrations: [agentation()],
});
```

The toolbar talks to the dev server only, never to port 4747 directly, so nothing else needs to be open.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- HOW IT WORKS -->
## How it works

On `astro dev`, the integration does three things. On `astro build`, it does nothing.

1. It injects a small script on every page that mounts the Agentation toolbar with React.
2. It adds a Vite proxy from `/__agentation` to the annotation server. The annotation server rejects requests from origins other than localhost, so the proxy rewrites the `Origin` header. This is also why the toolbar works from another machine.
3. It adds code-inspector-plugin, with its hotkeys off. Each element in the HTML gets `data-insp-path="file:line:column"`, and the toolbar saves that attribute in the note.

Notes live in Agentation's own store, `~/.agentation/store.db`, not in your repo.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- FAQ -->
## FAQ

**Does any of this reach production?**
No. Every hook checks for the `dev` command. Run `astro build` and search `dist/` for `agentation` or `data-insp-path`: there are no matches.

**Why is there no line number for my blog post text?**
Text that comes from Markdown or a content collection has no element in an `.astro` file. The note then points to the component that renders the content, and the clicked text tells the agent which paragraph it is.

**Is this an official Agentation package?**
No. It installs Agentation from npm and does not copy or change its code. If the Agentation author wants to take it over, it is theirs.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ROADMAP -->
## Roadmap

- [x] Toolbar, proxy and source markers on the dev server only
- [x] Start the annotation server with the dev server
- [ ] Publish to npm
- [ ] Line numbers for Markdown content

See the [open issues](https://github.com/gautierlp/astro-agentation/issues) for the rest.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTRIBUTING -->
## Contributing

Issues and pull requests are welcome. Keep a pull request to one change, and run the tests first:

```sh
npm test
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- LICENSE -->
## License

The code in this repo is under the MIT License. See [LICENSE](LICENSE).

Agentation and `agentation-mcp` are not part of this repo. npm installs them from their author, under their own license, [PolyForm Shield 1.0.0](https://github.com/benjitaylor/agentation/blob/main/LICENSE). Read it before you use them in a product that could compete with Agentation.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTACT -->
## Contact

Gautier Le Poher, [lepoher.co](https://lepoher.co)

Project link: [github.com/gautierlp/astro-agentation](https://github.com/gautierlp/astro-agentation)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

* [Agentation](https://github.com/benjitaylor/agentation) by Benji Taylor, which does the real work
* [code-inspector](https://github.com/zh-lx/code-inspector) by zh-lx, for the source locations
* [UI Bridge](https://github.com/mariohamann/ui-bridge) by Mario Hamann, which showed that code-inspector works on `.astro` files
* [Best-README-Template](https://github.com/othneildrew/Best-README-Template)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
[astro-shield]: https://img.shields.io/badge/Astro-BC52EE?style=for-the-badge&logo=astro&logoColor=white
[astro-url]: https://astro.build
[node-shield]: https://img.shields.io/badge/Node.js-5FA04E?style=for-the-badge&logo=nodedotjs&logoColor=white
[node-url]: https://nodejs.org
[claude-shield]: https://img.shields.io/badge/Claude_Code-D97757?style=for-the-badge&logo=claude&logoColor=white
[claude-url]: https://claude.com/claude-code
[license-shield]: https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge
[license-url]: LICENSE
