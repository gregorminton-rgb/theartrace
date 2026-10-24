// Syntax gate for the browser build without needing Node installed.
// new Function(src) only *parses*, it never runs the module, so a clean parse
// means the file is syntactically valid; runtime errors are irrelevant here.
//   cscript //nologo tools\syntax-check.js
var fso = new ActiveXObject("Scripting.FileSystemObject");
/* project root = parent of this script's folder (tools), so the project stays
   relocatable - nothing here is tied to an absolute path. */
var root = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName)) + "\\";
function read(p) { var f = fso.OpenTextFile(p, 1); var s = f.ReadAll(); f.Close(); return s; }
var files = ["data.js", "cities-extra.js", "engine.js", "images.js", "artwork-images.js", "world-geo.js", "map.js", "app.js"];
var failed = 0;
for (var i = 0; i < files.length; i++) {
  var path = root + files[i];
  try {
    new Function(read(path));
    WScript.Echo("OK    " + files[i]);
  } catch (e) {
    failed++;
    WScript.Echo("FAIL  " + files[i] + "  ::  " + e.message);
  }
}
WScript.Quit(failed === 0 ? 0 : 1);
