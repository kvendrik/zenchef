import { extractRestaurantInfo } from "../scraper.ts";
import chalk from "chalk";

export async function check(args: {
  restaurantUrl: string;
}): Promise<void> {
  try {
    const { uid, system } = await extractRestaurantInfo(args.restaurantUrl);
    const systemLabel = system === "zenchef" ? "Zenchef" : "Formitable";
    console.log(chalk.green("Yes") + ` — this restaurant uses ${systemLabel} (UID: ${uid})`);
    console.log();
    console.log("Next steps:");
    console.log(`  zenchef dates ${args.restaurantUrl} --guests 2`);
    console.log(`  zenchef availability ${args.restaurantUrl} --date DD/MM --guests 2`);
    console.log(`  zenchef book ${args.restaurantUrl} --date DD/MM --time HH:MM --guests 2 --ticket <uid> --name "..." --email "..." --phone "..."`);
  } catch {
    console.log(chalk.red("No") + " — this restaurant does not use Zenchef/Formitable");
    console.log();
    console.log("This restaurant may use a different booking system.");
    process.exit(1);
  }
}
