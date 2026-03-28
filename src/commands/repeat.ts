import type { APIMessageTopLevelComponent, CommandInteraction, ComponentBuilder, Message, TextChannel } from 'discord.js'
import { ApplicationCommandOptionType, AttachmentBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, MessageFlags, PermissionFlagsBits, SectionBuilder, TextDisplayBuilder } from 'discord.js'
import { Discord, Slash, SlashOption, Guild } from 'discordx'

@Discord()
export class RepeatCommand {
	@Slash({
		name: 'repeat',
		description: 'Repeat your message in another channel.',
		dmPermission: false,
		defaultMemberPermissions: ['Administrator'],
	})
	async choose(
		@SlashOption({
			description: 'Channel',
			name: 'channel',
			required: true,
			type: ApplicationCommandOptionType.Channel,
		})
		channel: TextChannel,
		interaction: CommandInteraction,
	): Promise<void> {
		// const channel = interaction.options.get('channel')?.channel as TextChannel

		if (channel.isTextBased() && interaction.channel) {
			if (channel.guild.members.me?.permissionsIn(channel).has(PermissionFlagsBits.SendMessages)) {
				const reply = await interaction.reply({
					embeds: [new EmbedBuilder().setDescription(`What would you like the message to be?`)],
					ephemeral: true,
				})

				interaction.channel
					.awaitMessages({
						filter: (response: Message<boolean>) => {
							return response.author.id === interaction.user.id
						},
						max: 1,
						time: 60_000,
						errors: ['time'],
					})
					.then(async (messageResponse) => {
						const msg = messageResponse.first()
						if (!msg) return

						const content = msg.content
						const attachments = [...msg.attachments.values()]
						if (!content && attachments.length === 0) {
							interaction.followUp({ content: 'Error whilst sending command', ephemeral: true })
							return
						}

						try {
							let components = []
							if (content) {
								components.push(new TextDisplayBuilder({ content }))
							}

							const uploadFiles: AttachmentBuilder[] = []
							if (attachments.length > 0) {
								const gallery = new MediaGalleryBuilder()
								for (let i = 0; i < attachments.length; i++) {
									const att = attachments[i]!
									const res = await fetch(att.url)
									if (!res.ok) {
										interaction.followUp({ content: 'Error whilst sending command', ephemeral: true })
										return
									}
									const buffer = Buffer.from(await res.arrayBuffer())
									const safeBase = (att.name ?? 'file').replace(/[^\w.\-]/g, '_') || `file-${i}`
									const fileName = `${i}-${safeBase}`
									uploadFiles.push(new AttachmentBuilder(buffer, { name: fileName }))
									gallery.addItems(
										new MediaGalleryItemBuilder({
											media: { url: `attachment://${fileName}` },
										}),
									)
								}
								components.push(gallery)
							}

							await channel.send({
								flags: [MessageFlags.IsComponentsV2],
								...(uploadFiles.length > 0 ? { files: uploadFiles } : {}),
								components,
							})

							msg.delete().catch(() => {})
						} catch {
							interaction.followUp({ content: 'Error whilst sending command', ephemeral: true })
						}
					})
					.catch((error) => {
						interaction.followUp({ content: 'Error whilst sending command', ephemeral: true })
						throw error(error)
					})
			} else {
				interaction.reply({ content: "I don't have permission to send messages in that channel", ephemeral: true })
			}
		} else {
			interaction.reply({ content: 'That channel is not a text channel', ephemeral: true })
		}
	}
}
