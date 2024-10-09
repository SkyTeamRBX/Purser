import { channel } from 'diagnostics_channel'
import { EmbedBuilder, Message, InteractionReplyOptions, ActionRowBuilder, ButtonBuilder, ButtonStyle, BaseInteraction, RepliableInteraction, GuildTextBasedChannel, TextChannel, Role, GuildMember, User, ButtonInteraction, Attachment, ChannelType} from 'discord.js'
import { basicEmbed } from './basicEmbed.js'

const defaultColour = '#2b2d31'
const defaultTimeout = 120_000 // 2 minutes

type FunctionArgs = {
	interaction: RepliableInteraction
	question: string
	skippable?: boolean
	extra_components?: ButtonBuilder[]
	extra_embeds?: EmbedBuilder[]
	timeout?: number
}

type FunctionResponse<T> = {
	[x: string]: any
	response: T
	interaction: BaseInteraction
	originalMessage: Message
}

function createEmbed(question: string): EmbedBuilder {
	return new EmbedBuilder().setDescription(question).setColor(defaultColour)
}

function createSkipButton(): ButtonBuilder {
	return new ButtonBuilder().setCustomId('skip').setLabel('Skip').setStyle(ButtonStyle.Secondary).setEmoji('<:chevrongrey:1265399459886534730>')
}

function createEmptyButton(contents: string, style?: ButtonStyle): ButtonBuilder {
	return new ButtonBuilder().setCustomId('nil').setLabel(contents).setStyle(style || ButtonStyle.Secondary).setDisabled(true)
}

function createCollectors(Message: Message, filter: (Message: Message) => boolean, OldReplyOptions: InteractionReplyOptions, FunctionArgs: FunctionArgs): Promise<Message<boolean> | null> {
	return new Promise((resolve, reject) => {
		try {
			let a
			Message.channel
				.awaitMessages({
					filter,
					max: 1,
					time: FunctionArgs.timeout || defaultTimeout,
					errors: ['time'],
				})
				.then((collected) => {
					const response = collected.first()

					if (!response) {
						resolve(null)
					} else {
						resolve(response)
					}
				})
				.catch(() => {
					reject('No response was given.')
				})

			if (FunctionArgs.skippable) {
				a = Message.awaitMessageComponent({
					filter: (i) => i.user.id === FunctionArgs.interaction.user.id,
					time: FunctionArgs.timeout || defaultTimeout,
				})
					.then((i) => {
						i.update({ components: [
							new ActionRowBuilder<ButtonBuilder>()
								.addComponents(createEmptyButton('You have skipped this question.'))
						] })
						if (i.customId === 'skip') {
							resolve(null)
						}
					})
					.catch(() => {
						// does nothing
					})
			}
		} catch (error) {
			Message.edit({ content: 'This process was not complete.' })
			reject(error)
		}
	})
}
/**
 * Collect an answer as a string.
 *
 * @argument interaction - Inital Interaction.
 * @argument question - The question to ask.
 * @argument skippable - Whether the question is skippable.
 * @argument extra_embed - An extra embed to add.
 * @argument timeout - The time in milliseconds, for the timeout of the question.
 * @returns The response from the user, including the original message and interaction.
 */
export async function stringQuestion(FunctionArgs: FunctionArgs): Promise<FunctionResponse<string | null>> {
	return new Promise((resolve, reject) => {
		const originalEmbed: EmbedBuilder = createEmbed(FunctionArgs.question)
		const interaction: RepliableInteraction = FunctionArgs.interaction

		let embeds: EmbedBuilder[] = [originalEmbed]
		let actionRow = new ActionRowBuilder<ButtonBuilder>()
		let components: ButtonBuilder[] = []

		const replyOptions: InteractionReplyOptions = {}

		if (FunctionArgs.extra_embeds) {
			embeds = [...FunctionArgs.extra_embeds, ...embeds]
		}

		if (FunctionArgs.extra_components) {
			components = [...FunctionArgs.extra_components]
		}

		if (FunctionArgs.skippable) {
			components.push(createSkipButton())
		}

		if (components.length > 0) {
			actionRow.addComponents(...components)
			replyOptions.components = [actionRow]
		}

		replyOptions.embeds = embeds

		const message = interaction.replied ? interaction.followUp(replyOptions) : interaction.reply(replyOptions)

		message.then(async (i) => {
			const msg: Message<boolean> = await i.fetch()

			createCollectors(msg, (msg) => msg.author.id === FunctionArgs.interaction.user.id, replyOptions, FunctionArgs)
				.then((response) => {
					resolve({ response: response ? response.content : null, interaction, originalMessage: msg })

					if (response !== null) {
						response.delete()

						if (response.content.length < 80 - 19) {
							msg.edit({
								embeds: embeds,
								components: [new ActionRowBuilder<ButtonBuilder>().addComponents(createEmptyButton(`You have answered: ${response.content}`))],
							})
						} else {
							msg.edit({
								embeds: embeds,
								components: [new ActionRowBuilder<ButtonBuilder>().addComponents(createEmptyButton(`You have answered: ${response.content.substring(0, (80 - 19)-3)}...`))],
							})
						}
					}
				})
				.catch((error) => {
					reject(error)
					msg.edit({
						embeds: embeds,
						components: [],
					})
				})
		})
	})
}

/**
 * Collect an answer as a number.
 *
 * @argument interaction - Inital Interaction.
 * @argument question - The question to ask.
 * @argument skippable - Whether the question is skippable.
 * @argument extra_embed - An extra embed to add.
 * @argument timeout - The time in milliseconds, for the timeout of the question.
 * @returns The response from the user, including the original message and interaction.
 */
export async function numberQuestion(FunctionArgs: FunctionArgs): Promise<FunctionResponse<number | null>> {
	return new Promise((resolve, reject) => {
		const originalEmbed: EmbedBuilder = createEmbed(FunctionArgs.question)
		const interaction: RepliableInteraction = FunctionArgs.interaction

		let embeds: EmbedBuilder[] = [originalEmbed]
		let actionRow = new ActionRowBuilder<ButtonBuilder>()
		let components: ButtonBuilder[] = []

		const replyOptions: InteractionReplyOptions = {}

		if (FunctionArgs.extra_embeds) {
			embeds = [...FunctionArgs.extra_embeds, ...embeds]
		}

		if (FunctionArgs.extra_components) {
			components = [...FunctionArgs.extra_components]
		}

		if (FunctionArgs.skippable) {
			components.push(createSkipButton())
		}

		if (components.length > 0) {
			actionRow.addComponents(...components)
			replyOptions.components = [actionRow]
		}

		replyOptions.embeds = embeds

		const message = interaction.replied ? interaction.followUp(replyOptions) : interaction.reply(replyOptions)

		message.then(async (i) => {
			const msg: Message<boolean> = await i.fetch()

			createCollectors(msg, (msg) => msg.author.id === FunctionArgs.interaction.user.id, replyOptions, FunctionArgs)
				.then((response) => {
					if (response && Number.isNaN(Number(response.content))) {
						msg.edit({
							embeds: embeds,
							components: [new ActionRowBuilder<ButtonBuilder>().addComponents(createEmptyButton(`That is not a number.`))],
						})

						reject('Not a number.')

						return;
					}

					resolve({ response: response ? Number(response.content) : null, interaction, originalMessage: msg })


					if (response !== null) {
						response.delete()

						if (response.content.length < 80 - 19) {
							msg.edit({
								embeds: embeds,
								components: [new ActionRowBuilder<ButtonBuilder>().addComponents(createEmptyButton(`You have answered: ${response.content}`))],
							})
						} else {
							msg.edit({
								embeds: embeds,
								components: [new ActionRowBuilder<ButtonBuilder>().addComponents(createEmptyButton(`You have answered: ${response.content.substring(0, (80 - 19)-3)}...`))],
							})
						}
					}
				})
				.catch((error) => {
					reject(error)
					msg.edit({
						embeds: embeds,
						components: [],
					})
				})
		})
	})
}

/**
 * Collect an answer as a GuildTextBasedChannel.
 *
 * @argument interaction - Inital Interaction.
 * @argument question - The question to ask.
 * @argument skippable - Whether the question is skippable.
 * @argument extra_embed - An extra embed to add.
 * @argument timeout - The time in milliseconds, for the timeout of the question.
 * @returns The response from the user, including the original message and interaction.
 */
export async function textChannelQuestion(FunctionArgs: FunctionArgs): Promise<FunctionResponse<GuildTextBasedChannel | null>> {
	return new Promise((resolve, reject) => {
		const originalEmbed: EmbedBuilder = createEmbed(FunctionArgs.question)
		const interaction: RepliableInteraction = FunctionArgs.interaction

		let embeds: EmbedBuilder[] = [originalEmbed]
		let actionRow = new ActionRowBuilder<ButtonBuilder>()
		let components: ButtonBuilder[] = []

		const replyOptions: InteractionReplyOptions = {}

		if (FunctionArgs.extra_embeds) {
			embeds = [...FunctionArgs.extra_embeds, ...embeds]
		}

		if (FunctionArgs.extra_components) {
			components = [...FunctionArgs.extra_components]
		}

		if (FunctionArgs.skippable) {
			components.push(createSkipButton())
		}

		if (components.length > 0) {
			actionRow.addComponents(...components)
			replyOptions.components = [actionRow]
		}

		replyOptions.embeds = embeds

		const message = interaction.replied ? interaction.followUp(replyOptions) : interaction.reply(replyOptions)

		message.then(async (i) => {
			const msg: Message<boolean> = await i.fetch()

			createCollectors(msg, (msg) => msg.author.id === FunctionArgs.interaction.user.id && msg.mentions.channels.first() !== undefined, replyOptions, FunctionArgs)
				.then(async (response) => {
					const channel: TextChannel | null = response ? await response?.mentions.channels.first() as TextChannel : null

					resolve({ response: channel, interaction, originalMessage: msg })

					if (response !== null && channel !== null) {
						response.delete()

						if (channel.name.length < 80 - 19) {
							msg.edit({
								embeds: embeds,
								components: [new ActionRowBuilder<ButtonBuilder>().addComponents(createEmptyButton(`You have answered: #${channel.name}`))],
							})
						}
					}
				})
				.catch((error) => {
					reject(error)
					msg.edit({
						embeds: embeds,
						components: [],
					})
				})
		})
	})
}

/**
 * Collect an answer as a Role.
 *
 * @argument interaction - Inital Interaction.
 * @argument question - The question to ask.
 * @argument skippable - Whether the question is skippable.
 * @argument extra_embed - An extra embed to add.
 * @argument timeout - The time in milliseconds, for the timeout of the question.
 * @returns The response from the user, including the original message and interaction.
 */
export async function roleQuestion(FunctionArgs: FunctionArgs): Promise<FunctionResponse<Role | null>> {
	return new Promise((resolve, reject) => {
		const originalEmbed: EmbedBuilder = createEmbed(FunctionArgs.question)
		const interaction: RepliableInteraction = FunctionArgs.interaction

		let embeds: EmbedBuilder[] = [originalEmbed]
		let actionRow = new ActionRowBuilder<ButtonBuilder>()
		let components: ButtonBuilder[] = []

		const replyOptions: InteractionReplyOptions = {}

		if (FunctionArgs.extra_embeds) {
			embeds = [...FunctionArgs.extra_embeds, ...embeds]
		}

		if (FunctionArgs.extra_components) {
			components = [...FunctionArgs.extra_components]
		}

		if (FunctionArgs.skippable) {
			components.push(createSkipButton())
		}

		if (components.length > 0) {
			actionRow.addComponents(...components)
			replyOptions.components = [actionRow]
		} 

		replyOptions.embeds = embeds

		const message = interaction.replied ? interaction.followUp(replyOptions) : interaction.reply(replyOptions)

		message.then(async (i) => {
			const msg: Message<boolean> = await i.fetch()

			createCollectors(msg, (msg) => msg.author.id === FunctionArgs.interaction.user.id && msg.mentions.roles.first() !== undefined, replyOptions, FunctionArgs)
				.then(async (response) => {
					if (!response) return reject('message lost?')
					const role: Role = await response.mentions.roles.first() as Role

					resolve({ response: role, interaction, originalMessage: msg })

					if (response !== null) {
						response.delete()

						if (role.name.length < 80 - 19) {
							msg.edit({
								embeds: embeds,
								components: [new ActionRowBuilder<ButtonBuilder>().addComponents(createEmptyButton(`You have answered: @${role.name}`))],
							})
						}
					}
				})
				.catch((error) => {
					reject(error)
					msg.edit({
						embeds: embeds,
						components: [],
					})
				})
		})
	})
}

/**
 * Collect an answer as a User.
 *
 * @argument interaction - Inital Interaction.
 * @argument question - The question to ask.
 * @argument skippable - Whether the question is skippable.
 * @argument extra_embed - An extra embed to add.
 * @argument timeout - The time in milliseconds, for the timeout of the question.
 * @returns The response from the user, including the original message and interaction.
 */
export async function usersQuestion(FunctionArgs: FunctionArgs): Promise<FunctionResponse<User[] | null>> {
	return new Promise((resolve, reject) => {
		const originalEmbed: EmbedBuilder = createEmbed(FunctionArgs.question)
		const interaction: RepliableInteraction = FunctionArgs.interaction

		let embeds: EmbedBuilder[] = [originalEmbed]
		let actionRow = new ActionRowBuilder<ButtonBuilder>()
		let components: ButtonBuilder[] = []

		const replyOptions: InteractionReplyOptions = {}

		if (FunctionArgs.extra_embeds) {
			embeds = [...FunctionArgs.extra_embeds, ...embeds]
		}

		if (FunctionArgs.extra_components) {
			components = [...FunctionArgs.extra_components]
		}

		if (FunctionArgs.skippable) {
			components.push(createSkipButton())
		}

		if (components.length > 0) {
			actionRow.addComponents(...components)
			replyOptions.components = [actionRow]
		} 

		replyOptions.embeds = embeds

		const message = interaction.replied ? interaction.followUp(replyOptions) : interaction.reply(replyOptions)

		message.then(async (i) => {
			const msg: Message<boolean> = await i.fetch()

			createCollectors(msg, (msg) => msg.author.id === FunctionArgs.interaction.user.id && msg.mentions.users.first() !== undefined, replyOptions, FunctionArgs)
				.then(async (response) => {
					if (!response) return reject('message lost?')
					const users: User[] = await response.mentions.users.toJSON() as User[]

					resolve({ response: users, interaction, originalMessage: msg })

					if (response !== null) {
						response.delete()

						if (users.length === 1) {
							msg.edit({
								embeds: embeds,
								components: [new ActionRowBuilder<ButtonBuilder>().addComponents(createEmptyButton(`You have answered: @${users[0].username}`))],
							})
						} else {
							msg.edit({
								embeds: embeds,
								components: [new ActionRowBuilder<ButtonBuilder>().addComponents(createEmptyButton(`You have answered with ${users.length} users`))],
							})
						}
					}
				})
				.catch((error) => {
					reject({
						error: error,
						interaction,
						originalMessage: msg
					})
					msg.edit({
						embeds: embeds,
						components: [],
					})
				})
		})
	})
}


/**
 * Collect an answer as a GuildMember.
 *
 * @argument interaction - Inital Interaction.
 * @argument question - The question to ask.
 * @argument skippable - Whether the question is skippable.
 * @argument extra_embed - An extra embed to add.
 * @argument timeout - The time in milliseconds, for the timeout of the question.
 * @returns The response from the user, including the original message and interaction.
 */
export async function guildMemberQuestion(FunctionArgs: FunctionArgs): Promise<FunctionResponse<GuildMember[] | null>> {
	return new Promise((resolve, reject) => {
		const originalEmbed: EmbedBuilder = createEmbed(FunctionArgs.question)
		const interaction: RepliableInteraction = FunctionArgs.interaction

		let embeds: EmbedBuilder[] = [originalEmbed]
		let actionRow = new ActionRowBuilder<ButtonBuilder>()
		let components: ButtonBuilder[] = []

		const replyOptions: InteractionReplyOptions = {}

		if (FunctionArgs.extra_embeds) {
			embeds = [...FunctionArgs.extra_embeds, ...embeds]
		}

		if (FunctionArgs.extra_components) {
			components = [...FunctionArgs.extra_components]
		}

		if (FunctionArgs.skippable) {
			components.push(createSkipButton())
		}

		if (components.length > 0) {
			actionRow.addComponents(...components)
			replyOptions.components = [actionRow]
		}

		replyOptions.embeds = embeds

		const message = interaction.replied ? interaction.followUp(replyOptions) : interaction.reply(replyOptions)

		message.then(async (i) => {
			const msg: Message<boolean> = await i.fetch()

			createCollectors(msg, (msg) => msg.author.id === FunctionArgs.interaction.user.id && msg.mentions.members?.first() !== undefined, replyOptions, FunctionArgs)
				.then(async (response) => {
					if (!response) return reject('message lost?')

					// Retrieve GuildMembers from User IDs
					const members = response.mentions.members?.map(user => user)

					if (!members || members?.length === 0) {
						return resolve({ response: null, interaction, originalMessage: msg })
					}

					resolve({ response: members, interaction, originalMessage: msg })

					// Edit the message based on user count
					if (response !== null) {
						response.delete()

						const userMessage = members.length === 1 ? `You have answered: @${members[0].user.username}` : `You have answered with ${members.length} members`

						msg.edit({
							embeds: embeds,
							components: [new ActionRowBuilder<ButtonBuilder>().addComponents(createEmptyButton(userMessage))],
						})
					}
				})
				.catch((error) => {
					reject({
						error: error,
						interaction,
						originalMessage: msg,
					})
					msg.edit({
						embeds: embeds,
						components: [],
					})
				})
		})
	})
}


interface Option {
	id: string
	option: string
	style?: ButtonStyle
	emoji?: string
}

/**
 * Collect an answer as options. 
 *
 * @argument interaction - Inital Interaction.
 * @argument question - The question to ask.
 * @argument skippable - Whether the question is skippable.
 * @argument extra_embed - An extra embed to add.
 * @argument timeout - The time in milliseconds, for the timeout of the question.
 * @returns The response from the user, including the original message and interaction.
 */
export async function optionQuestion<T extends Option[]>(FunctionArgs: FunctionArgs, options: [...T]): Promise<FunctionResponse<T[number]['id'] | null>> {
	return new Promise((resolve, reject) => {
		// const originalEmbed: EmbedBuilder = createEmbed(FunctionArgs.question)
		const interaction: RepliableInteraction = FunctionArgs.interaction

		let embeds: EmbedBuilder[] = []
		let actionRow = new ActionRowBuilder<ButtonBuilder>()
		let components: ButtonBuilder[] = []

		const replyOptions: InteractionReplyOptions = {}

		if (FunctionArgs.extra_embeds) {
			embeds = [...FunctionArgs.extra_embeds, ...embeds]
		}

		options.forEach((option) => {
			const btn = new ButtonBuilder().setCustomId(option.id).setLabel(option.option)

			if (option.style) {btn.setStyle(option.style)} else {btn.setStyle(ButtonStyle.Secondary)}
			if (option.emoji) btn.setEmoji(option.emoji)

			components.push(btn)
		})

		if (FunctionArgs.extra_components) {
			components = [...components, ...FunctionArgs.extra_components]
		}

		if (FunctionArgs.skippable) {
			components.push(createSkipButton())
		}

		if (components.length > 0) {
			actionRow.addComponents(...components)
			replyOptions.components = [actionRow]
		}

		replyOptions.embeds = embeds
		replyOptions.content = FunctionArgs.question

		const message = interaction.replied ? interaction.followUp(replyOptions) : interaction.reply(replyOptions)

		message.then(async (i) => {
			const msg: Message<boolean> = await i.fetch()

			msg.awaitMessageComponent({
				filter: (i) => i.user.id === FunctionArgs.interaction.user.id,
				time: FunctionArgs.timeout || defaultTimeout,
			}).then((btnInteraction) => {
				if (!btnInteraction.isButton()) return;
				
				if (btnInteraction.customId === 'skip') {
					btnInteraction.update({ components: [
						new ActionRowBuilder<ButtonBuilder>()
							.addComponents(createEmptyButton('You have skipped this question.'))
					] })
					
					return resolve({ response: null, interaction: interaction, originalMessage: msg})
				} else if (options.map(o => o.id).includes(btnInteraction.customId)) {
					btnInteraction.update({ 
						components: [new ActionRowBuilder<ButtonBuilder>().addComponents(createEmptyButton(`You have answered: ${btnInteraction.customId}`, btnInteraction.component.style))],
 					})

					return resolve({ response: btnInteraction.customId, interaction: interaction, originalMessage: msg})
				}
			}).catch((error) => {
				reject({
					error: error,
					interaction,
					originalMessage: msg
				});
			})
		})
	})
}

/**
 * Collect an answer as a boolean.
 *
 * @argument interaction - Inital Interaction.
 * @argument question - The question to ask.
 * @argument skippable - Whether the question is skippable.
 * @argument extra_embed - An extra embed to add.
 * @argument timeout - The time in milliseconds, for the timeout of the question.
 * @returns The response from the user, including the original message and interaction.
 */
export async function booleanQuestion(FunctionArgs: FunctionArgs): Promise<FunctionResponse<boolean | null>> {
	return new Promise((resolve, reject) => {
		const originalEmbed: EmbedBuilder = createEmbed(FunctionArgs.question)
		const interaction: RepliableInteraction = FunctionArgs.interaction

		let embeds: EmbedBuilder[] = [originalEmbed]
		let actionRow = new ActionRowBuilder<ButtonBuilder>()
		let components: ButtonBuilder[] = []

		const replyOptions: InteractionReplyOptions = {}

		if (FunctionArgs.extra_embeds) {
			embeds = [...FunctionArgs.extra_embeds, ...embeds]
		}

		components = [
			new ButtonBuilder()
				.setCustomId('true')
				.setEmoji('<:goodtransparent:1286651511413411871>')
				.setStyle(ButtonStyle.Success),
			new ButtonBuilder()
				.setCustomId('false')
				.setEmoji('<:badtransparent:1286651526005395466>')
				.setStyle(ButtonStyle.Danger)
		]

		if (FunctionArgs.extra_components) {
			components = [...components, ...FunctionArgs.extra_components]
		}

		if (FunctionArgs.skippable) {
			components.push(createSkipButton())
		}

		if (components.length > 0) {
			actionRow.addComponents(...components)
			replyOptions.components = [actionRow]
		}

		replyOptions.embeds = embeds

		const message = interaction.replied ? interaction.followUp(replyOptions) : interaction.reply(replyOptions)

		message.then(async (i) => {
			const msg: Message<boolean> = await i.fetch()

			msg.awaitMessageComponent({
				filter: (i) => i.user.id === FunctionArgs.interaction.user.id,
				time: FunctionArgs.timeout || defaultTimeout,
			}).then((btnInteraction) => {
				if (!btnInteraction.isButton()) return;
				
				if (btnInteraction.customId === 'skip') {
					btnInteraction.update({ components: [
						new ActionRowBuilder<ButtonBuilder>()
							.addComponents(createEmptyButton('You have skipped this question.'))
					] })
					
					return resolve({ response: null, interaction: interaction, originalMessage: msg})
				} else {
					btnInteraction.update({ 
						components: [new ActionRowBuilder<ButtonBuilder>().addComponents(createEmptyButton(`You have answered: ${btnInteraction.customId}`, btnInteraction.component.style))],
 					})

					let option = null

					if (btnInteraction.customId === 'yes') {
						option = true
					} else {
						option = false
					}

					return resolve({ response: option, interaction: interaction, originalMessage: msg})
				}
			}).catch((error) => {
				reject({
					error: error,
					interaction,
					originalMessage: msg
				});
			})
		})
	})
}

// Here lies attachment question - it was unneeded for purser
/**
 * Collect an answer as an Attachment.
 *
 * @argument interaction - Inital Interaction.
 * @argument question - The question to ask.
 * @argument skippable - Whether the question is skippable.
 * @argument extra_embed - An extra embed to add.
 * @argument timeout - The time in milliseconds, for the timeout of the question.
 * @returns The response from the user, including the original message and interaction.
 */
export async function attachmentQuestion(FunctionArgs: FunctionArgs): Promise<FunctionResponse<Attachment | null>> {
	return new Promise((resolve, reject) => {
		const originalEmbed: EmbedBuilder = createEmbed(FunctionArgs.question)
		const interaction: RepliableInteraction = FunctionArgs.interaction

		let embeds: EmbedBuilder[] = [originalEmbed]
		let actionRow = new ActionRowBuilder<ButtonBuilder>()
		let components: ButtonBuilder[] = []

		const replyOptions: InteractionReplyOptions = {}

		if (FunctionArgs.extra_embeds) {
			embeds = [...FunctionArgs.extra_embeds, ...embeds]
		}

		if (FunctionArgs.extra_components) {
			components = [...FunctionArgs.extra_components]
		}

		if (FunctionArgs.skippable) {
			components.push(createSkipButton())
		}

		if (components.length > 0) {
			actionRow.addComponents(...components)
			replyOptions.components = [actionRow]
		} 

		replyOptions.embeds = embeds

		const message = interaction.replied ? interaction.followUp(replyOptions) : interaction.reply(replyOptions)

		message.then(async (i) => {
			const msg: Message<boolean> = await i.fetch()

			createCollectors(msg, (msg) => msg.author.id === FunctionArgs.interaction.user.id && msg.attachments.first() !== undefined, replyOptions, FunctionArgs)
				.then(async (response) => {
					let attachment: Attachment = await response?.attachments.first() as Attachment

					const download = await interaction.followUp({ embeds: [basicEmbed('WAITING', 'Downloading...')] })

					if (attachment) {
						const logChannel = (await (await interaction.client.guilds.fetch(process.env.TEST_GUILD_ID)).channels.fetch()).filter(channel => channel?.type === ChannelType.GuildText).first()
						if (logChannel) {
							attachment = (await logChannel.send({files: [attachment]})).attachments.first() as Attachment
						}
					}

					download.delete();

					resolve({ response: attachment || null, interaction, originalMessage: msg })

					if (response !== null) {
						response.delete()

						if (attachment.name.length < 80 - 19) {
							msg.edit({
								embeds: embeds,
								components: [new ActionRowBuilder<ButtonBuilder>().addComponents(createEmptyButton(`You have answered: ${attachment.name}`))],
							})
						}
					}
				})
				.catch((error) => {
					reject(error)
					msg.edit({
						embeds: embeds,
						components: [],
					})
				})
		})
	})
}