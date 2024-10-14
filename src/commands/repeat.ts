import type { Attachment, CommandInteraction, Message, TextChannel } from 'discord.js'
import { ApplicationCommandOptionType, EmbedBuilder, PermissionFlagsBits } from 'discord.js'
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
		image: Attachment,
		interaction: CommandInteraction,
	): Promise<void> {
		const channel = interaction.options.get('channel')?.channel as TextChannel

		if (channel.isTextBased() && interaction.channel) {
			if (channel.guild.members.me?.permissionsIn(channel).has(PermissionFlagsBits.SendMessages)) {
				interaction.reply({
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
					.then((messageResponse) => {
						if (messageResponse.first()) {
							const content = messageResponse.first()?.content
							if (content) {
								if (messageResponse.first()?.attachments.first()) {
									channel.send({ content: content, files: [messageResponse.first()?.attachments.first() as Attachment] })
								} else {
									channel.send({ content: content })
								}

								messageResponse.first()?.delete()
							} else if (messageResponse.first()?.attachments.first()) {
								channel.send({ files: [messageResponse.first()?.attachments.first() as Attachment] })
                                                messageResponse.first()?.delete()
							} else {
								interaction.followUp({ content: 'Error whilst sending command', ephemeral: true })
							}
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
