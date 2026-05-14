import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";

async function promptNonEmpty(
  rl: ReturnType<typeof createInterface>,
  label: string,
): Promise<string> {
  while (true) {
    const value = (await rl.question(`${label}: `)).trim();
    if (value.length > 0) {
      return value;
    }

    console.log(`${label} is required.`);
  }
}

async function main() {
  const rl = createInterface({ input, output });

  try {
    console.log("Telegram webhook setup");
    console.log("Enter values to build and run setWebhook curl command.\n");

    const botToken = await promptNonEmpty(rl, "TELEGRAM_BOT_TOKEN");
    const projectRef = await promptNonEmpty(rl, "PROJECT_REF");
    const productionSecret = await promptNonEmpty(rl, "SUPA_FUNCTION_SECRET");

    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/setWebhook`;
    const webhookUrl = `https://${projectRef}.supabase.co/functions/v1/telegram-bot`;
    const webhookValue = `url=${webhookUrl}`;
    const secretTokenValue = `secret_token=${productionSecret}`;

    const commandPreview = `curl -sG "${telegramApiUrl}" --data-urlencode "${webhookValue}" --data-urlencode "${secretTokenValue}"`;

    console.log("\nRunning command:");
    console.log(commandPreview);

    const result = Bun.spawnSync({
      cmd: [
        "curl",
        "-sG",
        telegramApiUrl,
        "--data-urlencode",
        webhookValue,
        "--data-urlencode",
        secretTokenValue,
      ],
      stdout: "pipe",
      stderr: "pipe",
    });

    const stdoutText = new TextDecoder().decode(result.stdout).trim();
    const stderrText = new TextDecoder().decode(result.stderr).trim();

    if (stdoutText) {
      console.log("\nTelegram response:");
      console.log(stdoutText);
    }

    if (result.exitCode !== 0) {
      console.error("\nFailed to run curl command.");
      if (stderrText) {
        console.error(stderrText);
      }
      process.exit(result.exitCode);
    }
  } finally {
    rl.close();
  }
}

try {
  await main();
} catch (error) {
  console.error("Unexpected error:", error);
  process.exit(1);
}
