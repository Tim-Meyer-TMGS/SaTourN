function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] || '').trim() : '';
}

const outputDirectory = readArgument('--output-dir');
const contextsFile = readArgument('--contexts-file');

if (outputDirectory) process.env.QUALITY_SNAPSHOT_OUTPUT_DIR = outputDirectory;
if (contextsFile) process.env.QUALITY_SNAPSHOT_CONTEXTS_FILE = contextsFile;

const { runQualitySnapshot } = await import('./run-quality-snapshot.mjs');

runQualitySnapshot().catch((error) => {
  console.error('Quality snapshot job failed.', error);
  process.exitCode = 1;
});

