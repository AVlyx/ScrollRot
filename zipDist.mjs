// file: zipDist.mjs
import fs from "fs";
import archiver from "archiver";

const zipFile = "ScrollRot.zip";
const folderToZip = "dist";

// Delete existing zip if it exists
if (fs.existsSync(zipFile)) {
  fs.unlinkSync(zipFile);
  console.log(`${zipFile} deleted.`);
}

// Create a file to stream archive data to.
const output = fs.createWriteStream(zipFile);
const archive = archiver("zip", { zlib: { level: 9 } });

// Listen for all archive data to be written
output.on("close", () => {
  console.log(`${folderToZip} zipped into ${zipFile} (${archive.pointer()} total bytes)`);
});

// Good practice to catch warnings and errors
archive.on("warning", (err) => {
  if (err.code !== "ENOENT") throw err;
});
archive.on("error", (err) => {
  throw err;
});

// Pipe archive data to the file
archive.pipe(output);

// Append folder to the archive
archive.directory(folderToZip, false);

// Finalize the archive
archive.finalize();
