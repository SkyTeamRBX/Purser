declare global {
      namespace NodeJS {
          interface ProcessEnv {
              // Discord
              BOT_TOKEN: string;
              HOME_GUILD_ID: string;
              LOG_CHANNEL_ID: string;
              BOT_OWNER_ID: string;
          }
      }
  }
  
  export {}