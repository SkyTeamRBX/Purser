import type { AwaitMessageCollectorOptionsParams, GuildBasedChannel, GuildTextBasedChannel, InteractionReplyOptions, Message, MessageActionRowComponentBuilder, MessageComponentType, MessagePayload, Role, TextBasedChannel, TextChannel, User } from 'discord.js'
import { CommandInteraction, CacheType, EmbedBuilder, ChannelType, InteractionResponse, ButtonInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js'

import basicEmbed from './basicEmbed.js'

const defaultColour = '#2b2d31'

function extractUniqueDiscordEmojiIds(text: string): string[] {
	// Regular expression to match and capture the numeric ID part of Discord emojis
	const emojiIdRegex = /<:\w+:(\d+)>/g

	// Set to hold the unique extracted IDs
	const idsSet = new Set<string>()

	// Match the text against the regular expression
	let match: RegExpExecArray | null
	while ((match = emojiIdRegex.exec(text)) !== null) {
		// The captured group (numeric ID) is at index 1 in the match array
		idsSet.add(match[1])
	}

	// Convert the Set to an array and return it
	return Array.from(idsSet)
}

export function stringQuestion(interaction: CommandInteraction<CacheType> | ButtonInteraction<CacheType>, question: string, skipable: boolean, timed?: number, footer?: string): Promise<string | null> {
	return new Promise(async (resolve, reject) => {
		let embed = new EmbedBuilder().setDescription(question).setColor(defaultColour)

		if (skipable) {
			embed.setFooter({ text: 'Enter skip to skip this input.' })
		}

		if (footer) {
			embed.setFooter({ text: footer })
		}

		let lastmsg: Message | InteractionResponse

		if (interaction.replied) {
			lastmsg = await interaction.followUp({ embeds: [embed] })
		} else {
			lastmsg = await interaction.reply({ embeds: [embed] })
		}

		const collection = interaction.channel?.createMessageCollector({
			filter: (response: Message<boolean>) => {
				return response.author.id == interaction.user.id
			},
			time: timed || 300_000,
		})

		collection?.on('collect', async (message) => {
			if (message.content.toLowerCase() == 'skip' && skipable) {
				resolve(null)
			} else {
				const emojis = extractUniqueDiscordEmojiIds(message.content)
				var filteredMessage = message.content

				for (let emoji of emojis) {
					console.log(emoji)
					if (interaction.client.emojis.cache.get(emoji)) continue

					let newEmoji = interaction.client.guilds.cache.get(process.env.TEST_GUILD_ID)?.emojis.cache.find((e) => e.name === emoji)

					if (!newEmoji) {
						const url = `https://cdn.discordapp.com/emojis/${emoji}.png`
						newEmoji = await interaction.client.guilds.cache.get(process.env.TEST_GUILD_ID)?.emojis.create({ name: emoji, attachment: url })
					}

					const pattern = new RegExp(`<:\\w+:${emoji}>`, 'g')

					// Construct the new emoji pattern
					const replacement: string = `<:${emoji}:${newEmoji?.id}>`

					filteredMessage = filteredMessage.replace(pattern, replacement)
				}

				resolve(filteredMessage)
			}
		})

		collection?.on('end', (collected) => {
			if (collected.size == 0) {
				lastmsg.edit({ embeds: [basicEmbed('WARNING', 'You took too long to respond; Interaction Cancelled.')] })
				reject()
			}
		})
	})
}

export function textChannelQuestion(interaction: CommandInteraction<CacheType> | ButtonInteraction<CacheType>, question: string, extras?: InteractionReplyOptions, timed?: number, footer?: string): Promise<GuildTextBasedChannel> {
	return new Promise(async (resolve, reject) => {
		let embed = new EmbedBuilder().setDescription(question).setColor(defaultColour)

		if (footer) {
			embed.setFooter({ text: footer })
		}

		let lastmsg: Message | InteractionResponse

		if (interaction.replied) {
			lastmsg = await interaction.followUp({ embeds: [embed], ...extras })
		} else {
			lastmsg = await interaction.reply({ embeds: [embed], ...extras })
		}

		const collection = interaction.channel?.createMessageCollector({
			filter: (response: Message<boolean>) => {
				return response.author.id == interaction.user.id
			},
			max: 1,
			time: timed || 300_000,
		})

		collection?.on('collect', (message) => {
			let og = message.mentions.channels.first() || interaction.guild?.channels.cache.get(message.content)
			let channel = og && message.guild?.channels.cache.get(og?.id)
			if (!channel) {
				lastmsg.edit({ embeds: [basicEmbed('ALERT', 'Invalid Channel; please try again later.')] })
				reject()
			} else {
				lastmsg.edit({
					embeds: [embed],
					components: [
						new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
							new ButtonBuilder()
								.setCustomId('nil')
								.setLabel('You have selected #' + channel.name)
								.setStyle(ButtonStyle.Secondary)
								.setDisabled(true),
						),
					],
				})
				resolve(channel as TextChannel)
			}
		})

		collection?.on('end', (collected) => {
			if (collected.size == 0) {
				lastmsg.edit({ embeds: [basicEmbed('WARNING', 'You took too long to respond; Interaction Cancelled.')] })
				reject()
			}
		})
	})
}

export function roleQuestion(interaction: CommandInteraction<CacheType> | ButtonInteraction<CacheType>, question: string, extras?: InteractionReplyOptions, timed?: number, footer?: string): Promise<Role> {
	return new Promise(async (resolve, reject) => {
		let embed = new EmbedBuilder().setDescription(question).setColor(defaultColour)

		if (footer) {
			embed.setFooter({ text: footer })
		}

		let lastmsg: Message | InteractionResponse

		if (interaction.replied) {
			lastmsg = await interaction.followUp({ embeds: [embed], ...extras })
		} else {
			lastmsg = await interaction.reply({ embeds: [embed], ...extras })
		}

		const collection = interaction.channel?.createMessageCollector({
			filter: (response: Message<boolean>) => {
				return response.author.id == interaction.user.id
			},
			max: 1,
			time: timed || 300_000,
		})

		collection?.on('collect', (message) => {
			let role = message.mentions.roles.first() || interaction.guild?.roles.cache.get(message.content)

			if (!role) {
				lastmsg.edit({ embeds: [basicEmbed('ALERT', 'Invalid Role; please try again later.')] })
				reject()
			} else {
				lastmsg.edit({
					embeds: [embed],
					components: [
						new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
							new ButtonBuilder()
								.setCustomId('nil')
								.setLabel('You have selected @' + role.name)
								.setStyle(ButtonStyle.Secondary)
								.setDisabled(true),
						),
					],
				})
				resolve(role)
			}
		})

		collection?.on('end', (collected) => {
			if (collected.size == 0) {
				lastmsg.edit({ embeds: [basicEmbed('WARNING', 'You took too long to respond; Interaction Cancelled.')] })
				reject()
			}
		})
	})
}

export function yesNoQuestion(interaction: CommandInteraction<CacheType> | ButtonInteraction<CacheType>, question: string, skipable: boolean, timed?: number, footer?: string): Promise<Boolean | null> {
	return new Promise(async (resolve, reject) => {
		let embed = new EmbedBuilder().setDescription(question).setColor(defaultColour)

		if (skipable) {
			embed.setFooter({ text: 'Enter skip to skip this input.' })
		}

		if (footer) {
			embed.setFooter({ text: footer })
		}

		const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(new ButtonBuilder().setCustomId('yes').setLabel('Yes').setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId('no').setLabel('No').setStyle(ButtonStyle.Secondary))

		let lastmsg: Message | InteractionResponse

		if (interaction.replied) {
			lastmsg = await interaction.followUp({ embeds: [embed], components: [actionRow] })
		} else {
			lastmsg = await interaction.reply({ embeds: [embed], components: [actionRow] })
		}

		const collection = interaction.channel?.awaitMessageComponent({
			filter: (response) => {
				response.deferUpdate()
				return response.user.id == interaction.user.id && (response.customId == 'yes' || response.customId == 'no')
			},
			componentType: ComponentType.Button,
			time: timed || 300_000,
			dispose: true,
		})

		collection?.then((btnInteraction) => {
			if (btnInteraction.customId == 'yes') {
				resolve(true)
				lastmsg.edit({ embeds: [embed], components: [new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(new ButtonBuilder().setCustomId('nil').setLabel('You have selected YES').setStyle(ButtonStyle.Success).setDisabled(true))] })
			} else {
				resolve(false)
				lastmsg.edit({ embeds: [embed], components: [new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(new ButtonBuilder().setCustomId('nil').setLabel('You have selected NO').setStyle(ButtonStyle.Secondary).setDisabled(true))] })
			}
		})
	})
}

export function usersQuestion(interaction: CommandInteraction<CacheType> | ButtonInteraction<CacheType>, question: string, timed?: number, footer?: string): Promise<User[]> {
	return new Promise(async (resolve, reject) => {
		let embed = new EmbedBuilder().setDescription(question).setColor(defaultColour)

		if (footer) {
			embed.setFooter({ text: footer })
		}

		let lastmsg: Message | InteractionResponse

		if (interaction.replied) {
			lastmsg = await interaction.followUp({ embeds: [embed] })
		} else {
			lastmsg = await interaction.reply({ embeds: [embed] })
		}

		const collection = interaction.channel?.createMessageCollector({
			filter: (response: Message<boolean>) => {
				return response.author.id == interaction.user.id
			},
			max: 1,
			time: timed || 300_000,
		})

		collection?.on('collect', async (message) => {
			// let users = message.mentions.users;
			const regex = /<@(\d+)>/g

			let users: User[] = []
			let match

			while ((match = regex.exec(message.content)) !== null) {
				const user = await interaction.client.users.fetch(match[1])
				if (user) users.push(user)
			}

			if (users.length === 0) {
				lastmsg.edit({ embeds: [basicEmbed('ALERT', 'Invalid User; please try again later.')] })
				reject()
			} else {
				resolve(users)
			}
		})

		collection?.on('end', (collected) => {
			if (collected.size == 0) {
				lastmsg.edit({ embeds: [basicEmbed('WARNING', 'You took too long to respond; Interaction Cancelled.')] })
				reject()
			}
		})
	})
}

export function numberQuestion(interaction: CommandInteraction<CacheType> | ButtonInteraction<CacheType>, question: string, timed?: number, footer?: string): Promise<number> {
	return new Promise(async (resolve, reject) => {
		let embed = new EmbedBuilder().setDescription(question).setColor(defaultColour)

		if (footer) {
			embed.setFooter({ text: footer })
		}

		let lastmsg: Message | InteractionResponse

		if (interaction.replied) {
			lastmsg = await interaction.followUp({ embeds: [embed] })
		} else {
			lastmsg = await interaction.reply({ embeds: [embed] })
		}

		const collection = interaction.channel?.createMessageCollector({
			filter: (response: Message<boolean>) => {
				return response.author.id == interaction.user.id
			},
			max: 1,
			time: timed || 300_000,
		})

		collection?.on('collect', async (message) => {
			const num = Number(message.content)

			if (!isNaN(num) && Number.isInteger(num) && num >= 0) {
				resolve(Number(message.content))
			} else {
				lastmsg.edit({ embeds: [basicEmbed('ALERT', 'Invalid Number; please try again later.')] })
				reject('Invalid Number Provided')
			}
		})

		collection?.on('end', (collected) => {
			if (collected.size == 0) {
				lastmsg.edit({ embeds: [basicEmbed('WARNING', 'You took too long to respond; Interaction Cancelled.')] })
				reject()
			}
		})
	})
}

export function imageQuestion(interaction: CommandInteraction<CacheType> | ButtonInteraction<CacheType>, question: string, skipable: boolean, timed?: number, footer?: string): Promise<string | null> {
	return new Promise(async (resolve, reject) => {
		let embed = new EmbedBuilder()
			.setDescription(question)
			.setFooter({ text: footer || skipable ? 'Enter skip to skip this input.' : '' })
			.setColor(defaultColour)

		let lastmsg: Message | InteractionResponse

		if (interaction.replied) {
			lastmsg = await interaction.followUp({ embeds: [embed] })
		} else {
			lastmsg = await interaction.reply({ embeds: [embed] })
		}

		const collection = interaction.channel?.createMessageCollector({
			filter: (response: Message<boolean>) => {
				return response.author.id == interaction.user.id
			},
			max: 1,
			time: timed || 300_000,
		})

		collection?.on('collect', (message) => {
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

		collection?.on('end', (collected) => {
			if (collected.size == 0) {
				lastmsg.edit({ embeds: [basicEmbed('WARNING', 'You took too long to respond; Interaction Cancelled.')] })
				reject()
			}
		})
	})
}
