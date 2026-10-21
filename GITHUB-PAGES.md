# Vector PNI on GitHub Pages

Existing React/Vite/Three.js project for https://vectorpni.github.io/.
Use this directory as the repository root; do not upload the parent workspace.
Application source and the existing Sites hosting manifest remain unchanged.

## Local build and preview (PowerShell)

Dependencies are already installed. On a fresh checkout use `npm.cmd ci`.

```powershell
cd C:\Sites\MyWebsite\drone-lab
npm.cmd run build:pages
npm.cmd run preview:pages -- --port 5174 --strictPort
```

Open http://127.0.0.1:5174/. The Pages build uses `/` as its base and writes
to `pages-dist`, preserving the existing `dist` directory. It does not clean
old output; for releases use the fresh GitHub Actions checkout so stale assets
cannot accumulate. Node 24 and the committed package-lock.json are used in CI.

## Publication after explicit approval

1. Inspect the existing `vectorpni/vectorpni.github.io` repository and reconcile
   any existing contents before preparing a commit. Do not overwrite history.
2. Review and commit the application source, package files and `.github/workflows/pages.yml`.
   Do not include node_modules, generated output, screenshots or local credentials.
3. Push only after approval. Configure Settings > Pages > Source: GitHub Actions.
4. Manually run "Publish Vector PNI to GitHub Pages" from the default branch.
   The workflow has no push trigger; uploading source alone does not launch it.
5. Check the deployment and the 3D model, component dialogs and mobile layout
   at https://vectorpni.github.io/.

No custom domain or CNAME is needed. Only the generated static files are deployed;
the Sites `.openai/hosting.json` is not part of the Pages artifact.

## Verified on 2026-10-21

- Existing source belongs to Sites project `appgprj_6ad7f3b3ec1c8191a9e829ba89664888`
  serving https://vectorpni.deepsnail512.chatgpt.site/.
- Installed dependencies match package.json; Pages build passed with Node 24.22.0.
- Generated JS/CSS hashes match the previous `dist` build; application files were unchanged.
- Firefox via Playwright CLI: 90 checks passed, including all 16 components,
  sources/specifications, independent 3D rotation, geometry selection, assembly
  controls and mobile dialog scrolling. No JavaScript errors. WebGL warnings
  appeared during renderer disposal; the source explicitly calls forceContextLoss.
- Vite reports the existing 824.53 kB JS bundle size warning; build succeeds.
- Git 2.56.0.windows.2 works. Sandbox Git inspection required a per-command
  safe.directory override; no global Git settings were changed.
- Outside the sandbox, GitHub API authenticated as `vectorpni` and confirmed
  push permission, default branch `main`, and Pages already enabled.
- Remote repository root currently contains only README.md. Preserve and review
  that README when reconciling the two independent Git histories.

Firefox screenshots are saved locally as `pages-qa-*.png`. The adapted check
script is `qa-pages.js`; both are excluded by the existing ignore rules.

## Local history reconciliation

Backup branch: `backup/before-github-merge-20261021` (original local HEAD).
The existing repository is configured as `origin`; its history was fetched.
Both histories are preserved by a merge, without rebasing or force push.
The remote README.md is retained byte-for-byte; the former local README is
preserved in README-SITE.md. DNS-SETUP.md, debug-v3.yaml and .openai/hosting.json
are removed only from the Git index, remain on disk, and are ignored going forward.
They remain accessible in the retained historical commits.

The current Pages source was verified as `main` / root (`legacy` build).
Before uploading source, switch Settings > Pages > Source to GitHub Actions;
otherwise a push may trigger the existing branch-based Pages publication.
No push, Actions run, Pages setting change or site publication is authorized
as part of the local preparation.
