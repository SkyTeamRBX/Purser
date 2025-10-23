import { ButtonInteraction, ButtonStyle, ChannelSelectMenuBuilder, CommandInteraction, GuildTextBasedChannel, InteractionResponse, MediaGalleryBuilder, MediaGalleryItemBuilder, MessageFlags, SectionBuilder, SelectMenuInteraction, SeparatorBuilder, SeparatorSpacingSize } from 'discord.js'
import { ActionRowBuilder, ButtonBuilder, ContainerBuilder, TextDisplayBuilder } from 'discord.js'
import { ButtonComponent, Discord, MetadataStorage, SelectMenuComponent, Slash } from 'discordx'

@Discord()
export class ShoutCommand {
	public ongoingMessage: InteractionResponse | null = null
	public displayContainer: ContainerBuilder | null = null
	private started: boolean = false
	private actionRows: ActionRowBuilder<ButtonBuilder | ChannelSelectMenuBuilder>[] = [
		new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder().setCustomId('add_text').setLabel('Add Text').setStyle(ButtonStyle.Secondary),
			new ButtonBuilder().setCustomId('add_separator').setLabel('Add Separator').setStyle(ButtonStyle.Secondary),
			new ButtonBuilder().setCustomId('add_media').setLabel('Add Media').setStyle(ButtonStyle.Secondary),
			new ButtonBuilder().setCustomId('add_section').setLabel('Add Section').setStyle(ButtonStyle.Secondary),
			new ButtonBuilder().setCustomId('delete_last').setLabel('Delete Last Component').setStyle(ButtonStyle.Danger),
		),
		new ActionRowBuilder<ChannelSelectMenuBuilder | ButtonBuilder>().addComponents(
			new ChannelSelectMenuBuilder().setCustomId('send_to_channel').setPlaceholder('📢  Send to channel'),
			// new ButtonBuilder().setCustomId('cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger),
		),
	]

	async updatePreview() {
		if (this.ongoingMessage && this.displayContainer) {
			if (this.started) {
				this.displayContainer.spliceComponents(0, 1)
				this.started = false
			}
			this.ongoingMessage.edit({ components: [this.displayContainer, ...this.actionRows] })
		}
	}

	@Slash({
		name: 'shout',
		description: 'Shout a message to a channel',
		dmPermission: false,
		defaultMemberPermissions: ['Administrator'],
	})
	async execute(interaction: CommandInteraction): Promise<void> {
		if (!interaction.isRepliable()) return

		if (this.ongoingMessage) {
			this.ongoingMessage.edit({
				flags: [MessageFlags.IsComponentsV2],
				components: [
					new TextDisplayBuilder({
						content: 'Cancelled. Cannot run more than 1 `/shout` command at a time.',
					}),
				],
			})
			this.ongoingMessage = null
			this.displayContainer = null
		}

		this.displayContainer = new ContainerBuilder().addTextDisplayComponents(
			new TextDisplayBuilder({
				content: '-# There is currently nothing in this shout. Use the buttons below to add components to the message!',
			}),
		)

		this.started = true

		//@ts-ignore
		this.ongoingMessage = await interaction.reply({
			flags: [MessageFlags.IsComponentsV2],
			components: [this.displayContainer, ...this.actionRows],
		})
	}

	@ButtonComponent({ id: 'add_text' })
	async addText(interaction: ButtonInteraction) {
		if (!this.displayContainer) return
		if (!interaction.isRepliable()) return

		const reply = await interaction.reply({
			content: 'Please enter the text that you would like to add.',
			flags: [MessageFlags.Ephemeral],
		})

		interaction.channel
			?.awaitMessages({
				filter: (m) => m.author.id === interaction.user.id,
				max: 1,
				time: 60000,
				errors: ['time'],
			})
			.then(async (collected) => {
				const msg = collected.first()

				if (msg && this.displayContainer) {
					this.displayContainer.addTextDisplayComponents(
						new TextDisplayBuilder({
							content: msg.content,
						}),
					)

					reply.delete().catch(() => {})
					msg.delete().catch(() => {})

					this.updatePreview()
				}
			})
			.catch(() => {
				interaction.editReply({
					content: 'You did not provide any text in time.',
				})
			})

		// stringQuestion({
		// 	interaction,
		// 	question: 'Please enter the text that you would like to add.',
		// })
		// 	.then((value) => {
		// 		if (value.response && this.displayContainer) {
		// 			this.displayContainer.addTextDisplayComponents(
		// 				new TextDisplayBuilder({
		// 					content: value.response,
		// 				}),
		// 			)

		// 			this.updatePreview()

		//             if (value.originalMessage && value.originalMessage.deletable) {
		//                 value.originalMessage.delete().catch(() => {});
		//             }
		// 		}
		// 	})
		// 	.catch((err) => {
		// 		return err
		// 	})
	}

	@ButtonComponent({ id: 'add_separator' })
	async addSeparator(interaction: ButtonInteraction) {
		if (!this.displayContainer) return
		if (!interaction.isRepliable()) return

		if (this.displayContainer) {
			this.displayContainer.addSeparatorComponents(
				new SeparatorBuilder({
					spacing: SeparatorSpacingSize.Large,
				}),
			)

			interaction.deferUpdate()
			this.updatePreview()
		}
	}

	@ButtonComponent({ id: 'add_media' })
	async addMedia(interaction: ButtonInteraction) {
		if (!this.displayContainer) return
		if (!interaction.isRepliable()) return

		if (this.displayContainer) {
			let reply = await interaction.reply({
				content: 'Please upload up to 10 images or videos to add to the shout.',
				flags: [MessageFlags.Ephemeral],
			})

			interaction.channel
				?.awaitMessages({
					filter: (m) => m.author.id === interaction.user.id && m.attachments.size > 0,
					max: 1,
					time: 60000, // 1 minute
					errors: ['time'],
				})
				.then(async (collected) => {
					const originalmsg = collected.first()

					if (originalmsg) {
						const logschannel = (await interaction.client.channels.fetch(process.env.LOG_CHANNEL_ID)) as GuildTextBasedChannel
						const logged = await logschannel.send({
							content: 'This is the logged media for a shout by ' + interaction.user.tag,
							files: originalmsg.attachments.map((a) => a.url),
						})
						let MediaGallery = new MediaGalleryBuilder()

						logged.attachments.forEach((attachment) => {
							MediaGallery.addItems(
								new MediaGalleryItemBuilder({
									media: {
										url: attachment.url,
									},
								}),
							)
						})

						this.displayContainer.addMediaGalleryComponents(MediaGallery)

						reply.delete().catch(() => {})
						originalmsg.delete().catch(() => {})

						this.updatePreview()
					}
				})
		}
	}

	@ButtonComponent({ id: 'add_section' })
	async addSection(interaction: ButtonInteraction) {
		if (!this.displayContainer) return
		if (!interaction.isRepliable()) return

		let reply = await interaction.reply({
			flags: [MessageFlags.Ephemeral],
			content: 'Please enter a text message and a labelled hyperlink with a space in between. For example: `Label [Button Label](https://example.com)`\n-# Button label must be 34 characters or less.',
		})

		interaction.channel
			?.awaitMessages({
				filter: (m) => m.author.id === interaction.user.id,
				max: 1,
				time: 60000, // 1 minute
				errors: ['time'],
			})
			.then(async (collected) => {
				const msg = collected.first()

				if (msg) {
					// check and seperate regex here
					const regex = /^(.*?)\s*\[([^\]]{1,34})\]\((https?:\/\/[^\s]+)\)$/
					const match = msg.content.match(regex)

					if (!match) {
						interaction.editReply({
							content: 'Invalid input. Please ensure you follow the format.',
						})
						return
					}

					const label = match[1].trim()
					const buttonLabel = match[2].trim()
					const link = match[3].trim()

					this.displayContainer.addSectionComponents(
						new SectionBuilder()
							.addTextDisplayComponents(
								new TextDisplayBuilder({
									content: label,
								}),
							)
							.setButtonAccessory(
								new ButtonBuilder({
									label: buttonLabel,
									style: ButtonStyle.Link,
									url: link,
								}),
							),
					)

					reply.delete().catch(() => {})
					msg.delete().catch(() => {})

					this.updatePreview()
				}
			})
	}

	//

	@ButtonComponent({ id: 'delete_last' })
	async deleteLast(interaction: ButtonInteraction) {
		if (!this.displayContainer) return
		if (!interaction.isRepliable()) return

		interaction.deferUpdate()

		if (!this.started) {
			let gotReset: boolean = false

			this.displayContainer.spliceComponents(-1, 1)

			if (this.displayContainer.components.length === 0) {
				this.displayContainer.addTextDisplayComponents(
					new TextDisplayBuilder({
						content: '-# There is currently nothing in this shout. Use the buttons below to add components to the message!',
					}),
				)

				gotReset = true
			}

			this.updatePreview()

			if (gotReset) {
				this.started = true // UGLY fix
			}
		}
	}

	@ButtonComponent({ id: 'cancel' })
	async cancel(interaction: ButtonInteraction) {
		if (this.ongoingMessage && this.displayContainer) {
			this.ongoingMessage.edit({
				flags: [MessageFlags.IsComponentsV2],
				components: [
					new TextDisplayBuilder({
						content: 'Cancelled operation.',
					}),
				],
			})

			this.ongoingMessage = null
			this.displayContainer = null
			this.started = false
		}
	}

	@SelectMenuComponent({ id: 'send_to_channel' })
	async sendToChannel(interaction: SelectMenuInteraction) {
		if (!this.displayContainer) return
		if (!interaction.isRepliable()) return

		const channel = interaction.guild?.channels.cache.get(interaction.values[0])

		if (!channel || !channel.isTextBased()) {
			interaction.reply({
				content: 'Invalid channel selected. Please try again.',
				flags: [MessageFlags.Ephemeral],
			})
			return
		}

		if (!interaction.guild?.members.me?.permissionsIn(channel).has(['ViewChannel', 'SendMessages', 'EmbedLinks', 'AttachFiles'])) {
			interaction.reply(`I don't have permission to speak in that channel :(`)
			return
		}

		channel.send({
			flags: [MessageFlags.IsComponentsV2],
			components: [this.displayContainer],
		})

		this.ongoingMessage.edit({
			flags: [MessageFlags.IsComponentsV2],
			components: [
				new TextDisplayBuilder({
					content: 'Successfully sent the shout to #' + channel.name,
				}),
				this.displayContainer,
			],
		})

		this.ongoingMessage = null
		this.displayContainer = null
		this.started = false
	}
}
