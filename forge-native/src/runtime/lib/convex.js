export async function convexQuery(path, args) {
  const url = process.env.CONVEX_URL;
  if (!url) throw new Error("CONVEX_URL not configured");
  const res = await fetch(`${url}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, args, format: "json" }),
  });
  if (!res.ok) throw new Error(`Convex query failed: ${res.status}`);
  const data = await res.json();
  return data.value;
}

export async function convexMutation(path, args) {
  const url = process.env.CONVEX_URL;
  if (!url) throw new Error("CONVEX_URL not configured");
  const res = await fetch(`${url}/api/mutation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, args, format: "json" }),
  });
  if (!res.ok) throw new Error(`Convex mutation failed: ${res.status}`);
  const data = await res.json();
  return data.value;
}
