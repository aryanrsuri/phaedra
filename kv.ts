const kv = await Deno.openKv();

const rfos = [
  {
    number: "1",
    title: "Manifesto",
    status: "Draft",
    date: "November 2024",
  },
  {
    number: "2",
    title: "Transcendental Morals",
    status: "Draft",
    date: "November 2024",
  },
];

for (const rfo of rfos) {
  const key = ["rfo", rfo.number];
  const value = {
    title: rfo.title,
    status: rfo.status,
    date: rfo.date,
  };
  await kv.set(key, value);
  console.log(`Stored metadata for RFO ${rfo.number}`);
}

console.log("Metadata initialization complete.");
