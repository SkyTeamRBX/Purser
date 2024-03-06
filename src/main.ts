import "dotenv/config";
import { dirname, importx } from "@discordx/importer";
import type { Interaction, Message } from "discord.js";
import { IntentsBitField } from "discord.js";
import { Client } from "discordx";

// Bot Configuration
export const bot = new Client({
    // Intents
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.GuildMessageReactions,
        IntentsBitField.Flags.GuildVoiceStates,
        IntentsBitField.Flags.MessageContent,
    ],

    // Locked Guilds
    botGuilds: [process.env.SERVER_ID || ""],

    silent: false,

    simpleCommand: {
        prefix: "s!",
    }
});

bot.once("ready", async () => {
    await bot.initApplicationCommands();

    console.log("Logged in on " + bot.user?.tag);
});

bot.on("interactionCreate", (interaction: Interaction) => {
    if (interaction.guildId === process.env.SERVER_ID) {
        bot.executeInteraction(interaction);
    } else {
        console.log("chat who is this guy " + interaction.user.tag + " in " + interaction.guildId)
    }
});

bot.on("messageCreate", async (message: Message) => {
    await bot.executeCommand(message);
});

async function run() {
    await importx(`${dirname(import.meta.url)}/{events,commands}/**/*.{ts,js}`);

    if (!process.env.BOT_TOKEN) {
        throw Error("Could not find BOT_TOKEN in your environment");
    }

    await bot.login(process.env.BOT_TOKEN);
};

void run();