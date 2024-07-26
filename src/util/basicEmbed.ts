import { ColorResolvable, EmbedBuilder } from 'discord.js'

function emoji(status: 'ALERT' | 'WARNING' | 'GOOD'): { emoji: string; color: ColorResolvable } {
	switch (status) {
		case 'ALERT':
			return {
				emoji: '<:alert:1255679013158916177>',
				color: '#250606',
			}
		case 'WARNING':
			return {
				emoji: '<:warning:1204923305895665705>',
				color: '#403200',
			}
		case 'GOOD':
			return {
				emoji: '<:good:1256020727111614586>',
				color: '#14391d',
			}
	}
}

export default function (status: 'ALERT' | 'WARNING' | 'GOOD', msg: string): EmbedBuilder {
	const brand = emoji(status)

	return new EmbedBuilder().setDescription(brand.emoji + '_ _ ' + msg).setColor(brand.color)
}
