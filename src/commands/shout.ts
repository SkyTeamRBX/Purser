import type { ButtonInteraction, ColorResolvable, CommandInteraction, MessageActionRowComponentBuilder, TextChannel } from "discord.js"
import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js"
import { Bot, ButtonComponent, Discord, Slash, SlashOption } from "discordx"

import { textChannelQuestion, stringQuestion, imageQuestion } from "../util/messageCollection.js"

const timeEachQuestion = 216000_000 // 1 hour

@Discord()
@Bot()
export class AnnounceCommand {
    private embed: EmbedBuilder | undefined
    private channel: TextChannel | undefined

    @Slash({
        name: "shout",
        description: "Announce a message to a channel.",
        dmPermission: false,
        defaultMemberPermissions: ["Administrator"],
    })
    async announce(
        @SlashOption({
            description: "hex color code for the embed",
            name: "color",
            required: false,
            type: ApplicationCommandOptionType.String
        })
        color: string | undefined,
        interaction: CommandInteraction
    ) {
        try {
            function isValidHexColor(hex: string): string | null {
                const hexColorPattern = /^[0-9A-Fa-f]{6}$/
    
                const colorCode = String(hex).replace('/^#/', '')
    
                if (hexColorPattern.test(colorCode)) {
                    const finalColorCode = hex.startsWith('#') ? hex : `#${colorCode}`;
                    return finalColorCode;
                } else {
                    return null;
                }
            }
    
            this.embed = new EmbedBuilder()
    
            if (color && isValidHexColor(color)) {
                this.embed.setColor(isValidHexColor(color) as ColorResolvable)
            } else {
                this.embed.setColor("#2b2d31")
            }

            this.channel = await textChannelQuestion(
                interaction, 
                'What channel would you like to send this message to?', 
                timeEachQuestion,
                'You must mention/tag a channel!'
            )
    
            let title = await stringQuestion(
                interaction,
                'What is the title of the announcement?',
                true,
                timeEachQuestion
            )
    
            let description = await stringQuestion(
                interaction,
                'What is the description of the announcement?',
                false,
                timeEachQuestion
            )

            let image = await imageQuestion(
                interaction,
                'What is the image for the announcement?',
                true,
                timeEachQuestion
            )

            let thumbnail = await imageQuestion(
                interaction,
                'What is the thumbnail for the announcement?',
                true,
                timeEachQuestion
            )
    
            let footer = await stringQuestion(
                interaction,
                'What is the footer of the announcement?',
                true,
                timeEachQuestion,
                "Tip: You can type 'me' to use your avatar and username as the footer."
            )

            if (title) {
                this.embed.setTitle(title)
            }

            if (description) {
                this.embed.setDescription(description)
            }

            if (image) {
                this.embed.setImage(image)
            }

            if (thumbnail) {
                this.embed.setThumbnail(thumbnail)
            }
            
            if (footer) {
                if (footer.toLowerCase() === 'me') {
                    this.embed.setFooter({
                        text: `${interaction.user.username}`,
                        iconURL: interaction.user.displayAvatarURL()
                    })
                } else {
                    this.embed.setFooter({ text: footer })
                }
            }
    
            interaction.followUp({
                content: `Heres a preview of your announcement:`,
                embeds: [
                    this.embed
                ],
                components: [
                    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
                        new ButtonBuilder()
                            .setLabel("@everyone")
                            .setStyle(ButtonStyle.Secondary)
                            .setCustomId("everyone"),
                        new ButtonBuilder()
                            .setLabel("@here")
                            .setStyle(ButtonStyle.Secondary)
                            .setCustomId("here"),
                        new ButtonBuilder()
                            .setLabel("None")
                            .setStyle(ButtonStyle.Secondary)
                            .setCustomId("none"),
                        new ButtonBuilder()
                            .setLabel("Cancel")
                            .setStyle(ButtonStyle.Danger)
                            .setCustomId("cancel"),
                    )
                ]
            });
        } catch (error) {
            // Unhandled
        }
    }

    @ButtonComponent({ id: "everyone" })
    everyone_handler(interaction: ButtonInteraction): void {
        interaction.message.edit({ content: `Announced to ${this.channel?.url}!`, components: [] })
        if (this.embed) {
            this.channel?.send({ content: `@everyone`, embeds: [this.embed] })
            return;
        }
    }

    @ButtonComponent({ id: "here" })
    here_handler(interaction: ButtonInteraction): void {
        interaction.message.edit({ content: `Announced to ${this.channel?.url}!`, components: [] })
        if (this.embed) {
            this.channel?.send({ content: `@here`, embeds: [this.embed] })
            return;
        }
    }

    @ButtonComponent({ id: "none" })
    none_handler(interaction: ButtonInteraction): void {
        interaction.message.edit({ content: `Announced to ${this.channel?.url}!`, components: [] })
        if (this.embed) {
            this.channel?.send({ embeds: [this.embed] })
            return;
        }
    }

    @ButtonComponent({ id: "cancel" })
    handler(interaction: ButtonInteraction): void {
        interaction.message.edit({ content: `Cancelled`, components: [], embeds: []})
    }
}