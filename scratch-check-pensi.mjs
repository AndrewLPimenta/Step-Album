import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data, error } = await supabase
  .from("albums")
  .select("id, student_name, faculty, class_code, type, status, cycle_start, cycle_end, payment_date, created_at")
  .or("faculty.ilike.%pensi%,student_name.ilike.%pensi%");

if (error) { console.error(error); process.exit(1); }
console.log(`Matches for "pensi" (faculty or student_name): ${data.length}`);
for (const a of data) console.log(" ", JSON.stringify(a));
