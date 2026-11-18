# Home Studio working agreement

- Save and commit repository changes before running tests, as Elad requests.
- Keep recoverable progress throughout long tasks. Before a usage limit, context
  boundary, or interruption, commit completed work and push it to this project's
  configured source repository using the supported authenticated workflow.
- Update `qa/progress.md` with the released commit, completed changes, actual
  verification results, remaining work, and any blockers. Never store credentials
  or deployment secrets in this file or elsewhere in the repository.
- Resume from the checkpoint and current source instead of repeating finished
  work. Distinguish committed work, passed checks, and deployed changes.
- Preserve the public/private separation and the user's apartment design.
- Provide full downloadable source when requested. Keep secret values,
  dependencies, and generated private build output out of source archives.
- Every code delivery must also include a runnable `HomeStudio-...-Clean.zip`.
  Keep all required textures, models, decoders, architectural data and rendering
  quality. Omit only reference photos/videos/PDFs, historical QA output and
  development-only extras. Use `scripts/export-clean-source.mjs` and verify the
  Clean package before delivery; a FullSource archive does not replace Clean.
