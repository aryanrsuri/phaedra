import { serve } from "https://deno.land/std@0.171.0/http/server.ts";
import { serveFile } from "https://deno.land/std@0.171.0/http/file_server.ts";

const KV = await Deno.openKv(
  // "https://api.deno.com/databases/00ca3a2c-a64c-46a0-8c53-2df142e95b54/connect",
);
const PORT = 8000;

interface rfoKey {
  title: string;
  status: string;
  date: string;
  author: string;
  amends: string[];
  is_amended_by: string[];
}

async function getRfoListItems(): Promise<string> {
  const iterator = KV.list<{ title: string }>({ prefix: ["rfo"] });
  const items = [];
  for await (const entry of iterator) {
    const rfoNumber = entry.key[1];
    const { title } = entry.value;
    items.push(
      `[<a href="/rfo/${rfoNumber}">${rfoNumber} ${title}</a>]<br>`,
    );
  }

  return items.join("");
}

const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Serve static files
  if (pathname.startsWith("/public/")) {
    return serveFile(req, `.${pathname}`);
  }

  // Index route
  if (pathname === "/") {
    return serveFile(req, "./src/index.html");
  }

  const rfoMatch = pathname.match(/^\/rfo\/(\d+)$/);
  if (rfoMatch) {
    const rfoNumber = rfoMatch[1];
    try {
      const key = ["rfo", rfoNumber];
      const meta = await KV.get<rfoKey>(key);

      if (!meta.value) {
        return new Response("metadata not found", { status: 404 });
      }
      const { title, status, date, amends, is_amended_by } = meta.value;

      console.log(meta.value);

      const essayContent = await Deno.readTextFile(
        `./rfos/${rfoNumber}.htm`,
      );
      const template = await Deno.readTextFile("./src/rfo.html");

      const amends_list = (amends && amends.length > 0)
        ? amends.map((num) => `<a href="rfo/${num}">${num}"</a>`).join(", ")
        : "None";
      const is_amended_by_list = (is_amended_by && is_amended_by.length > 0)
        ? amends.map((num) => `<a href="rfo/${num}">${num}"</a>`).join(", ")
        : "None";

      const responseHtml = template
        .replace(/{{content}}/g, essayContent)
        .replace(/{{title}}/g, title)
        .replace(/{{rfoNumber}}/g, rfoNumber)
        .replace(/{{date}}/g, date)
        .replace(/{{status}}/g, status)
        .replace(/{{amends}}/g, amends_list)
        .replace(/{{is_amended_by}}/g, is_amended_by_list);
      return new Response(responseHtml, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    } catch (error) {
      console.log(error);
      return new Response("Essay not found", { status: 404 });
    }
  }

  if (pathname === "/list") {
    const listItems = await getRfoListItems();
    return new Response(listItems, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const metaMatch = pathname.match(/^\/meta\/(\d+)$/);
  if (metaMatch) {
    const rfoNumber = metaMatch[1];
    try {
      // Fetch metadata from Deno KV
      const rfoKey = ["rfo", rfoNumber];
      const rfoMeta = await KV.get<rfoKey>(rfoKey);

      if (!rfoMeta.value) {
        return new Response("RFO metadata not found", { status: 404 });
      }

      // Convert metadata to plain text
      return new Response(JSON.stringify(rfoMeta), {
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    } catch (error) {
      return new Response("Error retrieving metadata", { status: 500 });
    }
  }

  // 404 Not Found
  return new Response("Not Found", { status: 404 });
};

console.log(`Phaedra server running on http://localhost:${PORT}`);
await serve(handler, { port: PORT });
