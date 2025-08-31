import type { ColorResolvable, CommandInteraction } from 'discord.js'
import { ApplicationCommandOptionType, ButtonStyle, EmbedBuilder } from 'discord.js'
import { Discord, Slash, SlashOption } from 'discordx'

import { textChannelQuestion, stringQuestion, attachmentQuestion, optionQuestion } from '../util/messageCollection.js'
import { basicEmbed } from '../util/basicEmbed.js'

@Discord()
export class EmbedCommand {
	@Slash({
		name: 'embed',
		description: 'Embed a message to a channel.',
		dmPermission: false,
		defaultMemberPermissions: ['Administrator'],
	})
	async execute(
		@SlashOption({
			description: 'hex color code for the embed',
			name: 'color',
			required: false,
			type: ApplicationCommandOptionType.String,
		})
		color: ColorResolvable | undefined,
		interaction: CommandInteraction,
	) {
		if (!interaction.isRepliable()) return;

		try {
			const embed = new EmbedBuilder()

			if (color) {
				if (color.toString()[0] !== '#') {
					embed.setColor(`#${color.toString()}`)
				} else {
					embed.setColor(color)
				}
			} else {
				embed.setColor('#2b2d31')
			}

			const channel = await textChannelQuestion({
				interaction,
				question: 'What channel would you like to send this message to?'
			})

			const title = await stringQuestion({
				interaction,
				question: 'What is the title of the announcement?',
				skippable: true
			})

			if (title.response) embed.setTitle(title.response)

			const description = await stringQuestion({
				interaction,
				question: 'What is the description of the announcement?',
			})

			embed.setDescription(description.response)

			const image = await attachmentQuestion({
				interaction,
				question: 'What is the image for the announcement?',
				skippable: true
			})

			if (image.response) embed.setImage(image.response?.url)

			const footer = await stringQuestion({
				interaction,
				question: 'What is the footer of the announcement?',
				skippable: true
			})

			if (footer.response === 'me' && interaction.user.avatar) {
				embed.setFooter({ text: interaction.user.username, iconURL: interaction.user.avatarURL() || undefined })
			} else if (footer.response) {
				embed.setFooter({ text: footer.response })
			}

			optionQuestion({
				interaction,
				question: 'Heres a preview of your announcement:',
				extra_embeds: [embed]
			}, [
				{
					id: 'everyone',
					option: '@everyone',
					style: ButtonStyle.Secondary
				},
				{
					id: 'here',
					option: '@here',
					style: ButtonStyle.Secondary
				},
				{
					id: 'none',
					option: 'None',
					style: ButtonStyle.Secondary
				},
				{
					id: 'cancel',
					option: 'Cancel',
					style: ButtonStyle.Danger
				}
			]).then((value) => {
				if (!value.response || value.response === 'cancel') {
					value.originalMessage.edit({
						content: 'Cancelled.',
						embeds: [embed],
						components: []
					})
					return;
				}

				let content: string = ''

				channel.response?.send({
					content: (value.response !== 'none' && `@${value.response}`) || undefined,
					embeds: [embed]
				})

				value.originalMessage.edit({
					content: 'Sent!',
					embeds: [embed],
					components: []
				})

				return;


			})
		} catch(err) {
			interaction.followUp({
				embeds: [basicEmbed('ALERT', "Something went wrong! Please try again.")]
			})

			console.warn(err);
		}
	}
}
