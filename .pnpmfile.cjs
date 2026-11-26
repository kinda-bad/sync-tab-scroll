// @coderline/alphatab declares its bundler plugins as optional peers. pnpm
// then installs one copy of alphaTab per distinct Vite peer set in the
// workspace (client and pipeline resolve different ones), and TypeScript
// treats each copy's classes as unrelated types ("Score is not assignable to
// Score"). alphaTab never imports the plugins itself, so drop the peers and
// keep a single copy.
function readPackage(pkg) {
  if (pkg.name === '@coderline/alphatab') {
    delete pkg.peerDependencies;
    delete pkg.peerDependenciesMeta;
  }
  return pkg;
}

module.exports = { hooks: { readPackage } };
