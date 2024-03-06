import type { ButtonInteraction, CommandInteraction, Interaction, Message, MessageActionRowComponentBuilder, TextChannel } from "discord.js"
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js"
import { ButtonComponent, Discord, Slash } from "discordx"

const timeEachQuestion = 216000_000 // 1 hour

@Discord()
export class AnnounceCommand {
    private embed: EmbedBuilder | undefined
    private channel: TextChannel | undefined

    @Slash({
        name: "shout",
        description: "Announce a message to a channel.",
        dmPermission: false,
        defaultMemberPermissions: ["Administrator"],
    })
    async announce(interaction: CommandInteraction) {
        this.embed = new EmbedBuilder()
        this.embed.setColor("#2b2d31")

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setDescription(`Please mention a channel to send the announcement to.`)
                    .setFooter({ text: `You must mention/tag a channel!` }),
            ],
        })
        .then(() => {
            // Channel
            interaction.channel?.awaitMessages({
                filter: (response: Message<boolean>) => {
                    return response.author.id === interaction.user.id
                },
                max: 1,
                time: timeEachQuestion,
                errors: ['time']
            }).then(channelResponse => {
                const channelCheck: TextChannel | undefined = channelResponse.first()?.mentions.channels.first() as TextChannel
                if (!channelCheck) return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(`Cancelled, no channel was mentioned.`),
                    ],
                });
                this.channel = channelCheck
                // Title
                interaction.followUp({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(`What would you like the title to be?`)
                            .setFooter({ text: `Enter skip to skip this input.` }),
                    ],
                })
                interaction.channel?.awaitMessages({
                    filter: (response: Message<boolean>) => {
                        return response.author.id === interaction.user.id;
                    },
                    max: 1,
                    time: timeEachQuestion,
                    errors: ['time']
                }).then(titleResponse => {
                    const title = titleResponse.first()?.content;
                    if (title !== "skip") {
                        this.embed?.setTitle(titleResponse.first()?.content ?? "")
                    }
                    // Description
                    interaction.followUp({
                        embeds: [
                            new EmbedBuilder()
                                .setDescription(`What would you like the description to be?`),
                        ],
                    })
                    interaction.channel?.awaitMessages({
                        filter: (response: Message<boolean>) => {
                            return response.author.id === interaction.user.id;
                        },
                        max: 1,
                        time: timeEachQuestion,
                        errors: ['time']
                    }).then(descriptionResponse => {
                        this.embed?.setDescription(descriptionResponse.first()?.content ?? "")
                        // Image
                        interaction.followUp({
                            embeds: [
                                new EmbedBuilder()
                                    .setDescription(`Please send an image to be included in the announcement.`)
                                    .setFooter({ text: `Enter skip to skip this input.` }),
                            ],
                        })
                        interaction.channel?.awaitMessages({
                            filter: (response: Message<boolean>) => {
                                return response.author.id === interaction.user.id;
                            },
                            max: 1,
                            time: timeEachQuestion,
                            errors: ['time']
                        }).then(imageResponse => {
                            const imageUrl = imageResponse.first()?.attachments.first()?.url;
                            if (imageUrl) {
                                console.log(`Image URL: ${imageUrl}`)
                                this.embed?.setImage(imageUrl);
                            }
                            // Tag Type
                            if (this.embed) {
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
                            }
                        }).catch(() => {
                            interaction.followUp({ embeds: [
                                new EmbedBuilder()
                                    .setDescription(`Invalid response, cancelled.`),
                            ]})
                        })
                    }).catch(() => {
                        interaction.followUp({ embeds: [
                            new EmbedBuilder()
                                .setDescription(`Invalid response, cancelled.`),
                        ]})
                    })
                }).catch(() => {
                    interaction.followUp({ embeds: [
                        new EmbedBuilder()
                            .setDescription(`Invalid response, cancelled.`),
                    ]})
                })
            }).catch(() => {
                interaction.followUp({ embeds: [
                    new EmbedBuilder()
                        .setDescription(`Invalid response, cancelled.`),
                ]})
            })
        }).catch(() => {
            interaction.followUp({ embeds: [
                new EmbedBuilder()
                    .setDescription(`Invalid response, cancelled.`),
            ]})
        })
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