# Home Studio R130

Fixes the R129 startup failure after successful WebGL2 initialization. The viewer still compared navigation data against the literal number 128 while the generated data was revision 129. Reloading could not resolve that code error.

One numeric release definition now supplies the app revision, generated navigation and loading manifest. The existing baseline download loader validates navigation against the requested app release; the obsolete duplicate check in the viewer is removed. A real mismatch carries both expected and received revisions in the diagnostic details. The download stage is logged explicitly before fetching data.

The WebGL2 default, R129 furniture colours and contractor garden terraces remain in place. Engine preferences are not migrated again.

The startup regression test runs the exact public baseline loader with the compiled asset files, verifies a successful current-release load, and verifies rejection of a deliberately stale navigation file. Access protection and public/personal maps are also checked. See `qa/validation-r130.md`.
