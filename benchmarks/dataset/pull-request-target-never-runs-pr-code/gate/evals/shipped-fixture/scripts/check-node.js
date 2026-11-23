const [major] = process.versions.node.split('.').map(Number);

if (major < 22) {
  console.warn(`spanwise is developed on Node 22 or later; this is Node ${process.versions.node}.`);
}
