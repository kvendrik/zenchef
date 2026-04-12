import { extractRestaurantUid } from "../scraper.ts";
import { formatError } from "../format.ts";
import chalk from "chalk";

export async function check(args: {
  restaurantUrl: string;
}): Promise<void> {
  try {
    const uid = await extractRestaurantUid(args.restaurantUrl);
    console.log(chalk.green("Yes") + ` — this restaurant uses Zenchef/Formitable (UID: ${uid})`);
  } catch {
    console.log(chalk.red("No") + " — this restaurant does not use Zenchef/Formitable");
    process.exit(1);
  }
}
