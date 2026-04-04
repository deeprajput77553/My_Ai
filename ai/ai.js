import fs from "fs";
import { execSync } from "child_process";
import readline from "readline";

const MODEL = "llama3"; // change if needed

const SYSTEM_PROMPT = `
You are a terminal coding agent.

Respond ONLY in JSON:

{
  "action": "read" | "write" | "run" | "answer",
  "file": "optional",
  "content": "optional",
  "command": "optional",
  "message": "optional"
}
`;

async function callOllama(prompt) {
  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    body: JSON.stringify({
      model: MODEL,
      prompt: SYSTEM_PROMPT + "\nUser: " + prompt,
      stream: false
    })
  });

  const data = await res.json();
  return data.response;
}