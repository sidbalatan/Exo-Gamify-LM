# AGENTS.md

## Cursor Cloud specific instructions

This is a **greenfield repository** — as of the initial commit it contains only `README.md` (project description for "Exo-Gamify-LM / ExoQuest / XQuest") and an MIT `LICENSE`. There is no source code, no package manager, no build system, no tests, and no services to run yet.

### Current state

- **Languages/frameworks**: none chosen yet
- **Package manager**: none
- **Lint / test / build / run**: no commands available
- **External services**: none required

### Notes for future agents

- Once source code and a package manager are added, the VM update script (`SetupVmEnvironment`) should be updated to install dependencies (e.g. `npm install`, `pip install -r requirements.txt`, etc.).
- The README describes the project as an end-to-end ML pipeline + mobile-first game for TESS exoplanet transit signal vetting, with a relational registry (ExoReg). Future setup will likely involve Python ML tooling and a frontend framework.
- No git hooks, CI/CD, or devcontainer configuration exists yet.
