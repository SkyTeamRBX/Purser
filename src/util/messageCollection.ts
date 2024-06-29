import type { Message, TextBasedChannel, TextChannel } from "discord.js";
import { CommandInteraction, CacheType, EmbedBuilder, ChannelType, InteractionResponse } from "discord.js";

const defaultColour = '#2b2d31'

function extractUniqueDiscordEmojiIds(text: string): string[] {
      // Regular expression to match and capture the numeric ID part of Discord emojis
      const emojiIdRegex = /<:\w+:(\d+)>/g;

      // Set to hold the unique extracted IDs
      const idsSet = new Set<string>();

      // Match the text against the regular expression
      let match: RegExpExecArray | null;
      while ((match = emojiIdRegex.exec(text)) !== null) {
            // The captured group (numeric ID) is at index 1 in the match array
            idsSet.add(match[1]);
      }

      // Convert the Set to an array and return it
      return Array.from(idsSet);
  }


export function stringQuestion(
      interaction: CommandInteraction<CacheType>,
      question: string,
      skipable: boolean,
      timed?: number,
      footer?: string,
): Promise<string | null> {
      return new Promise(async (resolve, reject) => {
            let embed = new EmbedBuilder()
                  .setDescription(question)
                  .setColor(defaultColour);

            if (skipable) {
                  embed.setFooter({ text: 'Enter skip to skip this input.' })
            }

            if (footer) {
                  embed.setFooter({ text: footer })
            }

            let lastmsg: Message | InteractionResponse;
            
            if (interaction.replied) {
                  lastmsg = await interaction.followUp({ embeds: [embed] })
            } else {
                  lastmsg = await interaction.reply({ embeds: [embed] })
            }

            const collection = interaction.channel?.createMessageCollector({
                  filter: (response: Message<boolean>) => {
                        return response.author.id == interaction.user.id;
                  },
                  max: 1,
                  time: timed || 216000_000
            })

            collection?.on('collect', async message => {
                  if (message.content.toLowerCase() == 'skip' && skipable) {
                        resolve(null)
                  } else {
                        const emojis = extractUniqueDiscordEmojiIds(message.content)
                        var filteredMessage = message.content

                        for (let emoji of emojis) {
                              console.log(emoji);
                              if (interaction.client.emojis.cache.get(emoji)) continue;

                              let newEmoji = interaction.client.guilds.cache.get(process.env.TEST_GUILD_ID)?.emojis.cache.find(e => e.name === emoji)

                              if (!newEmoji) {
                                    const url = `https://cdn.discordapp.com/emojis/${emoji}.png`
                                    newEmoji = await interaction.client.guilds.cache.get(process.env.TEST_GUILD_ID)?.emojis.create({ name: emoji, attachment: url })
                              }

                              const pattern = new RegExp(`<:\\w+:${emoji}>`, 'g');

                              // Construct the new emoji pattern
                              const replacement: string = `<:${emoji}:${newEmoji?.id}>`;

                              filteredMessage = filteredMessage.replace(pattern, replacement);
                        }

                        resolve(filteredMessage)
                  }
            })

            collection?.on('end', collected => {
                  if (collected.size == 0) {
                        lastmsg.edit({ embeds: [
                              new EmbedBuilder()
                                    .setDescription('You took too long to respond! Interaction Cancelled')
                                    .setColor(defaultColour)
                        ]})

                        reject()
                  }
            })
      })
}

export function textChannelQuestion(
      interaction: CommandInteraction<CacheType>,
      question: string,
      timed?: number,
      footer?: string,
): Promise<TextBasedChannel> {
      return new Promise(async (resolve, reject) => {
            let embed = new EmbedBuilder()
                  .setDescription(question)
                  .setFooter({ text: footer || '' })
                  .setColor(defaultColour);

            let lastmsg: Message | InteractionResponse;
            
            if (interaction.replied) {
                  lastmsg = await interaction.followUp({ embeds: [embed] })
            } else {
                  lastmsg = await interaction.reply({ embeds: [embed] })
            }

            const collection = interaction.channel?.createMessageCollector({
                  filter: (response: Message<boolean>) => {
                        return response.author.id == interaction.user.id;
                  },
                  max: 1,
                  time: timed || 216000_000
            })

            collection?.on('collect', message => {
                  let channel = message.mentions.channels.first() || interaction.guild?.channels.cache.get(message.content)
                  if (!channel?.isTextBased()) {
                        lastmsg.edit({ embeds: [
                              new EmbedBuilder()
                                    .setDescription('Invalid Channel! Please try again.')
                                    .setColor(defaultColour)
                        ]})
                        reject()
                  } else {
                        resolve(channel)
                  }
            })

            collection?.on('end', collected => {
                  if (collected.size == 0) {
                        lastmsg.edit({ embeds: [
                              new EmbedBuilder()
                                    .setDescription('You took too long to respond! Interaction Cancelled')
                                    .setColor(defaultColour)
                        ]})

                        reject()
                  }
            })
      })
}

export function imageQuestion(
      interaction: CommandInteraction<CacheType>,
      question: string,
      skipable: boolean,
      timed?: number,
      footer?: string,
): Promise<string | null> {
      return new Promise(async (resolve, reject) => {
            let embed = new EmbedBuilder()
                  .setDescription(question)
                  .setFooter({ text: footer || skipable ? 'Enter skip to skip this input.' : '' })
                  .setColor(defaultColour);

            let lastmsg: Message | InteractionResponse;
            
            if (interaction.replied) {
                  lastmsg = await interaction.followUp({ embeds: [embed] })
            } else {
                  lastmsg = await interaction.reply({ embeds: [embed] })
            }

            const collection = interaction.channel?.createMessageCollector({
                  filter: (response: Message<boolean>) => {
                        return response.author.id == interaction.user.id;
                  },
                  max: 1,
                  time: timed || 216000_000
            })

            collection?.on('collect', message => {
                  if (message.content.toLowerCase() == 'skip' && skipable) {
                        resolve(null)
                  } else {
                        const attachment = message.attachments.first()
                        
                        if (attachment) {
                              resolve(attachment.url)
                        } else {
                              resolve(null)
                        }
                  }
            })

            collection?.on('end', collected => {
                  if (collected.size == 0) {
                        lastmsg.edit({ embeds: [
                              new EmbedBuilder()
                                    .setDescription('You took too long to respond! Interaction Cancelled')
                                    .setColor(defaultColour)
                        ]})

                        reject()
                  }
            })
      })
}