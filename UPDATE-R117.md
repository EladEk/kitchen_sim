# HomeStudio R117 — loading percentages

All shared loading indicators now show a numeric percentage and accessible
progress bar: initial startup, building/apartment changes, room preparation,
quality changes, the personal editor and kitchen, photo preparation and export.

Startup progress follows streamed baseline JSON and GLB bytes, actual material
loads, scene construction, texture upload, shader compilation and the first
successful draw. The baseline build emits decoded UTF-8 file lengths, avoiding
incorrect percentages from compressed Content-Length headers. Unknown-length
loads advance when their completed work is known. No timer fabricates progress.

Shader preparation reports completed textures and compile batches. A new load
resets progress; stale/cancelled work cannot complete a newer operation. 100%
is reserved for completion, while scene preparation may hold below it. Photo
percentages describe preparing the first image; later refinement continues.

Existing R116 furniture, engine selection, geometry, movement and private access
are retained. The update ZIP contains full changed files relative to source
7f27452a2158bd89f6facfae6d1d7a8a61a272b8. Device FPS is not inferred from progress.
