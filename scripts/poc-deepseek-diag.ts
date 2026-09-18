import "dotenv/config";
import { generateText, generateObject } from "ai";
import { z } from "zod";
import { flashModel } from "../lib/llm/client";

async function main() {
  try {
    const t = await generateText({
      model: flashModel(),
      prompt: "Reply with one word: ok",
    });
    console.log("TEXT_OK", JSON.stringify(t.text.slice(0, 80)));
  } catch (e) {
    console.log("TEXT_FAIL", String(e).slice(0, 400));
  }

  try {
    const o = await generateObject({
      model: flashModel(),
      schema: z.object({ appName: z.string() }),
      prompt: "Return JSON with appName for a todo app",
    });
    console.log("OBJ_OK", o.object);
  } catch (e) {
    console.log("OBJ_FAIL", String(e).slice(0, 400));
  }
}

main();
