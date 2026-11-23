const version = process.argv[2];
if (version === undefined) throw new Error('version missing.');
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Bad version ${version}.`);
console.log(`Releasing datetime-utils ${version}`);
