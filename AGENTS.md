# AGENTS.md

Project guidance for AI coding assistants working on the CoralMind Knowledge Library.

The installable package is `coralmap`. Both the distribution name and the import name are `coralmap`: `pip install coralmap`, `from coralmap import load`. Do not reintroduce `coralmind_kl` or `coralmind-knowledge-library`. The loader override is still `CORALMIND_KL_PATH`.

The Next.js app in `viewer/` is a separate package, `coralmind-knowledge-library-viewer`. It reads `entries/` through its TypeScript ingest. Do not add a Python exporter for it.

---

## What ships

The public surface is the read path: `load()`, query, `contract()`, and `validate()`. Entries are frozen. `derive()`, `DraftLibrary`, `coralmap.edit`, and `coralmap.export` were removed because they only raised `NotImplementedError`. Do not put those stubs back. A real edit or export API lands as a working implementation.

Runtime dependencies stay `pydantic` and `pyyaml`. An outside install must not pull in pixi, litellm, or burr.

Clinical content belongs in `entries/`. `schema/` is generated from `src/coralmap/models/`; edit a model, then regenerate. Do not hand-edit schemas.

---

## Licenses

Two licenses, on purpose:

- Code in `src/`, `viewer/`, `scripts/`, `tests/`, notebooks, and the software documentation is MIT (`LICENSE.md`). Keep the contributor patent grant there: it incorporates Apache License 2.0 section 3, and the copyright terms stay MIT.
- The catalog in `entries/`, `schema/`, and `docs/AUTHORING.md`, and the guide text in `viewer/content/`, are CC BY-NC 4.0 (`CONTENT_LICENSE.md`).

Do not relicense either set. The CoralMind name and logo are trademarks. A source entry does not relicense the work it cites.

---

## Version and release

The first public release is `0.1.0`. Stay on `0.x` until the public API is stable enough that a break would be `2.0.0`. `1.0.0` is that promise; do not use it for a first public upload.

The version is `pyproject.toml`, `src/coralmap/__init__.py` (`__version__`), and `CITATION.cff`. Release Please updates all three from Conventional Commits. Do not bump them by hand.

The pull request title is the commit when the pull request is squash-merged. Otherwise each commit on `main` counts.

| Title | Before 1.0.0 | From 1.0.0 |
| --- | --- | --- |
| `fix:` | patch | patch |
| `feat:` | minor | minor |
| `feat!:` or `BREAKING CHANGE:` | minor | major |
| `docs:`, `chore:`, `ci:`, `test:`, `style:`, `refactor:` | no release | no release |

Release Please opens one pull request with the version and changelog. Merging it tags `vX.Y.Z` and `.github/workflows/release.yml` publishes `coralmap` to PyPI. Do not add a second publish workflow, and do not commit a PyPI token.

To set the version, end a commit message with a `Release-As:` footer. Pre-releases use PEP 440, for example `Release-As: 0.3.0a1`, `0.3.0b1`, or `0.3.0rc1`. A squash merge keeps the branch's commit messages in its body, so put the footer on the branch's last commit. A `BEGIN_COMMIT_OVERRIDE` block in the pull request body replaces those messages and drops the footer. A later `fix:` does not step `a1` to `a2`; set the next `Release-As`. `pip install coralmap` skips pre-releases. The stable release is `Release-As: 0.3.0`.

`kl.version` is the package version. `kl.digest` is the content hash. Releases record both.

---

## Task skills

Task skills live in `.agents/skills/`. Cursor and Claude Code see that directory through `.cursor/skills` and `.claude/skills`. Read the skill whose description matches the task.

The agent does not merge pull requests. No skill runs `gh pr merge`. A request to merge is answered by saying the maintainer merges it.

| Skill | Read it when |
| --- | --- |
| `commit` | Changes are ready to record on the current branch |
| `create-issue` | Work should be tracked on GitHub rather than done now |
| `create-pr` | A branch is ready for review and the user has asked for a pull request |
| `push` | Local commits need to reach the remote |
| `clean-branches` | Merged, stale, or gone branches need pruning |

## Rules

Rules live in `.agents/rules/`. Read the one whose trigger matches the task, and leave the others unread.

| Rule | Load when |
| --- | --- |
| `working-agreement` | Starting an implementation, refactor, or bugfix |
| `pixi-environments` | Setting up the repo, running a command, or changing a dependency |
| `pre-commit-and-quality` | About to commit, open a pull request, or claim that checks passed |
| `contribution-discipline` | About to commit or open a pull request |
