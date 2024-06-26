declare global {
      namespace NodeJS {
          interface ProcessEnv {
              // Discord
              BOT_TOKEN: string;
              HOME_GUILD_ID: string;
              TEST_GUILD_ID: string;
              BOT_OWNER_ID: string;
          }
      }
  }
  
  export {}