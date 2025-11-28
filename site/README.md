This `site/` folder contains a simple SPA prototype for exploring the `da_wilson` repository files.

The repository stores data files under the `data/` folder (e.g. `data/latex/`, `data/maple/`, `data/mathematica/`, `data/sage/`).

Local testing:

```bash
# from repository root
python3 -m http.server --directory site 8000
# then open http://localhost:8000
```

Deployment:
- For GitHub Pages, you can configure Pages to serve from the `site/` folder or copy files to the `gh-pages` branch.

Notes:
- The prototype uses unauthenticated GitHub API requests which are rate-limited. For heavy use, add authenticated requests using a token (future enhancement).